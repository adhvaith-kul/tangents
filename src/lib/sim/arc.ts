// Major events ("Breaking news"). One planning call invents an event that grows
// out of the record and stores it in `arcs`; from then on every ordinary beat
// carries a private ARC section (digestArc) and is counted afterwards
// (noteArcBeat), which is all that moves an event through its phases:
// murmurs, the break, fallout, resolution. The engine counts beats; it never
// asks the model whether a phase is over. One at a time, with a cooldown after
// each. The reader starts one from the story map; the world may start one on
// its own (arcIfDue). Nothing about an event reaches the browser before it
// breaks except arcMapInfo().building. Server-only.
import { db, now } from "../db";
import { generate } from "../llm";
import { arcRefs, arcSystem, arcUser } from "../prompts";
import { ArcPlanSchema, type ArcPlanOutput } from "../schemas";
import { getSettings } from "../settings";
import { SUBJECTS } from "../subjects";
import {
  ARC_SCALES, type ArcConsequence, type ArcKind, type ArcPhase, type ArcScale, type DigestArc, type Settings,
  type Subject, type WorldDigest,
} from "../types";
import { buildDigest } from "./digest";
import { tickMs } from "./pace";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The kinds each scale can produce. */
export const KINDS_BY_SCALE: Record<ArcScale, ArcKind[]> = {
  scandal: ["scandal", "business"],
  national: ["scandal", "business", "politics", "disaster"],
  global: ["business", "politics", "disaster", "world"],
};
/** Beats of murmurs before the break, and of winding down after the fallout. */
const MURMURS: Record<ArcScale, [number, number]> = { scandal: [0, 1], national: [2, 4], global: [4, 8] };
const RESOLUTION: Record<ArcScale, [number, number]> = { scandal: [1, 1], national: [1, 2], global: [2, 3] };
/** Consequences per subject the reader has on: at least, and at most. */
const PER_SUBJECT: [number, number] = [2, 3];
/** Simulated hours after one resolves before the next may start. */
const COOLDOWN_HOURS: Record<ArcScale, number> = { scandal: 2, national: 6, global: 12 };
/** How "Surprise me" and the world itself pick a scale, among those the settings allow. */
const READER_WEIGHTS: Record<ArcScale, number> = { scandal: 50, national: 35, global: 15 };
const WORLD_WEIGHTS: Record<ArcScale, number> = { scandal: 75, national: 22, global: 3 };
/** Self-started: on average one per this much simulated time while one could start. */
const SELF_START_MEAN_MS = 90 * MINUTE;
const SELF_START_MAX_CHANCE = 0.2; // per beat
/** The world must be this old, and have something this recent to grow from. */
const MIN_WORLD_AGE_MS = 4 * HOUR;
const RECENT_MS = 24 * HOUR;
/** A plan that never came back stops blocking the next one after this. */
const PLANNING_TTL_MS = 10 * MINUTE;

const PHASES: ArcPhase[] = ["murmurs", "break", "fallout", "resolution"];

interface PhaseSpec {
  happens: string;
  unsaid: string;
  beats: number;
}

/** What is stored in arcs.plan. */
export interface StoredPlan {
  event: string;
  connection: string;
  roots: string[];
  phases: Record<ArcPhase, PhaseSpec>;
  consequences: ArcConsequence[];
}

interface ArcRow {
  id: number;
  scale: ArcScale;
  kind: ArcKind;
  started_by: string;
  plan: string;
  phase: ArcPhase | "resolved";
  phase_beats: number;
  played: string;
  storyline_id: number | null;
  created_at: number;
  broke_at: number | null;
  resolved_at: number | null;
}

// A plan is being written (real ms since it began), so a second is not started meanwhile.
const g = globalThis as { __tangentsArcPlanning?: number };
const planning = () => g.__tangentsArcPlanning != null && Date.now() - g.__tangentsArcPlanning < PLANNING_TTL_MS;

// ------------------------------------------------------------ reading

/** A read of the arcs table, or `fallback` while the open database predates it
 *  (hot reload does not rerun SCHEMA; a restart creates it). */
function read<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function activeArc(): ArcRow | null {
  return read(
    () => (db().prepare("SELECT * FROM arcs WHERE phase != 'resolved' ORDER BY id DESC LIMIT 1").get() as ArcRow | undefined) ?? null,
    null,
  );
}

function coolingDown(t = now()): boolean {
  const last = read(
    () =>
      db()
        .prepare("SELECT scale, resolved_at FROM arcs WHERE phase = 'resolved' ORDER BY resolved_at DESC LIMIT 1")
        .get() as { scale: ArcScale; resolved_at: number } | undefined,
    undefined,
  );
  return !!last && t - last.resolved_at < (COOLDOWN_HOURS[last.scale] ?? 6) * HOUR;
}

function parsePlan(row: ArcRow): StoredPlan {
  return JSON.parse(row.plan) as StoredPlan;
}

function parsePlayed(row: ArcRow): Set<number> {
  try {
    const v: unknown = JSON.parse(row.played);
    return new Set(Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : []);
  } catch {
    return new Set();
  }
}

/** The kinds the settings allow for a scale. */
function kindsFor(scale: ArcScale, s: Settings): ArcKind[] {
  return KINDS_BY_SCALE[scale].filter((k) => s.majorKinds[k]);
}

/** The scales the allowed kinds can produce: what the Breaking news menu offers. */
export function allowedScales(s: Settings = getSettings()): ArcScale[] {
  return ARC_SCALES.filter((sc) => kindsFor(sc, s).length > 0);
}

function weighted(scales: ArcScale[], weights: Record<ArcScale, number>): ArcScale {
  const total = scales.reduce((sum, sc) => sum + weights[sc], 0);
  let r = Math.random() * total;
  for (const sc of scales) {
    r -= weights[sc];
    if (r < 0) return sc;
  }
  return scales[scales.length - 1];
}

/** For the story map: whether one is building (and nothing else about it), the
 *  menu's choices, and the storylines of events that have broken. */
export function arcMapInfo(): { building: boolean; scales: ArcScale[]; major: Set<number> } {
  const a = activeArc();
  const rows = read(
    () =>
      db().prepare("SELECT storyline_id FROM arcs WHERE storyline_id IS NOT NULL AND broke_at IS NOT NULL").all() as {
        storyline_id: number;
      }[],
    [],
  );
  const major = new Set(rows.map((r) => r.storyline_id));
  return { building: !!a && (a.phase === "murmurs" || a.phase === "break"), scales: allowedScales(), major };
}

// ------------------------------------------------------------ starting one

/** Checks a Breaking news request and claims the planning slot. Returns the
 *  scale to plan; throws a message for the reader when it cannot be done. */
export function claimBreaking(choice: unknown): ArcScale {
  if (choice !== "surprise" && !ARC_SCALES.includes(choice as ArcScale)) throw new Error("Pick how big.");
  if (planning()) throw new Error("Something is already coming.");
  const active = activeArc();
  if (active) {
    throw new Error(
      active.phase === "murmurs" || active.phase === "break" ? "Something is already building." : "The last major event is still playing out.",
    );
  }
  if (coolingDown()) throw new Error("The world is still taking in the last one. Try again later.");
  const scales = allowedScales();
  if (!scales.length) throw new Error("Every kind of major event is turned off in Settings.");
  if (choice !== "surprise" && !scales.includes(choice as ArcScale)) throw new Error("Your settings do not allow that kind of event.");
  g.__tangentsArcPlanning = Date.now();
  return choice === "surprise" ? weighted(scales, READER_WEIGHTS) : (choice as ArcScale);
}

/** The world is old enough and has something recent on the record to grow from. */
function worldReady(t: number): boolean {
  const conn = db();
  const first = conn.prepare("SELECT MIN(created_at) AS t FROM beats").get() as { t: number | null };
  if (first.t == null || t - first.t < MIN_WORLD_AGE_MS) return false;
  const since = t - RECENT_MS;
  return !!(
    conn.prepare("SELECT 1 FROM storylines WHERE status = 'open' OR updated_at >= ? LIMIT 1").get(since) ||
    conn.prepare("SELECT 1 FROM facts WHERE created_at >= ? LIMIT 1").get(since) ||
    conn.prepare("SELECT 1 FROM relationships WHERE updated_at >= ? AND score != 0 LIMIT 1").get(since)
  );
}

/** Before a scheduled story beat: now and then, when it makes sense, the world
 *  starts a major event on its own. Never throws. */
export async function arcIfDue(): Promise<void> {
  try {
    const s = getSettings();
    if (!s.majorSelfStart || planning() || activeArc()) return;
    const scales = allowedScales(s);
    const t = now();
    if (!scales.length || coolingDown(t) || !worldReady(t)) return;
    if (Math.random() >= Math.min(SELF_START_MAX_CHANCE, tickMs() / SELF_START_MEAN_MS)) return;
    g.__tangentsArcPlanning = Date.now();
    const warning = await startArc(weighted(scales, WORLD_WEIGHTS), "world");
    if (warning) console.error(`[arc] ${warning}`);
  } catch (err) {
    console.error("[arc] self-start failed:", err);
  }
}

/** Plan a major event and store it. The caller has claimed the planning slot;
 *  this releases it. Returns a warning when no usable plan came back. */
export async function startArc(scale: ArcScale, by: "reader" | "world"): Promise<string | null> {
  g.__tangentsArcPlanning ??= Date.now();
  try {
    if (activeArc()) return null;
    const settings = getSettings();
    const kinds = kindsFor(scale, settings);
    if (!kinds.length) return "No kind of major event the settings allow fits that scale.";
    const digest = buildDigest("normal", null);
    const subjects = SUBJECTS.filter((k) => settings[k] > 0);
    let retry: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await generate({
        role: "director",
        system: arcSystem(),
        user: arcUser({
          digest, scale, kinds, subjects, perSubject: PER_SUBJECT, murmurs: MURMURS[scale], resolution: RESOLUTION[scale],
          casualties: settings.majorCasualties, retry,
        }),
        schema: ArcPlanSchema,
      });
      if (!out) {
        retry = null;
        continue;
      }
      const plan = checkPlan(out, { scale, kinds, subjects, digest, casualties: settings.majorCasualties });
      if (typeof plan === "string") {
        console.warn(`[arc] plan refused: ${plan}`);
        retry = plan;
        continue;
      }
      if (activeArc()) return null;
      storeArc(scale, out.kind, by, plan);
      return null;
    }
    return "No major event could be planned this time.";
  } finally {
    g.__tangentsArcPlanning = undefined;
  }
}

/** Store a checked plan; it starts in murmurs, or at the break when it has none. */
export function storeArc(scale: ArcScale, kind: ArcKind, by: "reader" | "world", plan: StoredPlan): number {
  const phase: ArcPhase = plan.phases.murmurs.beats > 0 ? "murmurs" : "break";
  const res = db()
    .prepare("INSERT INTO arcs (scale, kind, started_by, plan, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(scale, kind, by, JSON.stringify(plan), phase, now());
  return Number(res.lastInsertRowid);
}

// ------------------------------------------------------------ checking a plan

// What a plan may never contain, whatever the settings: a backstop to the prompt's lines.
const VIOLENCE =
  /(?<!(?:price|trade|bidding|console|talent|streaming|culture|flame|turf|format|tariff|patent|ratings|chip|currency|subscriber|tech|pricing) )\bwars?\b(?! of words)|\bterror(?:ism|ist|ists)?\b|\b(?:bombing|bombings|car bomb|suicide bomb\w*|mass shooting|gunm[ae]n|massacre|genocide|airstrikes?|missile strikes?|hostages?)\b/i;
const CASUALTIES = /\b(?:killed|deaths?|death toll|fatalit(?:y|ies)|casualt(?:y|ies)|injured|injuries|wounded)\b/i;

const clamp = (n: unknown, [lo, hi]: [number, number]) =>
  Math.min(hi, Math.max(lo, typeof n === "number" && Number.isFinite(n) ? Math.round(n) : lo));
const text = (s: unknown, max = 600) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

interface PlanContext {
  scale: ArcScale;
  kinds: ArcKind[];
  subjects: Subject[];
  digest: WorldDigest;
  casualties: boolean;
}

/** The plan as it will be stored, or why it is refused. Repairs what is cheap
 *  to repair (numbering, beat counts, dangling links); refuses what is not. */
export function checkPlan(out: ArcPlanOutput, ctx: PlanContext): StoredPlan | string {
  if (!out.lines_kept) return "it does not keep the fixed lines";
  if (!ctx.kinds.includes(out.kind)) return `its kind (${out.kind}) is not one the message allows`;
  const event = text(out.event, 400);
  if (!event) return "it has no event";

  const byPhase = new Map(out.phases.map((p) => [p.phase, p]));
  const murmurRange = MURMURS[ctx.scale];
  for (const ph of PHASES) {
    if (ph === "murmurs" && murmurRange[0] === 0) continue;
    if (!text(byPhase.get(ph)?.happens)) return `it says nothing about the ${ph} phase`;
  }

  // Consequences: only the subjects the reader has on, renumbered in order, each
  // following from the event or from one played before it.
  const on = new Set<string>(ctx.subjects);
  const kept = [...out.consequences]
    .sort((a, b) => a.n - b.n)
    .filter((c) => on.has(c.subject) && text(c.what) && text(c.hits, 120));
  const perSubject = new Map<string, number>();
  const renumber = new Map<number, number>();
  const consequences: ArcConsequence[] = [];
  for (const c of kept) {
    const count = perSubject.get(c.subject) ?? 0;
    if (count >= PER_SUBJECT[1]) continue;
    perSubject.set(c.subject, count + 1);
    const n = consequences.length + 1;
    renumber.set(c.n, n);
    consequences.push({
      n, subject: c.subject as Subject, target: c.target, hits: text(c.hits, 120), what: text(c.what),
      from: renumber.get(c.from) ?? 0,
    });
  }
  const short = ctx.subjects.filter((s) => (perSubject.get(s) ?? 0) < PER_SUBJECT[0]);
  if (short.length) return `it has fewer than ${PER_SUBJECT[0]} consequences in ${short.join(", ")}`;

  const all = [event, out.connection, ...out.phases.flatMap((p) => [p.happens, p.unsaid]), ...consequences.map((c) => c.what)].join("\n");
  if (VIOLENCE.test(all)) return "it involves war, terror or mass violence";
  if (!ctx.casualties && CASUALTIES.test(all)) return "it reports dead or injured, which the reader's settings do not allow";

  // Roots: at least one, when the record offers any.
  const refs = arcRefs(ctx.digest);
  const ref = (r: string) => {
    const v = r.trim().replace(/^([efr])/, (m) => m.toUpperCase());
    return /^\d+$/.test(v) ? `#${v}` : v;
  };
  const roots = [...new Set(out.grows_from.map(ref))]
    .flatMap((r) => refs.get(r)?.text ?? [])
    .slice(0, 6);
  if (refs.size && !roots.length) return "it does not grow out of anything on the record (name at least one by its number)";

  const n = consequences.length;
  const spec = (ph: ArcPhase, beats: number): PhaseSpec => ({
    happens: text(byPhase.get(ph)?.happens),
    unsaid: text(byPhase.get(ph)?.unsaid),
    beats,
  });
  return {
    event,
    connection: text(out.connection, 400),
    roots,
    phases: {
      murmurs: spec("murmurs", byPhase.has("murmurs") ? clamp(byPhase.get("murmurs")!.beats, murmurRange) : murmurRange[0]),
      break: spec("break", 1),
      // One or two consequences a beat.
      fallout: spec("fallout", clamp(byPhase.get("fallout")?.beats, [Math.ceil(n / 2), Math.max(1, n)])),
      resolution: spec("resolution", clamp(byPhase.get("resolution")?.beats, RESOLUTION[ctx.scale])),
    },
    consequences,
  };
}

// ------------------------------------------------------------ on each beat

/** The ARC section's content for this beat: only on an ordinary beat (not a
 *  reaction, not one the reader steered, not bootstrap or the morning after). */
export function digestArc(
  mode: WorldDigest["mode"],
  seed: string | null,
  steer: { storylineId: number; wrap: boolean } | null,
): DigestArc | null {
  if (mode !== "normal" || seed != null || steer != null) return null;
  const row = activeArc();
  if (!row || row.phase === "resolved") return null;
  let plan: StoredPlan;
  try {
    plan = parsePlan(row);
  } catch {
    return null;
  }
  const phase = row.phase;
  const spec = plan.phases[phase];
  const played = parsePlayed(row);
  const pending = plan.consequences.filter((c) => !played.has(c.n));
  let thisBeat: number[] = [];
  if (phase === "fallout") {
    // Spread what is left evenly over the beats left, one or two a beat, each
    // only once what it follows from has been played.
    const left = Math.max(1, spec.beats - row.phase_beats);
    const k = Math.min(2, Math.max(1, Math.ceil(pending.length / left)));
    thisBeat = pending.filter((c) => c.from === 0 || played.has(c.from)).slice(0, k).map((c) => c.n);
  }
  return {
    id: row.id, scale: row.scale, kind: row.kind, event: plan.event, roots: plan.roots, connection: plan.connection,
    phase, beat: row.phase_beats + 1, beats: spec.beats, happens: spec.happens, unsaid: spec.unsaid,
    storylineId: row.storyline_id, pending, thisBeat, casualties: getSettings().majorCasualties,
  };
}

/** After a beat that carried the ARC section: count it, record the break's
 *  storyline and the consequences played, and move to the next phase when this
 *  one has had its beats. */
export function noteArcBeat(arc: DigestArc, storylineId: number): void {
  const conn = db();
  const row = conn.prepare("SELECT * FROM arcs WHERE id = ?").get(arc.id) as ArcRow | undefined;
  if (!row || row.phase !== arc.phase) return;
  const plan = parsePlan(row);
  const t = now();
  const played = parsePlayed(row);
  for (const n of arc.thisBeat) played.add(n);
  if (row.phase === "break") {
    conn.prepare("UPDATE arcs SET storyline_id = ?, broke_at = ? WHERE id = ?").run(storylineId, t, row.id);
  }
  let phase: ArcPhase | "resolved" = row.phase;
  let beats = row.phase_beats + 1;
  if (beats >= plan.phases[row.phase].beats) {
    // On to the next phase that has beats (a fallout with nothing to play has none).
    let i = PHASES.indexOf(row.phase) + 1;
    while (i < PHASES.length && plan.phases[PHASES[i]].beats <= 0) i++;
    phase = i < PHASES.length ? PHASES[i] : "resolved";
    beats = 0;
  }
  conn
    .prepare("UPDATE arcs SET phase = ?, phase_beats = ?, played = ?, resolved_at = ? WHERE id = ?")
    .run(phase, beats, JSON.stringify([...played].sort((a, b) => a - b)), phase === "resolved" ? t : null, row.id);
}
