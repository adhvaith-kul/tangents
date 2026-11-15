// Poll views and voting, and the reader's own polls. Displayed votes climb
// from the post's creation to closes_at towards the stored targets (a long
// poll gets most of its votes early, as its views do); the user's vote adds 1.
// Server-only.
import { db, now, userHandle } from "./db";
import type { PollView } from "./types";

interface PollJoin {
  post_id: number;
  options: string;
  targets: string;
  closes_at: number;
  user_choice: number | null;
  created_at: number;
  author: string;
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

const RAMP_MS = 20 * 60 * 1000; // as in engagement.ts: a post's views mostly arrive in its first hour

/** The share of the final votes cast by time t. A short poll (the cast's last
 *  minutes) fills linearly; a longer one follows its post's views, most votes
 *  early, and still ends exactly on the targets when it closes. */
function filled(t: number, created: number, closes: number): number {
  const span = Math.max(1, closes - created);
  const age = Math.min(span, Math.max(0, t - created));
  if (span <= 3 * RAMP_MS) return age / span;
  return (1 - Math.exp(-age / RAMP_MS)) / (1 - Math.exp(-span / RAMP_MS));
}

function toView(r: PollJoin, t: number): PollView {
  const labels = list(r.options, String);
  const targets = list(r.targets, (v) => Math.max(0, Number(v) || 0));
  const f = filled(t, r.created_at, r.closes_at);
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
      `SELECT p.post_id, p.options, p.targets, p.closes_at, p.user_choice, o.created_at, o.author
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

export type VoteResult = { poll: PollView } | { error: string; status: 400 | 403 | 404 | 409 };

export function votePoll(postId: number, option: number): VoteResult {
  const r = rows([postId])[0];
  if (!r) return { error: "No such poll.", status: 404 };
  // As on X, the author of a poll sees its results but cannot vote in it.
  if (r.author.toLowerCase() === userHandle()?.toLowerCase()) {
    return { error: "You can’t vote in your own poll.", status: 403 };
  }
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

// ---- the reader's own polls

export const POLL_CHOICE_MAX = 25;
export const POLL_MIN_MINUTES = 5;
export const POLL_MAX_MINUTES = 7 * 24 * 60;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** `total` whole votes in proportion to the weights (largest remainder). */
function distribute(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

/** An uneven split of `total` votes over n choices, so there is usually a clear winner. */
function unevenSplit(n: number, total: number): number[] {
  return distribute(Array.from({ length: n }, () => Math.pow(Math.random(), 1.5) + 0.08), total);
}

/** How many votes the reader's poll ends on: a few per hundred of its views,
 *  plus most of the people who replied (they voted before arguing). The reader
 *  is a small account, so a post with forty views gets a handful, not thousands. */
function readerTotal(postId: number): number {
  const row = db()
    .prepare(
      `SELECT t_views, t_replies,
              (SELECT COUNT(*) FROM posts r WHERE r.reply_to = p.id AND r.deleted = 0) AS replied
       FROM posts p WHERE p.id = ?`,
    )
    .get(postId) as { t_views: number; t_replies: number; replied: number } | undefined;
  if (!row) return 1;
  const replies = Math.max(row.t_replies, row.replied);
  return Math.max(1, Math.round(row.t_views * rand(0.025, 0.06) + replies * rand(0.6, 1)));
}

/** Store a poll on the reader's new post. Until the world has reacted, its
 *  targets are a plausible uneven split sized to the post's reach so far. */
export function addReaderPoll(postId: number, choices: string[], minutes: number, createdAt: number): void {
  db()
    .prepare("INSERT OR IGNORE INTO polls (post_id, options, targets, closes_at) VALUES (?, ?, ?, ?)")
    .run(
      postId,
      JSON.stringify(choices),
      JSON.stringify(unevenSplit(choices.length, readerTotal(postId))),
      createdAt + minutes * 60_000,
    );
}

/** The poll on a post, for the writers: its choices and how long it stays open. */
export function pollFor(postId: number): { choices: string[]; closesIn: string } | null {
  const r = db().prepare("SELECT options, closes_at FROM polls WHERE post_id = ?").get(postId) as
    | { options: string; closes_at: number }
    | undefined;
  if (!r) return null;
  const choices = list(r.options, String);
  if (choices.length < 2) return null;
  const min = Math.max(1, Math.round((r.closes_at - now()) / 60_000));
  const closesIn =
    min < 90 ? `${min} minutes` : min < 48 * 60 ? `${Math.round(min / 60)} hours` : `${Math.round(min / 1440)} days`;
  return { choices, closesIn };
}

/** Once the world has reacted to the reader's poll: size the final votes to
 *  the reach the reaction gave the post, and split them by the shares the
 *  reply writer chose (a percentage per choice), or unevenly when it gave
 *  nothing usable. Returns where the split came from, for the log. */
export function settleReaderPoll(postId: number, shares: unknown): "model" | "fallback" | null {
  const r = db().prepare("SELECT options, resolved FROM polls WHERE post_id = ?").get(postId) as
    | { options: string; resolved: number }
    | undefined;
  if (!r || r.resolved) return null;
  const n = list(r.options, String).length;
  const usable =
    Array.isArray(shares) &&
    shares.length === n &&
    shares.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) &&
    shares.some((v) => (v as number) > 0);
  const total = readerTotal(postId);
  const targets = usable ? distribute(shares as number[], total) : unevenSplit(n, total);
  db().prepare("UPDATE polls SET targets = ? WHERE post_id = ?").run(JSON.stringify(targets), postId);
  return usable ? "model" : "fallback";
}
