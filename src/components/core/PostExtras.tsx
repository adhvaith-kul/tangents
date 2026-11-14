"use client";
// Extras under a post's text: a poll and a Community Note. Rendered by
// PostCard; the props are frozen.
import { CommunityNote } from "@/components/extras/CommunityNote";
import { PollBox } from "@/components/extras/PollBox";
import type { PostView } from "@/lib/types";

export function PostExtras({ post, large = false }: { post: PostView; large?: boolean }) {
  void large;
  if (post.deleted) return null;
  return (
    <>
      {post.poll ? <PollBox postId={post.id} poll={post.poll} /> : null}
      {post.note ? <CommunityNote text={post.note} /> : null}
    </>
  );
}
