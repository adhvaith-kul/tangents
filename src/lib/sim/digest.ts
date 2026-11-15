// Builds the WorldDigest: everything the director sees on one tick.
// Synchronous reads only; called outside any transaction.
import { CROWD, FIGURES, ORGS, OUTLETS } from "../cast";
import { SPAM_HANDLES } from "../crowd";
import { CROWD_VOICES } from "../personas";
import { db, kvGet, now, type PostRow, type StorylineRow } from "../db";
import { pickHeadlines } from "../news";
import { arcMemory } from "../paper";
import { rateOf } from "../rates";
import { interestPull } from "../interests";
import { getSettings } from "../settings";
import { tasteSummary } from "../prefs";
import { digestSlate, newProjectDue } from "../slate";
import { digestScoreboard } from "../sports";
import { digestStocks } from "../stocks";
import { SUBJECTS } from "../subjects";
import type { DigestPost, DigestStoryline, Domain, WorldDigest } from "../types";
import { digestArc } from "./major";
import { newEventDue } from "./pace";
import { comingDue, recall } from "./recall";
import { digestStands } from "./stands";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type PostLite = Pick<PostRow, "id" | "author" | "text" | "reply_to" | "created_at">;

export function digestPost(p: PostLite, t = now()): DigestPost {
  return {
    ref: `p${p.id}`,
    author: p.author,
    text: p.text,
    replyToRef: p.reply_to != null ? `p${p.reply_to}` : null,
    minutesAgo: Math.max(0, Math.round((t - p.created_at) / MINUTE)),
  };
}

export function parseJsonList(s: string | null | undefined): string[] {
  try {
    const v: unknown = JSON.parse(s ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "Saturday 14 November 2026, 09:40" in the server's local time zone. */
function formatSimTime(t: number): string {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

const POST_COLS = "id, author, text, reply_to, created_at";

// Replies to and quotes of a post its author deleted stay on the timeline, as
// on X, but they no longer feed the story: the director does not see them.
const NOT_UNDER_DELETED =
  "AND NOT EXISTS (SELECT 1 FROM posts d WHERE d.deleted = 1 AND d.id IN (p.reply_to, p.root_id, p.quote_of))";

function storylines(t: number): DigestStoryline[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT * FROM storylines WHERE status = 'open'")
    .all() as unknown as StorylineRow[];
  // Recency in whole hours since the last beat, then heat.
  const age = (r: StorylineRow) => Math.floor(Math.max(0, t - r.updated_at) / HOUR);
  rows.sort((a, b) => age(a) - age(b) || b.heat - a.heat || b.updated_at - a.updated_at);
  const recent = conn.prepare(
    `SELECT ${POST_COLS} FROM posts p WHERE storyline_id = ? AND deleted = 0 ${NOT_UNDER_DELETED}
     ORDER BY created_at DESC, id DESC LIMIT 4`,
  );
  return rows.slice(0, 6).map((r) => {
    // Includes posts still scheduled from the last tick so the director remembers them.
    const posts = (recent.all(r.id) as unknown as PostLite[]).reverse();
    return {
      id: r.id,
      parentId: r.parent_id,
      title: r.title,
      summary: r.summary,
      domain: r.domain as Domain,
      participants: parseJsonList(r.participants),
      heat: r.heat,
      beats: r.beats,
      hoursSinceLastBeat: Math.round((Math.max(0, t - r.updated_at) / HOUR) * 10) / 10,
      hoursSinceStart: Math.round((Math.max(0, t - r.created_at) / HOUR) * 10) / 10,
      recentPosts: posts.map((p) => digestPost(p, t)),
    };
  });
}

function focusFor(postId: number, t: number): WorldDigest["focus"] {
  const get = db().prepare(`SELECT ${POST_COLS} FROM posts WHERE id = ? AND deleted = 0`);
  const post = get.get(postId) as PostLite | undefined;
  if (!post) return null;
  const thread: DigestPost[] = [];
  const seen = new Set<number>([post.id]);
  let parentId = post.reply_to;
  while (parentId != null && !seen.has(parentId) && thread.length < 20) {
    seen.add(parentId);
    const parent = get.get(parentId) as PostLite | undefined;
    if (!parent) break;
    thread.unshift(digestPost(parent, t));
    parentId = parent.reply_to;
  }
  return { post: digestPost(post, t), thread };
}

export function buildDigest(
  mode: WorldDigest["mode"],
  focusPostId: number | null,
  seed: string | null = null,
  steer: { storylineId: number; wrap: boolean } | null = null,
): WorldDigest {
  const conn = db();
  const t = now();

  const relationships = (
    conn
      .prepare(
        "SELECT a, b, score, note FROM relationships WHERE score != 0 ORDER BY updated_at DESC LIMIT 30",
      )
      .all() as { a: string; b: string; score: number; note: string }[]
  ).map((r) => ({ a: r.a, b: r.b, score: r.score, note: r.note }));

  const timeline = (
    conn
      .prepare(
        `SELECT p.id, p.author, p.text, p.reply_to, p.created_at FROM posts p
         JOIN accounts a ON a.handle = p.author
         WHERE p.reply_to IS NULL AND p.created_at <= ? AND p.deleted = 0 ${NOT_UNDER_DELETED}
           AND a.kind IN ('figure', 'outlet', 'org', 'user')
         ORDER BY p.created_at DESC, p.id DESC LIMIT 15`,
      )
      .all(t) as unknown as PostLite[]
  ).map((p) => digestPost(p, t));

  const userRow = conn
    .prepare("SELECT handle, name, followers FROM accounts WHERE kind = 'user' LIMIT 1")
    .get() as { handle: string; name: string; followers: number } | undefined;
  const user = userRow
    ? {
        handle: userRow.handle,
        name: userRow.name,
        followers: userRow.followers,
        recentPosts: (
          conn
            .prepare(
              `SELECT ${POST_COLS} FROM posts WHERE author = ? AND created_at <= ? AND deleted = 0
               ORDER BY created_at DESC, id DESC LIMIT 5`,
            )
            .all(userRow.handle, t) as unknown as PostLite[]
        ).map((p) => digestPost(p, t)),
      }
    : null;

  const open = storylines(t);

  // The ledger sent to the writer: the newest facts, plus older ones about the
  // storylines still open and the accounts currently on the timeline. The
  // whole ledger stays in the database; what is not in play is not sent.
  const inPlay = new Set<string>();
  for (const sl of open.slice(0, 4)) for (const h of sl.participants) inPlay.add(h.toLowerCase());
  for (const p of timeline.slice(0, 10)) inPlay.add(p.author.toLowerCase());
  const openIds = new Set(open.map((sl) => sl.id));
  const ledger = conn
    .prepare("SELECT text, subjects, storyline_id, created_at FROM facts ORDER BY created_at DESC, id DESC LIMIT 150")
    .all() as { text: string; subjects: string; storyline_id: number | null; created_at: number }[];
  const facts = ledger
    .filter(
      (f, i) =>
        i < 10 ||
        (f.storyline_id != null && openIds.has(f.storyline_id)) ||
        parseJsonList(f.subjects).some((h) => inPlay.has(h.toLowerCase())),
    )
    .slice(0, 30)
    .map((f) => ({ text: f.text, daysAgo: Math.floor(Math.max(0, t - f.created_at) / DAY) }));
  // However old: what the world knows about what this beat is likely to be about.
  const headlines = pickHeadlines(8);
  const memory = recall({
    t, open, headlines, seed, focusPostId: mode === "user_post" ? focusPostId : null,
    steerId: steer?.storylineId ?? null, shown: new Set(facts.map((f) => f.text)),
  });
  facts.push(...memory.facts);
  facts.sort((a, b) => a.daysAgo - b.daysAgo);
  const ticksSinceNewEvent = Number(kvGet("ticks_since_new_event") ?? 0) || 0;
  const wide = breadth(open);
  return {
    simTime: formatSimTime(t),
    mode,
    user,
    focus: mode === "user_post" && focusPostId != null ? focusFor(focusPostId, t) : null,
    storylines: open,
    relationships,
    facts,
    earlierStories: memory.earlierStories,
    paper: arcMemory(),
    comingDue: comingDue(t),
    stands: digestStands(t),
    timeline,
    headlines,
    stocks: digestStocks(),
    taste: tasteSummary(),
    ticksSinceNewEvent,
    seed,
    steer: steerOf(steer),
    // Pace decides when a normal beat may open something new; a new world always may.
    // So does a thin world: fewer than four stories running, or a subject the
    // reader follows with nothing open, as long as the last beat was not also new.
    newEventDue:
      mode === "bootstrap" ||
      (mode === "normal" &&
        (open.length === 0 ||
          newEventDue(ticksSinceNewEvent) ||
          (ticksSinceNewEvent >= 1 && (open.length < 4 || wide.emptySubjects.length > 0)))),
    ...outletTurns(),
    ...castTurns(t),
    ...wide,
    lastBeat: lastBeat(),
    // Every eighth ordinary beat sets the reader's taste aside.
    wildcard: mode === "normal" && seed == null && steer == null && (Number(kvGet("beats_since_wildcard") ?? 0) || 0) >= 7,
    standouts: standouts(),
    scoreboard: digestScoreboard(),
    slate: digestSlate(),
    projectDue: newProjectDue(mode, seed != null || steer != null),
    correctionDue: correctionDue(mode),
    arc: digestArc(mode, seed, steer),
  };
}

/** Who is ahead of and behind their own posting habit. Each famous account
 *  has a typical rate (rates.ts); its fair share of the last stretch of posts
 *  is its rate over everyone's. Well ahead of that share: rested. Behind it:
 *  offered a turn, drawn in proportion to rate, so frequent posters come back
 *  quickly and rare ones only now and then. An account the reader asked to see
 *  less of counts as posting a third as often. */
function castTurns(t: number): Pick<WorldDigest, "busyCast" | "quietCast"> {
  const WINDOW = 150;
  const rows = db()
    .prepare(
      `SELECT author AS handle, COUNT(*) AS n FROM (
         SELECT p.author FROM posts p JOIN accounts a ON a.handle = p.author
         WHERE a.kind IN ('figure', 'org') AND p.deleted = 0 AND p.created_at <= ?
         ORDER BY p.created_at DESC, p.id DESC LIMIT ${WINDOW}
       ) GROUP BY author`,
    )
    .all(t) as { handle: string; n: number }[];
  const counts = new Map(rows.map((r) => [r.handle.toLowerCase(), r.n]));
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  const less = new Set(
    (db().prepare("SELECT key FROM prefs WHERE kind = 'author' AND weight <= -8").all() as { key: string }[]).map((r) =>
      r.key.toLowerCase(),
    ),
  );
  const chosen = getSettings().interests;
  const cast = [...FIGURES, ...ORGS].map((c) => ({
    handle: c.handle,
    pull: interestPull(c.handle, c.domain, chosen),
    rate: rateOf(c.handle, c.kind) * (less.has(c.handle.toLowerCase()) ? 0.33 : 1),
    n: counts.get(c.handle.toLowerCase()) ?? 0,
  }));
  const rates = cast.reduce((sum, c) => sum + c.rate, 0);
  const scored = cast.map((c) => ({ ...c, fair: (c.rate / rates) * Math.max(total, 40) }));
  const busyCast = scored
    .filter((c) => c.n >= 3 && c.n > c.fair * 1.6 + 1)
    .sort((a, b) => b.n / b.fair - a.n / a.fair)
    .slice(0, 6)
    .map((c) => c.handle);
  // Weighted draw without replacement among those behind their share.
  const quietCast = scored
    .filter((c) => c.n < c.fair)
    // Whose turn it is leans on the reader's chosen interests, as the briefs do.
    .map((c) => ({ handle: c.handle, key: -Math.log(1 - Math.random()) / (Math.sqrt(c.rate) * c.pull) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, 8)
    .map((c) => c.handle);
  return { busyCast, quietCast };
}

/** A few ordinary accounts the director may use for the beat's stand-out reply:
 *  drawn at random, leaning to voices that carry a joke or a sharp point. */
function standouts(): WorldDigest["standouts"] {
  const sharp = /wry|dry|joke|dunk|sarcas|deadpan|funny|roast|blunt|sceptic|weary|caption/i;
  return CROWD.filter((c) => !SPAM_HANDLES.has(c.handle))
    .map((c) => ({ c, voice: CROWD_VOICES[c.handle] ?? "" }))
    .map((x) => ({ ...x, key: -Math.log(1 - Math.random()) / (sharp.test(x.voice) ? 3 : 1) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, 5)
    .map((x) => ({ handle: x.c.handle, name: x.c.name, voice: x.voice }));
}

/** Which storyline has just had the floor, from the record of beats. */
function lastBeat(): WorldDigest["lastBeat"] {
  const rows = db().prepare("SELECT storyline_id FROM beats ORDER BY id DESC LIMIT 4").all() as { storyline_id: number }[];
  if (!rows.length) return null;
  let streak = 0;
  while (streak < rows.length && rows[streak].storyline_id === rows[0].storyline_id) streak++;
  return { storylineId: rows[0].storyline_id, streak };
}

/** Subjects the reader has switched on with nothing open, and open storylines that already touch. */
function breadth(open: DigestStoryline[]): Pick<WorldDigest, "emptySubjects" | "links"> {
  const settings = getSettings();
  const emptySubjects = SUBJECTS.filter((d) => settings[d] > 0 && !open.some((sl) => sl.domain === d));
  const links: WorldDigest["links"] = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const mine = new Set(open[i].participants.map((h) => h.toLowerCase()));
      const shared = open[j].participants.filter((h) => mine.has(h.toLowerCase()));
      if (shared.length) links.push({ a: open[i].id, b: open[j].id, shared: shared.slice(0, 4) });
    }
  }
  return { emptySubjects: [...emptySubjects], links: links.slice(0, 5) };
}

function steerOf(steer: { storylineId: number; wrap: boolean } | null): WorldDigest["steer"] {
  if (!steer) return null;
  const row = db().prepare("SELECT title, summary FROM storylines WHERE id = ?").get(steer.storylineId) as
    | { title: string; summary: string } | undefined;
  return row ? { ...steer, ...row } : null;
}

/** Whose turn it is to publish, so the same few outlets do not carry every story. */
function outletTurns(): Pick<WorldDigest, "recentOutlets" | "quietOutlets"> {
  const rows = db()
    .prepare("SELECT outlet, MAX(created_at) AS last FROM articles WHERE kind = 'article' GROUP BY outlet")
    .all() as { outlet: string; last: number }[];
  const last = new Map(rows.map((r) => [r.outlet.toLowerCase(), r.last]));
  const recentOutlets = rows.sort((a, b) => b.last - a.last).slice(0, 3).map((r) => r.outlet);
  // The quieter half of the list, shuffled, so the hint differs from beat to beat.
  const quiet = OUTLETS.map((o) => ({ handle: o.handle, last: last.get(o.handle.toLowerCase()) ?? 0 }))
    .sort((a, b) => a.last - b.last)
    .slice(0, Math.ceil(OUTLETS.length / 2))
    .map((o) => ({ ...o, key: Math.random() }))
    .sort((a, b) => a.key - b.key);
  return { recentOutlets, quietOutlets: quiet.slice(0, 5).map((o) => o.handle) };
}

/** How many beats pass without a Community Note before one comes due. */
const NOTE_GAP_BEATS = 4;

/** Whether this beat is asked for a Community Note. Left to choose, the
 *  director never writes one, so the engine asks: once four beats have passed
 *  without a note, on about every other beat until one lands. */
function correctionDue(mode: WorldDigest["mode"]): boolean {
  if (mode !== "normal") return false;
  const { n } = db()
    .prepare("SELECT COUNT(*) AS n FROM beats WHERE created_at > COALESCE((SELECT MAX(created_at) FROM notes), 0)")
    .get() as { n: number };
  return n >= NOTE_GAP_BEATS && Math.random() < 0.5;
}
