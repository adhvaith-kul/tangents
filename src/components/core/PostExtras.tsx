"use client";
// Extras under a post's text: polls and Community Notes. STUB for a later
// workstream. Rendered by PostCard; the props are frozen.
import type { PostView } from "@/lib/types";

export function PostExtras({ post, large = false }: { post: PostView; large?: boolean }) {
  void post; void large;
  return null;
}
