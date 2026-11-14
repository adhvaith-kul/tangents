// Builds the WorldDigest: everything the director sees on one tick.
// Synchronous reads only; called outside any transaction.
import { db, kvGet, now, type PostRow, type StorylineRow } from "../db";
import { pickHeadlines } from "../news";
import { tasteSummary } from "../prefs";
import { digestStocks } from "../stocks";
import type { DigestPost, DigestStoryline, Domain, WorldDigest } from "../types";

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
export function formatSimTime(t: number): string {
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

export function buildDigest(mode: WorldDigest["mode"], focusPostId: number | null): WorldDigest {
  const conn = db();
  const t = now();

  const relationships = (
    conn
      .prepare(
        "SELECT a, b, score, note FROM relationships WHERE score != 0 ORDER BY updated_at DESC LIMIT 30",
      )
      .all() as { a: string; b: string; score: number; note: string }[]
  ).map((r) => ({ a: r.a, b: r.b, score: r.score, note: r.note }));

  const facts = (
    conn.prepare("SELECT text, created_at FROM facts ORDER BY created_at DESC, id DESC LIMIT 50").all() as {
      text: string;
      created_at: number;
    }[]
  ).map((f) => ({ text: f.text, daysAgo: Math.floor(Math.max(0, t - f.created_at) / DAY) }));

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

  return {
    simTime: formatSimTime(t),
    mode,
    user,
    focus: mode === "user_post" && focusPostId != null ? focusFor(focusPostId, t) : null,
    storylines: storylines(t),
    relationships,
    facts,
    timeline,
    headlines: pickHeadlines(8),
    stocks: digestStocks(),
    taste: tasteSummary(),
    ticksSinceNewEvent: Number(kvGet("ticks_since_new_event") ?? 0) || 0,
  };
}
