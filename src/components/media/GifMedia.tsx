"use client";
// An attached GIF with X's small "GIF" badge.
import { MediaFrame } from "./MediaFrame";

export function GifMedia({
  url,
  width,
  height,
  alt,
  large,
}: {
  url: string;
  width: number;
  height: number;
  alt: string;
  large: boolean;
}) {
  const ratio = width > 0 && height > 0 ? width / height : 16 / 9;
  return (
    <MediaFrame>
      {/* eslint-disable-next-line @next/next/no-img-element -- external GIPHY url, animated */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="block w-full object-cover"
        style={{ aspectRatio: ratio, maxHeight: large ? undefined : 510 }}
      />
      <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-px text-[13px] font-bold leading-4 text-white">
        GIF
      </span>
    </MediaFrame>
  );
}
