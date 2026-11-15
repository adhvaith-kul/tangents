// The Arc goes to press. Once per simulated day, when the day has turned over,
// one director call writes the edition about the day just ended from what the
// world carried through it: the storylines that moved, the facts, the results
// and the market closes. The scores, markets and coming-soon boxes are copied
// from the ledgers here, not written by the model. Stored by paper.ts.
import { ARC_HANDLE, editionDate, editionWeekday, type Edition, type EditionStory } from "../arc";
import { db, kvGet, kvSet, now, tx } from "../db";
import { generate } from "../llm";
import { editionCount, hasEdition, latestEdition, storeEdition } from "../paper";
import { paperSystem, paperUser, type PaperInput } from "../prompts";
import { EditionSchema, type EditionOutput } from "../schemas";
import { getSettings } from "../settings";
import { recentResults } from "../sports";
import { recentMoves } from "../stocks";
import { SUBJECTS, SUBJECT_INFO } from "../subjects";

/** kv: the simulated date the paper last saw, "2026-11-15". */
const SEEN = "arc_day";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "2026-11-15": a simulated date, on the server's calendar like every day in the simulation. */
export function dateKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local midnight before t. */
function dayStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The day just ended, as of t: [its midnight, today's midnight). */
export function dayJustEnded(t: number): { start: number; end: number; date: string; covers: string } {
  const end = dayStart(t);
  const start = dayStart(end - 1);
  return { start, end, date: dateKey(t), covers: dateKey(start) };
}

/** True when the simulated day has turned over since the paper last looked. The
 *  first look in a world only notes the day, unless the day was skipped. */
export function editionDue(skipped = false): boolean {
  const today = dateKey(now());
  const seen = kvGet(SEEN);
  if (!seen && !skipped) kvSet(SEEN, today);
  return seen !== today && (!!seen || skipped);
}

// ---------------------------------------------------------------- the input

const CAP = { storylines: 8, beats: 4, posts: 3, facts: 15, notes: 4, results: 12, moves: 8, coming: 5 };
/** A post the paper quotes says something on its own: not "Concerning", not an emoji. */
const MIN_POST_WORDS = 8;
const words = (text: string) => text.replace(/https?:\/\/\S+/g, "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const hhmm = (t: number) => {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

interface DayBeat {
  summary: string;
  heat: number;
  created_at: number;
}

/** A storyline's beats for the paper, oldest first: how its day began, then the
 *  biggest of the rest (the latest of equals), so a busy day keeps what happened. */
function keyBeats(all: DayBeat[]): DayBeat[] {
  if (all.length <= CAP.beats) return all;
  const rest = all
    .slice(1)
    .map((b, i) => ({ b, i }))
    .sort((x, y) => y.b.heat - x.b.heat || y.i - x.i)
    .slice(0, CAP.beats - 1)
    .sort((x, y) => x.i - y.i)
    .map((x) => x.b);
  return [all[0], ...rest];
}

function storylinesOf(w: { start: number; end: number }): PaperInput["storylines"] {
  const conn = db();
  const moved = conn
    .prepare(
      `SELECT b.storyline_id AS id, MAX(b.heat) AS heat, COUNT(*) AS n FROM beats b
       WHERE b.created_at >= ? AND b.created_at < ? GROUP BY b.storyline_id ORDER BY heat DESC, n DESC LIMIT ?`,
    )
    .all(w.start, w.end, CAP.storylines) as { id: number; heat: number; n: number }[];
  const story = conn.prepare("SELECT id, title, domain, summary FROM storylines WHERE id = ?");
  const beats = conn.prepare(
    "SELECT summary, heat, created_at FROM beats WHERE storyline_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at, id",
  );
  // The reader's own posts and the paper's are left out: the reader is a bystander here.
  // Replies are too, and the short ones are dropped below: a quoted post has to stand alone.
  const posts = conn.prepare(
    `SELECT p.author, p.text FROM posts p JOIN accounts a ON a.handle = p.author
     WHERE p.storyline_id = ? AND p.created_at >= ? AND p.created_at < ? AND p.deleted = 0
       AND p.reply_to IS NULL AND a.kind != 'user' AND p.author != ?
     ORDER BY p.t_likes DESC, p.id LIMIT ?`,
  );
  return moved.flatMap((m) => {
    const s = story.get(m.id) as { id: number; title: string; domain: string; summary: string } | undefined;
    if (!s) return [];
    const day = keyBeats(beats.all(m.id, w.start, w.end) as unknown as DayBeat[]);
    return [{
      id: s.id,
      title: s.title,
      domain: SUBJECT_INFO[s.domain as keyof typeof SUBJECT_INFO]?.name ?? s.domain,
      summary: clip(s.summary, 700),
      beats: day.map((b) => ({ at: hhmm(b.created_at), summary: clip(b.summary, 240) })),
      posts: (posts.all(m.id, w.start, w.end, ARC_HANDLE, CAP.posts * 10) as { author: string; text: string }[])
        .filter((p) => words(p.text) >= MIN_POST_WORDS)
        .slice(0, CAP.posts)
        .map((p) => ({ author: p.author, text: clip(p.text.replace(/\s+/g, " "), 280) })),
    }];
  });
}

interface DayFact {
  id: number;
  text: string;
  storyline_id: number | null;
}

/** The day's facts, at most CAP.facts, oldest first: taken in turn from each of
 *  the day's storylines (biggest first, each from its first fact on), then the
 *  rest, so a storyline with a busy last hour does not crowd out the day. */
function dayFacts(all: DayFact[], storylines: number[]): DayFact[] {
  const queues = [...storylines.map((id) => all.filter((f) => f.storyline_id === id)), all.filter((f) => !storylines.includes(f.storyline_id ?? -1))];
  const picked: DayFact[] = [];
  while (picked.length < CAP.facts && queues.some((q) => q.length)) {
    for (const q of queues) {
      const f = q.shift();
      if (f && picked.length < CAP.facts) picked.push(f);
    }
  }
  return picked.sort((a, b) => a.id - b.id);
}

/** Each ticker's close on the day and its change from the day before's close. */
function closes(w: { start: number; end: number }): Edition["markets"] {
  const conn = db();
  const tickers = conn.prepare("SELECT ticker, name FROM stocks ORDER BY sort").all() as { ticker: string; name: string }[];
  const at = conn.prepare("SELECT price FROM stock_ticks WHERE ticker = ? AND t < ? ORDER BY t DESC, id DESC LIMIT 1");
  const first = conn.prepare("SELECT price FROM stock_ticks WHERE ticker = ? AND t >= ? AND t < ? ORDER BY t, id LIMIT 1");
  return tickers.flatMap((s) => {
    const close = (at.get(s.ticker, w.end) as { price: number } | undefined)?.price;
    const open = ((at.get(s.ticker, w.start) ?? first.get(s.ticker, w.start, w.end)) as { price: number } | undefined)?.price;
    if (close == null || open == null || open <= 0) return [];
    return [{ ticker: s.ticker, name: s.name, close, changePct: Math.round((close / open - 1) * 1000) / 10 }];
  });
}

/** The day's biggest mover, drawn on the front page. */
function chartOf(w: { start: number; end: number }, markets: Edition["markets"]): Edition["chart"] {
  const top = [...markets].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  if (!top) return null;
  const rows = db()
    .prepare("SELECT price FROM stock_ticks WHERE ticker = ? AND t >= ? AND t < ? ORDER BY t, id")
    .all(top.ticker, w.start, w.end) as { price: number }[];
  if (rows.length < 2) return null;
  const step = Math.max(1, Math.ceil(rows.length / 48));
  const points = rows.filter((_, i) => i % step === 0 || i === rows.length - 1).map((r) => r.price);
  return { ticker: top.ticker, name: top.name, changePct: top.changePct, points };
}

/** "NBA, Saturday 14 November: Nuggets at Pelicans: Nuggets 112, Pelicans 104", every result of the covered day. */
function resultsOf(covers: number): string[] {
  if (getSettings().sports === 0) return [];
  const day = new Date(covers).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return recentResults().filter((r) => r.split(", ")[1]?.startsWith(`${day}:`));
}

function scoresOf(results: string[]): Edition["scores"] {
  return results.flatMap((r) => {
    const m = /^([^,]+), [^:]+: (.+?): (.+)$/.exec(r);
    return m ? [{ competition: m[1], title: m[2], score: m[3] }] : [];
  });
}

/** Announced films, albums and games that have not come out, when the slate exists. */
function comingSoon(t: number): Edition["coming"] {
  try {
    const has = db().prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'projects'").get();
    if (!has) return [];
    return db()
      .prepare(
        `SELECT kind, title, maker, release FROM projects
         WHERE status NOT IN ('released', 'cancelled') AND created_at <= ?
         ORDER BY (release IS NULL), updated_at DESC LIMIT ?`,
      )
      .all(t, CAP.coming) as Edition["coming"];
  } catch (err) {
    console.error("[arc] reading the slate failed:", err);
    return [];
  }
}

/** Everything the edition call is given, and the boxes copied from the ledgers. */
export function gather(t = now()): { input: PaperInput; boxes: Pick<Edition, "scores" | "markets" | "chart" | "coming">; window: ReturnType<typeof dayJustEnded> } | null {
  const w = dayJustEnded(t);
  const storylines = storylinesOf(w);
  if (!storylines.length) return null;
  const conn = db();
  const settings = getSettings();
  const facts = dayFacts(
    conn.prepare("SELECT id, text, storyline_id FROM facts WHERE created_at >= ? AND created_at < ? ORDER BY created_at, id").all(w.start, w.end) as unknown as DayFact[],
    storylines.map((s) => s.id),
  ).map((f) => clip(f.text, 300));
  const notes = (conn
    .prepare(
      `SELECT p.author, p.text AS post, n.text AS note FROM notes n JOIN posts p ON p.id = n.post_id
       WHERE n.created_at >= ? AND n.created_at < ? AND p.deleted = 0 ORDER BY n.created_at DESC LIMIT ?`,
    )
    .all(w.start, w.end, CAP.notes) as { author: string; post: string; note: string }[]).map((n) => ({
    author: n.author, post: clip(n.post.replace(/\s+/g, " "), 200), note: clip(n.note, 300),
  }));
  const results = resultsOf(w.start);
  const markets = closes(w);
  const moves = recentMoves(60)
    .filter((m) => m.t >= w.start && m.t < w.end)
    .slice(0, CAP.moves)
    .map((m) => ({ ticker: m.ticker, pct: m.pct, reason: clip(m.reason, 100) }));
  const prev = latestEdition();
  const input: PaperInput = {
    number: editionCount() + 1,
    date: editionDate(w.date),
    covers: editionDate(w.covers),
    weekday: editionWeekday(w.covers),
    subjects: SUBJECTS.filter((k) => settings[k] > 0).map((k) => SUBJECT_INFO[k].name),
    storylines,
    facts,
    notes,
    // The story writer gets the latest few; the scores table prints them all.
    results: results.slice(0, CAP.results),
    markets: markets.map((m) => ({ ...m, close: Number(m.close.toPrecision(6)) })),
    moves,
    previous: prev
      ? {
          number: prev.number,
          date: editionDate(prev.date),
          lead: prev.lead.headline,
          standfirst: prev.lead.standfirst,
          stories: prev.stories.map((s) => ({ headline: s.headline, text: clip(s.text, 400) })),
        }
      : null,
    columnist: prev?.comment.columnist
      ? { name: prev.comment.columnist, headline: prev.comment.headline, paragraphs: prev.comment.paragraphs.map((p) => clip(p, 900)) }
      : null,
  };
  return { input, boxes: { scores: scoresOf(results), markets, chart: chartOf(w, markets), coming: comingSoon(t) }, window: w };
}

// ---------------------------------------------------------------- the output

const text = (s: unknown, n: number) => (typeof s === "string" ? clip(s.replace(/[ \t]+/g, " ").trim(), n) : "");
const lines = (xs: unknown[], n: number, max: number) => xs.map((x) => text(x, n)).filter(Boolean).slice(0, max);

/** The model's edition, repaired: unknown storylines untagged, each storyline
 *  tagged once, lists capped, the columnist kept. Null when nothing usable. */
export function tidy(out: EditionOutput, input: PaperInput, boxes: Pick<Edition, "scores" | "markets" | "chart" | "coming">, date: string, covers: string): Edition | null {
  const known = new Set(input.storylines.map((s) => s.id));
  const used = new Set<number>();
  const tag = (id: number | null) => {
    if (id == null || !known.has(id) || used.has(id)) return null;
    used.add(id);
    return id;
  };
  const lead = {
    headline: text(out.lead.headline, 200),
    standfirst: text(out.lead.standfirst, 400),
    paragraphs: lines(out.lead.paragraphs, 1500, 4),
    storylineId: tag(out.lead.storyline),
  };
  if (!lead.headline || !lead.paragraphs.length) return null;
  const stories: EditionStory[] = out.stories
    .map((s) => ({ headline: text(s.headline, 200), text: text(s.text, 800), storylineId: tag(s.storyline) }))
    .filter((s) => s.headline && s.text)
    .slice(0, 5);
  return {
    number: input.number,
    date,
    covers,
    lead,
    stories,
    briefs: lines(out.briefs, 400, 6),
    corrections: lines(out.corrections, 500, 2),
    comment: {
      // Chosen in the first edition and kept.
      columnist: input.columnist?.name ?? text(out.comment.columnist, 60),
      headline: text(out.comment.headline, 200),
      paragraphs: lines(out.comment.paragraphs, 1500, 4),
    },
    ...boxes,
  };
}

/** Write and publish the edition for today, about the day just ended. Returns
 *  whether a model call was made. Throws when the call fails or returns
 *  nothing usable; the day stays unseen so the next opportunity tries again. */
export async function writeEdition(): Promise<boolean> {
  const t = now();
  const today = dateKey(t);
  const g = hasEdition(today) ? null : gather(t);
  if (!g) {
    // Already printed, or the day just ended had no beats: nothing to print.
    kvSet(SEEN, today);
    return false;
  }
  const out = await generate({ role: "director", system: paperSystem(), user: paperUser(g.input), schema: EditionSchema });
  if (!out) throw new Error("The edition call declined or returned output that did not match the schema.");
  const edition = tidy(out, g.input, g.boxes, g.window.date, g.window.covers);
  if (!edition) throw new Error("The edition call returned no usable lead story.");
  tx(() => {
    // The day may have been printed while the model was writing.
    if (!hasEdition(edition.date)) storeEdition(edition, Math.max(now(), t));
    kvSet(SEEN, edition.date);
  });
  return true;
}
