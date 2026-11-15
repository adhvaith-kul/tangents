// The timeline's own in-jokes. Every stand-out reply the director writes is
// recorded as a line that may have caught on; the crowd writer is offered a
// few of the recent ones to riff on, those from the same storyline first.
// A line is offered only once it has had about twenty simulated minutes to
// catch on, and stops being offered after a week or after five batches.
import { db } from "../db";

const DAY = 24 * 3_600_000;
/** A line just posted has not caught on yet. */
const MIN_AGE = 20 * 60_000;
const MAX_AGE = 7 * DAY;
const MAX_OFFERS = 5;
const MAX_LINES = 3;
const LINE_CHARS = 140;

/** A post's text shortened to one line. */
function lineOf(text: string): string {
  const one = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(one);
  return chars.length > LINE_CHARS ? `${chars.slice(0, LINE_CHARS).join("").trimEnd()}…` : one;
}

/** Record a stored stand-out reply as a candidate in-joke. */
export function recordInJoke(postId: number, text: string, storylineId: number | null, at: number): void {
  const line = lineOf(text);
  if (!line) return;
  db()
    .prepare("INSERT OR IGNORE INTO injokes (post_id, line, storyline_id, created_at) VALUES (?, ?, ?, ?)")
    .run(postId, line, storylineId, at);
}

export interface InJoke {
  author: string;
  line: string;
  msAgo: number;
}

/** Up to three lines for a crowd batch on this storyline: visible, at least
 *  twenty minutes and under a week old, offered fewer than five times; this
 *  storyline's first, then the newest from elsewhere. Counts the offer. Best effort: a failure means no lines. */
export function offerInJokes(storylineId: number, t: number): InJoke[] {
  try {
    return offer(storylineId, t);
  } catch (err) {
    console.error("[sim] in-jokes failed:", err);
    return [];
  }
}

function offer(storylineId: number, t: number): InJoke[] {
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT j.post_id, j.line, j.created_at, p.author FROM injokes j JOIN posts p ON p.id = j.post_id
       WHERE p.deleted = 0 AND j.created_at <= ? AND j.created_at > ? AND j.offered < ${MAX_OFFERS}
       ORDER BY (j.storyline_id IS ?) DESC, j.created_at DESC, j.post_id DESC LIMIT ${MAX_LINES}`,
    )
    .all(t - MIN_AGE, t - MAX_AGE, storylineId) as { post_id: number; line: string; created_at: number; author: string }[];
  const bump = conn.prepare("UPDATE injokes SET offered = offered + 1 WHERE post_id = ?");
  for (const r of rows) bump.run(r.post_id);
  return rows.map((r) => ({ author: r.author, line: r.line, msAgo: Math.max(0, t - r.created_at) }));
}
