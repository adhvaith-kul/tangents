"use client";
// Where a story came from: the provenance badge on every node, and the "How
// this story came about" panel that opens under a row when its title is clicked.
// Links to real articles are the only links in the app that leave it; they open
// in a new browser tab and say where they go.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Provenance, RealHeadline, StoryMapStoryline } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

/** "12 stories: 9 from real headlines, 1 adapted, 1 invented, 1 yours." */
export function provenanceSummary(storylines: StoryMapStoryline[]): string {
  const n = (p: Provenance) => storylines.filter((s) => s.provenance === p).length;
  const total = storylines.length;
  return `${total} ${total === 1 ? "story" : "stories"}: ${n("real")} from real headlines, ${n("adapted")} adapted, ${n("invented")} invented, ${n("yours")} yours.`;
}

function hostOf(link: string): string | null {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function dateOf(t: number): string {
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** The arrow that marks a link out of the app. */
function ExternalMark() {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden className="inline-block shrink-0 align-[-1px]">
      <path
        d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Headline({ h, tag }: { h: RealHeadline; tag?: string }) {
  const host = h.link ? hostOf(h.link) : null;
  const meta = [h.source, h.publishedAt != null ? dateOf(h.publishedAt) : null, tag].filter(Boolean).join(" · ");
  return (
    <div>
      {h.adapted ? <div className="text-[13px] leading-4 text-x-dim">Real headline</div> : null}
      <p className="text-[15px] leading-5 text-x-text">{h.title}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] leading-4 text-x-dim">
        <span>{meta}</span>
        {h.link ? (
          <>
            <span aria-hidden>·</span>
            <a
              href={h.link}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens the real article in a new browser tab"
              className="inline-flex items-center gap-1 text-x-blue hover:underline"
            >
              {host ?? "Real article"}
              <ExternalMark />
            </a>
          </>
        ) : null}
      </div>
      {h.adapted ? (
        <>
          <div className="mt-2 text-[13px] leading-4 text-x-dim">In this world</div>
          <p className="text-[15px] leading-5 text-x-text">{h.adapted}</p>
        </>
      ) : null}
    </div>
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
  const { started, parent, spinoffs, drewOn, facts } = storyline.background;
  return (
    <div
      className="mt-3 cursor-default rounded-2xl border border-x-border bg-x-card/50 px-4 pb-4 pt-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[15px] font-bold leading-5 text-x-text">How this story came about</div>
      <Section title="Started from">
        {started.kind === "headline" ? (
          started.headline ? (
            <Headline h={started.headline} />
          ) : (
            <p className="text-[15px] leading-5 text-x-text">A real headline that is no longer on file.</p>
          )
        ) : started.kind === "whatif" ? (
          <>
            <p className="text-[15px] leading-5 text-x-text">Your What if</p>
            {/* The premise itself is not kept; this is how the world opened the story. */}
            {started.text ? <p className="mt-0.5 text-[13px] leading-4 text-x-dim">{started.text}</p> : null}
          </>
        ) : started.kind === "post" ? (
          <Link href={`/post/${started.postId}`} className="text-[15px] leading-5 text-x-blue hover:underline">
            Your post
          </Link>
        ) : (
          <p className="text-[15px] leading-5 text-x-text">Invented by the world</p>
        )}
      </Section>
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
      {drewOn.length > 0 ? (
        <Section title="Also drew on">
          <div className="space-y-3">
            {drewOn.map((h) => (
              <Headline key={h.id} h={h} tag={h.adapted ? "adapted" : "continues"} />
            ))}
          </div>
        </Section>
      ) : null}
      {facts.length > 0 ? (
        <Section title="What it established">
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
