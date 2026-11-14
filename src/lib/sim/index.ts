// The simulation engine's public surface. Everything else in src/lib/sim is private.
// OWNER: simulation engine workstream. Signatures are frozen.
//
// State lives on globalThis so it survives hot reload. A 5-second interval
// decides when to tick; scheduled ticks and restore/reset run on one promise
// chain, so they never overlap. Reactions to the user's posts run on a second
// chain alongside it, so a reply never waits for a scheduled tick to finish.
import {
  advanceClock, db, hasSnapshot, kvGet, kvSet, now, resetWorld, restoreSnapshot, saveSnapshot, userHandle,
} from "../db";
import { backend } from "../llm";
import { refreshHeadlines } from "../news";
import { ensureStockHistory, primeQuotes, startNewDay } from "../stocks";
import { PACES, type Pace, type SimAction, type SimStatus } from "../types";
import { getPace, nextScheduledKind, setPace, tickMs } from "./pace";
import { runAmbient, runThread, runTick, type TickOptions } from "./tick";

const CHECK_MS = 5_000;
const HEARTBEAT_TTL_MS = 60_000;
const HEADLINE_REFRESH_MS = 30 * 60_000;
const DAY_MS = 24 * 3_600_000;

interface SimState {
  loaded: boolean; // paused and ticks read from kv
  paused: boolean;
  running: number; // ticks in flight (a scheduled tick and a reaction can overlap)
  ticks: number;
  lastHeartbeat: number; // real ms
  lastTickStart: number; // real ms
  lastTickAt: number | null; // real ms
  lastHeadlineRefresh: number; // real ms
  error: string | null;
  queue: number[]; // user posts waiting for a reaction tick
  chain: Promise<unknown>;
  reactions: Promise<unknown>; // reaction ticks, one at a time
  threads: Promise<unknown>; // on-demand replies under posts the user opens, one at a time
  expanded: Map<number, number>; // post id -> how many times its thread was extended
  jobs: number; // queued or running on the chain
  interval: ReturnType<typeof setInterval> | null;
}

const g = globalThis as { __tangentsSim?: SimState; __tangentsSimCheck?: () => void };

function memoryDefaults() {
  return {
    loaded: false, paused: false, running: 0, ticks: 0, lastTickStart: 0, lastTickAt: null,
    lastHeadlineRefresh: 0, error: null, queue: [] as number[],
  };
}

function state(): SimState {
  g.__tangentsSim ??= {
    ...memoryDefaults(), lastHeartbeat: 0, chain: Promise.resolve(), reactions: Promise.resolve(),
    threads: Promise.resolve(), expanded: new Map(), jobs: 0, interval: null,
  };
  const s = g.__tangentsSim;
  // A state object kept across a hot reload may predate these fields.
  s.reactions ??= Promise.resolve();
  s.threads ??= Promise.resolve();
  s.expanded ??= new Map();
  if (!Number.isFinite(s.running)) s.running = 0;
  if (!s.loaded) {
    s.paused = kvGet("sim_paused") === "1";
    s.ticks = Number(kvGet("sim_ticks") ?? 0) || 0;
    s.loaded = true;
  }
  return s;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Run fn after everything already on the chain. Never rejects the chain itself. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const s = state();
  s.jobs++;
  const run = s.chain.then(fn).finally(() => {
    s.jobs--;
  });
  s.chain = run.catch(() => undefined);
  return run;
}

// ----------------------------------------------------------------- ticks

/** One story tick with status bookkeeping. Errors are caught and kept in the status. */
function tick(opts: TickOptions): Promise<boolean> {
  // A reaction must not push back the next scheduled tick.
  return job(opts.mode, () => runTick(opts), opts.mode !== "user_post");
}

/** Run one unit of generation with status bookkeeping. */
async function job(label: string, run: () => Promise<string | null>, scheduled: boolean): Promise<boolean> {
  const s = state();
  s.running++;
  if (scheduled) s.lastTickStart = Date.now();
  try {
    const warning = await run();
    s.ticks++;
    kvSet("sim_ticks", String(s.ticks));
    s.error = warning;
    return true;
  } catch (err) {
    console.error(`[sim] ${label} tick failed:`, err);
    s.error = message(err);
    return false;
  } finally {
    s.running = Math.max(0, s.running - 1);
    s.lastTickAt = Date.now();
    maybeRefreshHeadlines();
  }
}

function maybeRefreshHeadlines() {
  const s = state();
  if (Date.now() - s.lastHeadlineRefresh < HEADLINE_REFRESH_MS) return;
  s.lastHeadlineRefresh = Date.now();
  refreshHeadlines().catch((err) => console.error("[sim] refreshHeadlines failed:", err));
}

/** First run: headlines, quotes, price history, then three back-dated hours. */
async function bootstrap(): Promise<void> {
  const s = state();
  s.running++;
  s.lastTickStart = Date.now();
  try {
    s.lastHeadlineRefresh = Date.now();
    await refreshHeadlines();
    await primeQuotes();
    ensureStockHistory();
  } catch (err) {
    console.error("[sim] bootstrap setup failed:", err);
  } finally {
    s.running = Math.max(0, s.running - 1);
  }
  let ok = false;
  for (const hoursBack of [2, 1, 0]) {
    if (!userHandle()) return; // reset while bootstrapping
    if (await tick({ mode: "bootstrap", hoursBack })) ok = true;
  }
  // If every tick failed, leave the flag unset so the next check tries again.
  if (ok) kvSet("bootstrapped", "1");
}

const bootstrapped = () => kvGet("bootstrapped") === "1";

/** The next queued user post that still exists, or null. */
function nextQueued(): number | null {
  const s = state();
  const find = db().prepare("SELECT id FROM posts WHERE id = ? AND deleted = 0");
  while (s.queue.length) {
    const id = s.queue.shift()!;
    if (find.get(id)) return id;
  }
  return null;
}

/** What the loop runs: bootstrap, then queued reactions, then scheduled ticks.
 *  Conditions are re-checked here because the job may have waited on the chain. */
async function step(manual: boolean): Promise<void> {
  const s = state();
  if (!userHandle()) return;
  if (s.paused && !manual) return;
  if (!bootstrapped()) {
    await bootstrap();
    return;
  }
  const queued = nextQueued();
  if (queued != null) {
    await tick({ mode: "user_post", focusPostId: queued });
    return;
  }
  if (!manual && Date.now() - s.lastTickStart < tickMs()) return;
  // A manual tick is always a story beat; the schedule alternates per the pace.
  if (manual || nextScheduledKind() === "story") await tick({ mode: "normal" });
  else await job("ambient", runAmbient, true);
}

/** The 5-second check. Starts a step when the world should move. */
function check(): void {
  const s = state();
  try {
    if (Date.now() - s.lastHeartbeat > HEARTBEAT_TTL_MS) {
      if (s.interval) clearInterval(s.interval);
      s.interval = null;
      return;
    }
    if (s.jobs > 0 || s.paused || !userHandle()) return;
    // A failed bootstrap waits a full tick length before trying again.
    const due = (s.queue.length > 0 && bootstrapped()) || Date.now() - s.lastTickStart >= tickMs();
    if (due) void enqueue(() => step(false));
  } catch (err) {
    console.error("[sim] loop check failed:", err);
    s.error = message(err);
  }
}

// The interval calls through globalThis so a hot reload swaps in the new code.
g.__tangentsSimCheck = check;

// ---------------------------------------------------------------- public

/** Called by polling routes. Marks a browser tab as active and makes sure the
 *  loop is running; the loop stops itself after 60 seconds without a heartbeat. */
export function heartbeat(): void {
  const s = state();
  s.lastHeartbeat = Date.now();
  if (!s.interval) {
    s.interval = setInterval(() => g.__tangentsSimCheck?.(), CHECK_MS);
    s.interval.unref?.();
  }
}

export function simStatus(): SimStatus {
  const s = state();
  return {
    pace: getPace(),
    running: !s.paused,
    busy: s.running > 0,
    now: now(),
    lastTickAt: s.lastTickAt,
    ticks: s.ticks,
    backend: backend(),
    error: s.error,
    hasSnapshot: hasSnapshot(),
  };
}

function setPaused(paused: boolean) {
  const s = state();
  s.paused = paused;
  kvSet("sim_paused", paused ? "1" : "0");
}

/** Forget everything in memory that described the old world. */
function clearMemory() {
  Object.assign(state(), memoryDefaults());
  state().expanded = new Map();
}

/** Change how fast the world moves. Takes effect from the next tick. */
export function simPace(pace: Pace): SimStatus {
  if (!PACES.includes(pace)) throw new Error(`Unknown pace: ${String(pace)}`);
  setPace(pace);
  return simStatus();
}

const THREAD_TARGET = 10; // visible replies below which an opened post gets more
const THREAD_ROUNDS = 2; // times one post's thread may be extended

/** The user opened a post. If its thread is thin, write more replies under it
 *  in the background. Fire-and-forget; quiet while paused. */
export function onOpenPost(postId: number): void {
  const s = state();
  if (s.paused || !bootstrapped()) return;
  const rounds = s.expanded.get(postId) ?? 0;
  if (rounds >= THREAD_ROUNDS) return;
  const row = db()
    .prepare(
      `SELECT a.kind,
              (SELECT COUNT(*) FROM posts r WHERE r.reply_to = p.id AND r.deleted = 0) AS replies
       FROM posts p JOIN accounts a ON a.handle = p.author
       WHERE p.id = ? AND p.deleted = 0 AND p.created_at <= ?`,
    )
    .get(postId, now()) as { kind: string; replies: number } | undefined;
  // The user's own posts get their replies from the reaction tick.
  if (!row || row.kind === "user" || row.replies >= THREAD_TARGET) return;
  s.expanded.set(postId, rounds + 1);
  s.threads = s.threads
    .then(async () => {
      s.running++;
      try {
        await runThread(postId);
      } finally {
        s.running = Math.max(0, s.running - 1);
      }
    })
    .catch((err) => console.error("[sim] thread replies failed:", err));
}

/** pause | resume | tick (run one now) | skip_day | save | restore | reset */
export async function simAction(action: SimAction): Promise<SimStatus> {
  switch (action) {
    case "pause":
      setPaused(true);
      break;
    case "resume":
      setPaused(false);
      heartbeat();
      break;
    case "tick":
      await enqueue(() => step(true));
      break;
    case "skip_day":
      // The clock moves at once; the morning-after tick follows in the background.
      advanceClock(DAY_MS);
      try {
        startNewDay();
        // Open storylines survive the night instead of all going dormant at once.
        db().prepare("UPDATE storylines SET updated_at = updated_at + ? WHERE status = 'open'").run(DAY_MS);
      } catch (err) {
        console.error("[sim] starting the new day failed:", err);
      }
      if (userHandle() && bootstrapped()) void enqueue(() => tick({ mode: "next_morning" }));
      break;
    case "save":
      // Synchronous, and every tick write is one synchronous transaction, so the
      // snapshot is consistent even while a tick is waiting on a model.
      saveSnapshot();
      break;
    case "restore":
      await enqueue(async () => {
        await state().reactions;
        await state().threads;
        const paused = state().paused;
        if (!restoreSnapshot()) throw new Error("There is no saved snapshot to restore.");
        clearMemory();
        setPaused(paused); // keep the controls as the user left them, not as saved
      });
      break;
    case "reset":
      await enqueue(async () => {
        await state().reactions;
        await state().threads;
        resetWorld();
        clearMemory();
      });
      break;
    default:
      throw new Error(`Unknown action: ${String(action)}`);
  }
  return simStatus();
}

/** The user published a post or reply. Fire-and-forget: starts a reaction tick. */
export function onUserPost(postId: number): void {
  const s = state();
  if (s.paused || !bootstrapped()) {
    // Held until the world is resumed, a manual tick runs, or first-run history is done.
    if (!s.queue.includes(postId)) s.queue.push(postId);
    if (!s.paused) void enqueue(() => step(false));
    return;
  }
  s.reactions = s.reactions
    .then(() => {
      // Deleted while it waited its turn: nothing to react to.
      const live = db().prepare("SELECT 1 FROM posts WHERE id = ? AND deleted = 0").get(postId);
      return live ? tick({ mode: "user_post", focusPostId: postId }) : false;
    })
    .catch(() => undefined);
}
