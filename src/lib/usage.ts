// How much the world writes, and how much it has cost today.
// The reader's Usage setting scales the size of each model call; the scheduler
// asks holdReason() before starting anything nobody asked for. Server-only.
import { db, now, userHandle } from "./db";
import { getSettings } from "./settings";
import type { Settings, UsageSummary } from "./types";

export interface Volumes {
  crowd: number; // replies per story beat
  crowdBootstrap: number;
  ambient: number; // everyday posts per call
  thread: number; // replies written when the reader opens a post
  briefs: number; // full persona briefs sent with a story beat
  ambientBriefs: number;
  unread: number; // unread top-level posts at which the world waits for the reader
  /** One director call writes the story beat and the everyday posts for the
   *  quiet minutes after it, and one crowd call answers both. Off: everyday
   *  posts get their own pair of calls between beats. */
  combined: boolean;
  crowdEveryday: number; // extra crowd posts for the everyday part of a combined cycle
}

const VOLUMES: Record<Settings["usage"], Volumes> = {
  0: { crowd: 8, crowdBootstrap: 7, ambient: 4, thread: 5, briefs: 8, ambientBriefs: 6, unread: 15, combined: true, crowdEveryday: 3 },
  1: { crowd: 12, crowdBootstrap: 9, ambient: 5, thread: 8, briefs: 12, ambientBriefs: 9, unread: 40, combined: true, crowdEveryday: 5 },
  2: { crowd: 14, crowdBootstrap: 9, ambient: 6, thread: 8, briefs: 12, ambientBriefs: 9, unread: 120, combined: false, crowdEveryday: 0 },
};

export function volumes(s: Settings = getSettings()): Volumes {
  return VOLUMES[s.usage] ?? VOLUMES[1];
}

/** Local midnight, real time: model calls are logged with the real clock. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function usageSummary(): UsageSummary {
  const day = db()
    .prepare(
      `SELECT COUNT(*) AS calls, COALESCE(SUM(input_tokens), 0) AS input, COALESCE(SUM(output_tokens), 0) AS output
       FROM llm_calls WHERE created_at >= ?`,
    )
    .get(startOfToday()) as { calls: number; input: number; output: number };
  const hour = db()
    .prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens FROM llm_calls WHERE created_at >= ?")
    .get(Date.now() - 3_600_000) as { tokens: number };
  return { calls: day.calls, inputTokens: day.input, outputTokens: day.output, lastHourTokens: hour.tokens };
}

/** Top-level posts that have appeared since the newest post the reader has
 *  looked at. Zero until they have looked at anything, so a new world fills. */
function unreadPosts(): number {
  const seen = db()
    .prepare("SELECT MAX(p.created_at) AS t FROM posts p JOIN interactions i ON i.post_id = p.id")
    .get() as { t: number | null };
  if (seen.t == null) return 0;
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM posts p
       WHERE p.reply_to IS NULL AND p.deleted = 0 AND p.created_at > ? AND p.created_at <= ? AND p.author != ?`,
    )
    .get(seen.t, now(), userHandle() ?? "") as { n: number };
  return row.n;
}

/** Why the world should not start anything on its own right now, if it should not.
 *  "budget": today's token limit is spent. "unread": plenty is waiting to be read. */
export function holdReason(): "budget" | "unread" | null {
  const s = getSettings();
  if (s.budget > 0) {
    const u = usageSummary();
    if (u.inputTokens + u.outputTokens >= s.budget * 1000) return "budget";
  }
  return unreadPosts() >= volumes(s).unread ? "unread" : null;
}
