// The world's longer memory, for the director. Recall: older facts and
// finished storylines about whatever the next beat is likely to be about,
// however old. Coming due: promises, bets and deadlines whose time has come.
// Matching is plain code (handles, topic tags, shared distinctive words); no
// model call. Reads only, except noteDue(), which tick.ts calls after a beat.
import { FIGURES, ORGS, OUTLETS } from "../cast";
import { db, userHandle } from "../db";
import type { DigestStoryline, WorldDigest } from "../types";
import { parseJsonList } from "./digest";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Caps, so memory adds a few hundred tokens to the director's message at most. */
const MAX_FACTS = 5;
const MAX_STORIES = 3;
const MAX_DUE = 3;
/** How far back a due date is still news, and how many listings settle it. */
const DUE_WINDOW = 3 * DAY;
const DUE_SETTLED = 3;

// ------------------------------------------------------------- matching

const STOP = new Set(
  ("the and but for with from that this these those than then them they their there what when where which while who whom whose why how " +
    "will would could should can may might must shall have has had been being were was are its it's into onto over under about after before " +
    "again also just only even more most much many some such very said says told tells news report reports reported week weeks " +
    "today yesterday tomorrow days year years month months time first last next three amid against during since until " +
    "people other others back still make makes made take takes took gets got going goes went come comes came").split(" "),
);

/** The words that carry a text's meaning: lowercased, four letters or more, no handles. */
function keyWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/@\w+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

// Outlets cover every story, so sharing one says nothing about the subject;
// nor does Brok or the reader, who is never the subject of a story.
const OUTLET_HANDLES = new Set(OUTLETS.map((o) => o.handle.toLowerCase()));
const notSubject = (h: string, user: string | null) => OUTLET_HANDLES.has(h) || h === "brok" || h === user;

let namePatterns: { handle: string; re: RegExp }[] | null = null;

/** Famous and official accounts a text names: full name, a figure's surname, or the handle. */
function named(text: string): string[] {
  namePatterns ??= [...FIGURES, ...ORGS].flatMap((c) => {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const forms = [c.name.replace(/^the\s+/i, ""), c.handle];
    const last = c.name.split(" ").pop()!;
    if (c.kind === "figure" && last.length > 4) forms.push(last);
    return forms.map((f) => ({ handle: c.handle.toLowerCase(), re: new RegExp(`(?<![\\p{L}\\p{N}_])@?${esc(f)}(?![\\p{L}\\p{N}_])`, "iu") }));
  });
  const out = new Set<string>();
  for (const p of namePatterns) if (p.re.test(text)) out.add(p.handle);
  return [...out];
}

/** What this beat is likely to be about, from one source. Weight 2 for the
 *  headlines, the reader's post and any steering; 1 for an open storyline. */
interface Cue {
  handles: Set<string>;
  topics: Set<string>;
  words: Set<string>;
  weight: number;
}

function cue(text: string, handles: string[], topics: string[], weight: number, user: string | null): Cue {
  const hs = new Set([...handles, ...named(text)].map((h) => h.toLowerCase()).filter((h) => !notSubject(h, user)));
  return { handles: hs, topics: new Set(topics.map((t) => t.toLowerCase())), words: keyWords(text), weight };
}

/** Something the world remembers, reduced to what matching needs. */
interface Memory {
  handles: string[];
  topics: string[];
  words: Set<string>;
}

/** How strongly a memory matches the cues. A shared account counts most; a
 *  topic tag only with a word in common; words alone need two. Below 3 is no match. */
function score(m: Memory, cues: Cue[], distinctive: (w: string) => boolean): number {
  let total = 0;
  for (const c of cues) {
    const h = m.handles.filter((x) => c.handles.has(x.toLowerCase())).length;
    const tp = m.topics.some((x) => c.topics.has(x.toLowerCase()));
    let w = 0;
    for (const x of m.words) if (c.words.has(x) && distinctive(x)) w++;
    total += c.weight * (3 * h + (tp && w >= 1 ? 2 : 0) + (w >= 2 ? w : 0));
  }
  return total;
}

// ---------------------------------------------------------------- recall

interface StoryRow {
  id: number;
  title: string;
  summary: string;
  topics: string;
  participants: string;
  status: string;
  beats: number;
  updated_at: number;
}

export interface RecallInput {
  t: number;
  open: DigestStoryline[];
  headlines: WorldDigest["headlines"];
  /** user_post mode: the reader's post. */
  focusPostId: number | null;
  seed: string | null;
  steerId: number | null;
  /** Texts already in the ledger, so nothing is listed twice. */
  shown: Set<string>;
}

/** Older facts and dormant storylines that match what this beat is likely to be about. */
export function recall(input: RecallInput): { facts: WorldDigest["facts"]; earlierStories: WorldDigest["earlierStories"] } {
  const conn = db();
  const { t } = input;
  const stories = conn
    .prepare("SELECT id, title, summary, topics, participants, status, beats, updated_at FROM storylines")
    .all() as unknown as StoryRow[];
  const byId = new Map(stories.map((s) => [s.id, s]));
  const user = userHandle()?.toLowerCase() ?? null;

  const cues: Cue[] = [];
  const add = (text: string, handles: string[], topics: string[], weight: number) =>
    cues.push(cue(text, handles, topics, weight, user));
  for (const h of input.headlines) add(h.title, [], [], 2);
  if (input.focusPostId != null) {
    const post = conn.prepare("SELECT text, reply_to FROM posts WHERE id = ?").get(input.focusPostId) as
      | { text: string; reply_to: number | null } | undefined;
    const parent = post?.reply_to != null
      ? (conn.prepare("SELECT author, text FROM posts WHERE id = ?").get(post.reply_to) as { author: string; text: string } | undefined)
      : undefined;
    if (post) add(`${post.text}\n${parent?.text ?? ""}`, parent ? [parent.author] : [], [], 2);
  }
  if (input.seed) add(input.seed, [], [], 2);
  const steered = input.steerId != null ? byId.get(input.steerId) : undefined;
  if (steered) {
    add(`${steered.title}\n${steered.summary}`, parseJsonList(steered.participants), parseJsonList(steered.topics), 2);
  }
  for (const s of input.open) {
    add(`${s.title}\n${s.summary}`, s.participants, parseJsonList(byId.get(s.id)?.topics), 1);
  }
  if (!cues.length) return { facts: [], earlierStories: [] };

  const factRows = conn
    .prepare("SELECT text, subjects, storyline_id, created_at FROM facts ORDER BY id DESC LIMIT 5000")
    .all() as { text: string; subjects: string; storyline_id: number | null; created_at: number }[];
  const dormant = stories.filter((s) => s.status === "dormant" && s.beats > 0 && s.id !== input.steerId);

  const facts = factRows
    .filter((f) => !input.shown.has(f.text))
    .map((f) => ({
      f,
      m: {
        handles: parseJsonList(f.subjects),
        topics: f.storyline_id != null ? parseJsonList(byId.get(f.storyline_id)?.topics) : [],
        words: keyWords(f.text),
      },
    }));
  const olds = dormant.map((s) => ({
    s,
    m: { handles: parseJsonList(s.participants), topics: parseJsonList(s.topics), words: keyWords(`${s.title}\n${s.summary}`) },
  }));

  // A word is distinctive when few memories use it: "album" may be, "announced" is not.
  const df = new Map<string, number>();
  for (const { m } of [...facts, ...olds]) for (const w of m.words) df.set(w, (df.get(w) ?? 0) + 1);
  const limit = Math.max(3, Math.round(0.05 * (facts.length + olds.length)));
  const distinctive = (w: string) => (df.get(w) ?? 0) <= limit;

  const best = <T extends { m: Memory }>(xs: T[], at: (x: T) => number, n: number) =>
    xs
      .map((x) => ({ x, score: score(x.m, cues, distinctive) }))
      .filter((r) => r.score >= 3)
      .sort((a, b) => b.score - a.score || at(b.x) - at(a.x))
      .slice(0, n)
      .map((r) => r.x);

  return {
    facts: best(facts, (x) => x.f.created_at, MAX_FACTS)
      .sort((a, b) => b.f.created_at - a.f.created_at)
      .map(({ f }) => ({ text: f.text, daysAgo: Math.floor(Math.max(0, t - f.created_at) / DAY) })),
    earlierStories: best(olds, (x) => x.s.updated_at, MAX_STORIES).map(({ s }) => ({
      title: s.title,
      summary: s.summary.length > 180 ? `${s.summary.slice(0, 180).trimEnd()}…` : s.summary,
      beats: s.beats,
      daysSinceEnd: Math.floor(Math.max(0, t - s.updated_at) / DAY),
    })),
  };
}

// ------------------------------------------------------------ coming due

/** Facts whose due time arrived in the last few days and that are not yet settled, longest overdue first. */
export function comingDue(t: number): WorldDigest["comingDue"] {
  const rows = db()
    .prepare(
      `SELECT id, text, subjects, due_at, created_at FROM facts
       WHERE due_at IS NOT NULL AND due_at <= ? AND due_at > ? AND due_shown < ${DUE_SETTLED}
       ORDER BY due_at ASC, id ASC LIMIT ${MAX_DUE}`,
    )
    .all(t, t - DUE_WINDOW) as { id: number; text: string; subjects: string; due_at: number; created_at: number }[];
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    subjects: parseJsonList(r.subjects),
    hoursSinceDue: Math.floor(Math.max(0, t - r.due_at) / HOUR),
    daysAgo: Math.floor(Math.max(0, t - r.created_at) / DAY),
  }));
}

/** After a beat: count a listing for each fact the director was shown as due,
 *  and settle any shown fact on the storyline this beat was written on. */
export function noteDue(listed: number[], storylineId: number): void {
  const conn = db();
  const bump = conn.prepare(`UPDATE facts SET due_shown = MIN(${DUE_SETTLED}, due_shown + 1) WHERE id = ?`);
  for (const id of listed) bump.run(id);
  conn
    .prepare(`UPDATE facts SET due_shown = ${DUE_SETTLED} WHERE storyline_id = ? AND due_at IS NOT NULL AND due_shown >= 1`)
    .run(storylineId);
}
