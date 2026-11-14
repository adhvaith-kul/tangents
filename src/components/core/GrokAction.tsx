"use client";
// The assistant button X puts beside each post's "…" menu. Decorative here.
import { GrokMark } from "@/components/icons";

export function GrokAction() {
  return (
    <button
      type="button"
      aria-label="Grok actions"
      onClick={(e) => e.stopPropagation()}
      className="group relative flex shrink-0 items-center justify-center text-x-dim transition-colors hover:text-x-blue"
    >
      <span className="absolute -inset-2 rounded-full transition-colors group-hover:bg-x-blue/10" />
      <GrokMark size={18.75} className="relative" />
    </button>
  );
}
