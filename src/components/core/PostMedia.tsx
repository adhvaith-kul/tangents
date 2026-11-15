"use client";
// A post's attached GIF, meme, chart, tier list or a project's drawn card. Rendered by PostCard below the text.
// The kinds live in components/media.
import type { PostMedia as Media } from "@/lib/types";
import { ChartMedia } from "../media/ChartMedia";
import { FrontPageMedia } from "../media/FrontPageMedia";
import { GifMedia } from "../media/GifMedia";
import { MemeMedia } from "../media/MemeMedia";
import { ProjectMedia } from "../media/ProjectMedia";
import { TiersMedia } from "../media/TiersMedia";

export function PostMedia({ media, large = false }: { media: Media; large?: boolean }) {
  switch (media.kind) {
    case "gif":
      return <GifMedia url={media.url} width={media.width} height={media.height} alt={media.alt} large={large} />;
    case "meme":
      return <MemeMedia template={media.template} top={media.top} bottom={media.bottom} large={large} />;
    case "chart":
      return <ChartMedia ticker={media.ticker} />;
    case "frontpage":
      return <FrontPageMedia page={media.page} large={large} />;
    case "tiers":
      return <TiersMedia tiers={media.tiers} />;
    case "project":
      return <ProjectMedia card={media.card} large={large} />;
    default:
      return null;
  }
}
