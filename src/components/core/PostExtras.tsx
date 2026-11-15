"use client";
// Extras under a post's text: a poll, a Community Note and, with X-ray on,
// the label for what the post is doing. Rendered by PostCard.
import { CommunityNote } from "@/components/extras/CommunityNote";
import { PollBox } from "@/components/extras/PollBox";
import { TACTICS, type Tactic } from "@/lib/tactics";
import type { PostView } from "@/lib/types";
import { useXray } from "./xray";

/** X-ray's line under a post: what the post is doing to whoever reads it. It
 *  is marked as X-ray's own words, in a box no post has, so it cannot be taken
 *  for part of the post. Provoking posts are tinted red. */
function XrayLabel({ tactic }: { tactic: Tactic }) {
  const t = TACTICS[tactic];
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`mt-3 cursor-default rounded-lg border px-3 py-2 text-[13px] leading-[18px] ${t.hot ? "border-x-red/40 bg-x-red/10" : "border-x-border bg-x-card/50"}`}
    >
      <span className="mr-2 text-[11px] font-bold uppercase tracking-wide text-x-dim">X-ray</span>
      <span className={`mr-2 font-bold ${t.hot ? "text-x-red" : "text-x-text"}`}>{t.label}</span>
      <span className="text-x-dim">{t.explanation}</span>
    </div>
  );
}

export function PostExtras({ post, large = false }: { post: PostView; large?: boolean }) {
  void large;
  const xray = useXray();
  if (post.deleted) return null;
  return (
    <>
      {post.poll ? <PollBox postId={post.id} poll={post.poll} own={post.author.kind === "user"} /> : null}
      {post.note ? <CommunityNote text={post.note} /> : null}
      {xray && post.tactic ? <XrayLabel tactic={post.tactic} /> : null}
    </>
  );
}
