"use client";
// One post. STUB: the core interface workstream replaces the body. The props
// are frozen.
import type { PostView } from "@/lib/types";

export interface PostCardProps {
  post: PostView;
  /** feed: a timeline row. detail: the large focused post on its own page.
   *  thread: a timeline row with a connector line down to the next post. */
  variant?: "feed" | "detail" | "thread";
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="border-b border-x-border p-4">
      <b>{post.author.name}</b> <span className="text-x-dim">@{post.author.handle}</span>
      <p className="whitespace-pre-wrap">{post.text}</p>
    </article>
  );
}
