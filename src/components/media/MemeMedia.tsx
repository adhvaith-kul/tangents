"use client";
// A meme template with its captions laid over it by the app.
import { MediaFrame } from "./MediaFrame";
import { MEME_LAYOUTS, type CaptionBox } from "./memeLayouts";
import { MEME_TEMPLATES } from "@/lib/media";

const IMPACT = 'Impact, "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const PLAIN = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
const MAX_LINES = 3;

/** Largest font size (in % of image width) at which the text fits the box in at most three lines. */
function fit(text: string, box: CaptionBox, aspect: number): { size: number; text: string } {
  const boxH = box.h * aspect; // box height in the same unit as width (% of image width)
  const charW = box.style === "impact" ? 0.52 : 0.58; // average glyph width in em, caps
  const lineH = box.style === "impact" ? 1.1 : 1.2;
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = box.size; size >= 2.2; size -= 0.2) {
    const perLine = Math.floor(box.w / (size * charW));
    if (perLine < 1) continue;
    let lines = 1;
    let cur = 0;
    let ok = true;
    for (const w of words) {
      if (w.length > perLine) { ok = false; break; }
      if (cur === 0) cur = w.length;
      else if (cur + 1 + w.length <= perLine) cur += 1 + w.length;
      else { lines++; cur = w.length; }
    }
    if (ok && lines <= MAX_LINES && lines * size * lineH <= boxH) return { size, text };
  }
  // Does not fit even at the smallest size: clip the text rather than overflow.
  const size = 2.2;
  const max = Math.floor(box.w / (size * charW)) * MAX_LINES - 1;
  return { size, text: text.length > max ? `${text.slice(0, Math.max(0, max)).trimEnd()}…` : text };
}

function Caption({ text, box, aspect, bottom }: { text: string; box: CaptionBox; aspect: number; bottom: boolean }) {
  const raw = text.trim();
  if (!raw) return null;
  const impact = box.style === "impact";
  const { size, text: shown } = fit(impact ? raw.toUpperCase() : raw, box, aspect);
  return (
    <div
      className="absolute flex justify-center"
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        alignItems: impact ? (bottom ? "flex-end" : "flex-start") : "center",
      }}
    >
      <span
        className="text-center"
        style={{
          fontFamily: impact ? IMPACT : PLAIN,
          fontWeight: impact ? 400 : 700,
          fontSize: `${size}cqw`,
          lineHeight: impact ? 1.1 : 1.2,
          color: impact ? "#fff" : "#000",
          WebkitTextStroke: impact ? `${size * 0.16}cqw #000` : undefined,
          paintOrder: "stroke fill",
          textWrap: "balance",
          overflowWrap: "break-word",
        }}
      >
        {shown}
      </span>
    </div>
  );
}

export function MemeMedia({ template, top, bottom, large }: { template: string; top: string; bottom: string; large: boolean }) {
  const meta = MEME_TEMPLATES.find((t) => t.id === template);
  const layout = MEME_LAYOUTS[template];
  if (!meta || !layout) return null;
  const aspect = layout.h / layout.w;
  // Cap the height by narrowing the frame, so caption percentages stay aligned with the image.
  const maxWidth = large ? undefined : Math.round(510 / aspect);
  return (
    <MediaFrame className="bg-black">
      <div className="relative mx-auto w-full" style={{ maxWidth, aspectRatio: layout.w / layout.h, containerType: "inline-size" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed local template, positioned captions */}
        <img src={meta.image} alt={`${meta.name} meme: ${top} ${bottom}`.trim()} className="absolute inset-0 h-full w-full" loading="lazy" />
        <Caption text={top} box={layout.top} aspect={aspect} bottom={false} />
        <Caption text={bottom} box={layout.bottom} aspect={aspect} bottom />
      </div>
    </MediaFrame>
  );
}
