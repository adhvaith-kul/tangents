"use client";
// A post's attached GIF, meme or chart. STUB: the media workstream replaces the
// body. Rendered by PostCard below the text; the props are frozen.
import type { PostMedia as Media } from "@/lib/types";

export function PostMedia({ media, large = false }: { media: Media; large?: boolean }) {
  void media; void large;
  return null;
}
