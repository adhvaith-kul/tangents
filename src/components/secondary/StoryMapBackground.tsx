"use client";
// Where a story came from: the provenance badge on every node, and the "How
// this story came about" panel that opens under a row when its title (or the
// line under its opening beat) is clicked. The panel leads with real and
// invented side by side (StoryMapReality.tsx).
import type { ReactNode } from "react";
import type { Provenance, StoryMapStoryline } from "@/lib/types";
import { RealityPanels } from "./StoryMapReality";

const BADGE: Record<Provenance, { label: string; title: string; tone: string }> = {
  real: { label: "Real", title: "Drew on a real headline, used as it was", tone: "border-x-blue/40 text-x-blue" },
  adapted: { label: "Adapted", title: "A real headline, rewritten to fit this world", tone: "border-x-gold/40 text-x-gold" },
  invented: { label: "Invented", title: "No real source: the world made it up", tone: "border-x-border text-x-dim" },
  yours: { label: "Yours", title: "Came from your What if or your post", tone: "border-x-pink/40 text-x-pink" },
};

export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const b = BADGE[provenance];
  return (
    <span title={b.title} className={`rounded border px-1 text-[11px] font-bold leading-[14px] ${b.tone}`}>
      {b.label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-[13px] font-bold leading-4 text-x-dim">{title}</div>
      {children}
    </div>
  );
}

function StoryLink({ story, onJump }: { story: { id: number; title: string }; onJump: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onJump(story.id)}
      className="block text-left text-[15px] leading-5 text-x-blue hover:underline"
    >
      {story.title}
    </button>
  );
}

export function StoryBackgroundPanel({ storyline, onJump }: { storyline: StoryMapStoryline; onJump: (id: number) => void }) {
  const { parent, spinoffs, facts } = storyline.background;
  return (
    <div
      className="mt-3 cursor-default rounded-2xl border border-x-border bg-x-card/50 px-4 pb-4 pt-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[15px] font-bold leading-5 text-x-text">How this story came about</div>
      <RealityPanels storyline={storyline} onJump={onJump} />
      {parent ? (
        <Section title="Grew out of">
          <StoryLink story={parent} onJump={onJump} />
        </Section>
      ) : null}
      {spinoffs.length > 0 ? (
        <Section title="Led to">
          <div className="space-y-1">
            {spinoffs.map((s) => (
              <StoryLink key={s.id} story={s} onJump={onJump} />
            ))}
          </div>
        </Section>
      ) : null}
      {facts.length > 0 ? (
        <Section title="What this world has established">
          <ul className="space-y-1.5">
            {facts.map((f, i) => (
              <li key={i} className="text-[15px] leading-5 text-x-text">
                {f}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
