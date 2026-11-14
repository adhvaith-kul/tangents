// Synthetic engagement numbers. A post is given target counts when it is
// written; the numbers shown climb towards the targets as the post ages.
import type { PostCounts } from "./types";

export interface Targets {
  likes: number;
  reposts: number;
  replies: number;
  views: number;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Target counts for a new post, from the author's reach and the post's heat (1 to 10). */
export function targetsFor(followers: number, heat: number): Targets {
  const h = Math.min(10, Math.max(1, heat));
  const likes = Math.round(
    followers * 0.00004 * Math.pow(h, 1.5) * rand(0.5, 1.5) + h * h * rand(0.5, 3),
  );
  const reposts = Math.round(likes * rand(0.08, 0.2));
  const replies = Math.round(likes * rand(0.03, 0.12));
  const views = Math.round(likes * rand(20, 60) + followers * 0.01 * rand(0.5, 1.5));
  return { likes, reposts, replies, views };
}

const RAMP_MS = 20 * 60 * 1000;

/** Counts to display for a post of the given age. */
export function shownCounts(t: Targets, ageMs: number): PostCounts {
  const f = 1 - Math.exp(-Math.max(0, ageMs) / RAMP_MS);
  return {
    likes: Math.round(t.likes * f),
    reposts: Math.round(t.reposts * f),
    replies: Math.round(t.replies * f),
    views: Math.round(t.views * Math.min(1, f * 1.15)),
  };
}
