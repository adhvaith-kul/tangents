// Poll views and voting. Displayed votes climb linearly from the post's
// creation to closes_at towards the stored targets; the user's vote adds 1.
// Server-only.
import { db, now } from "./db";
import type { PollView } from "./types";

interface PollJoin {
  post_id: number;
  options: string;
  targets: string;
  closes_at: number;
  user_choice: number | null;
  created_at: number;
}

function list<T>(s: string, map: (v: unknown) => T): T[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(map) : [];
  } catch {
    return [];
  }
}

/** Whole-number percentages summing to 100 (largest remainder); all zeros without votes. */
function percents(votes: number[]): number[] {
  const total = votes.reduce((a, b) => a + b, 0);
  if (total <= 0) return votes.map(() => 0);
  const raw = votes.map((v) => (v * 100) / total);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

function toView(r: PollJoin, t: number): PollView {
  const labels = list(r.options, String);
  const targets = list(r.targets, (v) => Math.max(0, Number(v) || 0));
  const span = Math.max(1, r.closes_at - r.created_at);
  const f = Math.min(1, Math.max(0, (t - r.created_at) / span));
  const votes = labels.map((_, i) => Math.round((targets[i] ?? 0) * f) + (r.user_choice === i ? 1 : 0));
  const pct = percents(votes);
  return {
    options: labels.map((label, i) => ({ label, votes: votes[i], pct: pct[i] })),
    totalVotes: votes.reduce((a, b) => a + b, 0),
    choice: r.user_choice,
    closed: t >= r.closes_at,
    closesAt: r.closes_at,
  };
}

function rows(postIds: number[]): PollJoin[] {
  if (!postIds.length) return [];
  return db()
    .prepare(
      `SELECT p.post_id, p.options, p.targets, p.closes_at, p.user_choice, o.created_at
       FROM polls p JOIN posts o ON o.id = p.post_id
       WHERE p.post_id IN (${postIds.map(() => "?").join(",")})`,
    )
    .all(...postIds) as unknown as PollJoin[];
}

/** Poll DTOs for the given posts (one query); posts without a poll are absent. */
export function pollViews(postIds: number[]): Map<number, PollView> {
  const t = now();
  return new Map(rows([...new Set(postIds)]).map((r) => [r.post_id, toView(r, t)]));
}

export type VoteResult = { poll: PollView } | { error: string; status: 400 | 404 | 409 };

export function votePoll(postId: number, option: number): VoteResult {
  const r = rows([postId])[0];
  if (!r) return { error: "No such poll.", status: 404 };
  const t = now();
  if (t >= r.closes_at) return { error: "This poll is closed.", status: 409 };
  if (r.user_choice != null) return { error: "You already voted in this poll.", status: 409 };
  const n = list(r.options, String).length;
  if (!Number.isInteger(option) || option < 0 || option >= n) return { error: "No such option.", status: 400 };
  const res = db()
    .prepare("UPDATE polls SET user_choice = ? WHERE post_id = ? AND user_choice IS NULL")
    .run(option, postId);
  if (!res.changes) return { error: "You already voted in this poll.", status: 409 };
  return { poll: toView({ ...r, user_choice: option }, t) };
}
