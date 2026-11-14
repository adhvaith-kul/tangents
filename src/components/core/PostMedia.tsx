"use client";
// A post's attached GIF, meme or chart. Rendered by PostCard below the text;
// the props are frozen. The three kinds live in components/media.
import type { PostMedia as Media } from "@/lib/types";
import { ChartMedia } from "../media/ChartMedia";
import { GifMedia } from "../media/GifMedia";
import { MemeMedia } from "../media/MemeMedia";

export function PostMedia({ media, large = false }: { media: Media; large?: boolean }) {
  switch (media.kind) {
    case "gif":
      return <GifMedia url={media.url} width={media.width} height={media.height} alt={media.alt} large={large} />;
    case "meme":
      return <MemeMedia template={media.template} top={media.top} bottom={media.bottom} large={large} />;
    case "chart":
      return <ChartMedia ticker={media.ticker} />;
    default:
      return null;
  }
}
