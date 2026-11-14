// One tick: digest, director call, apply the beat, crowd call, apply the crowd,
// housekeeping. Model calls run outside any transaction; each result is
// applied in a single tx() so readers never see half a beat.
import { db, kvGet, kvSet, now, tx, type PostRow } from "../db";
import { generate } from "../llm";
import { markHeadlineUsed } from "../news";
import { decayPrefs } from "../prefs";
import { crowdSystem, crowdUser, directorSystem, directorUser, type CrowdInput } from "../prompts";
import { CrowdSchema, DirectorSchema, type DirectorOutput } from "../schemas";
import { noiseTick, scheduleMoves } from "../stocks";
import type { WorldDigest } from "../types";
import { applyBeat, applyCrowd, type BeatResult, type Mode, type Window } from "./apply";
import { buildDigest, digestPost } from "./digest";

const SECOND = 1000;
const HOUR = 3_600_000;

/** Real and simulated length of a tick (TICK_SECONDS, default 40). */
export const TICK_MS = Math.max(5, Number(process.env.TICK_SECONDS) || 40) * SECOND;

export interface TickOptions {
  mode: Mode;
  /** user_post mode: the user's post to react to. */
  focusPostId?: number | null;
  /** bootstrap mode: the window ends this many hours before now. */
  hoursBack?: number;
}

function safely(what: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[sim] ${what} failed:`, err);
  }
}

/** Computed after the director call returns, so the window starts at the real "now". */
function beatWindow(opts: TickOptions): Window {
  const t = now();
  if (opts.mode === "bootstrap") {
    const end = t - (opts.hoursBack ?? 0) * HOUR;
    return { start: end - HOUR, end };
  }
  const lead = opts.mode === "user_post" ? 3 + Math.random() * 5 : 1;
  const start = t + Math.round(lead * SECOND);
  return { start, end: start + TICK_MS };
}

/** The last 40% of the window. Outside bootstrap it never starts in the past,
 *  so pollers asking for posts newer than what they have still see them. */
function crowdWindow(mode: Mode, w: Window): Window {
  const len = w.end - w.start;
  const start = w.start + 0.6 * len;
  if (mode === "bootstrap") return { start, end: w.end };
  const s = Math.max(start, now() + 2 * SECOND);
  return { start: s, end: s + 0.4 * len };
}

async function runCrowd(
  opts: TickOptions,
  digest: WorldDigest,
  out: DirectorOutput,
  beat: BeatResult,
  window: Window,
  focusPostId: number | null,
): Promise<string | null> {
  const posts = beat.posts.map((p) =>
    digestPost({ id: p.id, author: p.author, text: p.text, reply_to: p.replyTo, created_at: p.createdAt }),
  );
  let userPostRef: string | null = null;
  if (focusPostId != null) {
    const row = db()
      .prepare("SELECT id, author, text, reply_to, created_at FROM posts WHERE id = ?")
      .get(focusPostId) as Pick<PostRow, "id" | "author" | "text" | "reply_to" | "created_at"> | undefined;
    if (row) {
      posts.unshift(digestPost(row));
      userPostRef = `p${row.id}`;
    }
  }
  const input: CrowdInput = {
    beat: {
      kind: out.beat.kind,
      title: out.beat.title,
      summary: out.beat.summary,
      domain: beat.meta.domain,
      tone: beat.meta.tone,
    },
    brief: out.crowd_brief,
    posts,
    user: digest.user ? { handle: digest.user.handle, name: digest.user.name } : null,
    userPostRef,
    taste: digest.taste,
    count: opts.mode === "bootstrap" ? 6 : 8,
  };
  try {
    const crowd = await generate({ role: "crowd", system: crowdSystem(), user: crowdUser(input), schema: CrowdSchema });
    if (!crowd) {
      console.error("[sim] crowd call returned nothing usable");
      return "The crowd model returned nothing usable; this beat has no crowd replies.";
    }
    const win = crowdWindow(opts.mode, window);
    tx(() => applyCrowd(crowd, beat.meta, win));
    return null;
  } catch (err) {
    console.error("[sim] crowd call failed:", err);
    return `The crowd call failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function housekeeping(newEvent: boolean): void {
  safely("decayPrefs", decayPrefs);
  safely("dormancy", () => {
    db()
      .prepare("UPDATE storylines SET status = 'dormant' WHERE status = 'open' AND updated_at < ?")
      .run(now() - 24 * HOUR);
  });
  safely("ticksSinceNewEvent", () => {
    const n = newEvent ? 0 : (Number(kvGet("ticks_since_new_event") ?? 0) || 0) + 1;
    kvSet("ticks_since_new_event", String(n));
  });
}

/** Run one tick. Throws when the director call fails or declines; everything
 *  after the beat is best effort. Returns a warning when the crowd part failed. */
export async function runTick(opts: TickOptions): Promise<string | null> {
  const focusPostId = opts.mode === "user_post" ? (opts.focusPostId ?? null) : null;
  try {
    const digest = buildDigest(opts.mode, focusPostId);
    const out = await generate({
      role: "director",
      system: directorSystem(),
      user: directorUser(digest),
      schema: DirectorSchema,
    });
    if (!out) throw new Error("The director model declined or returned output that did not match the schema.");

    const window = beatWindow(opts);
    const beat = tx(() => applyBeat(out, { mode: opts.mode, window, focusPostId }));

    // These call into other modules, which may manage their own transactions.
    if (beat.headlineId != null) {
      const id = beat.headlineId;
      safely("markHeadlineUsed", () => markHeadlineUsed(id));
    }
    if (beat.stockMoves.length) {
      safely("scheduleMoves", () => scheduleMoves(beat.stockMoves, beat.movesAt, beat.meta.storylineId));
    }

    const warning = await runCrowd(opts, digest, out, beat, window, focusPostId);
    housekeeping(beat.newEvent);
    return warning;
  } finally {
    safely("noiseTick", () => noiseTick(now()));
  }
}
