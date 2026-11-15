"use client";
// Real and invented, side by side: "What really happened" beside "In this
// world" at the top of a story's "How this story came about" panel, the
// sentence that says how far the story has gone from the facts, and the
// overview line and filter at the top of the map, which count the same way.
// Every word here comes from data the world already keeps; no model is asked.
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { openFromClick } from "@/components/browser/open";
import type { RealHeadline, StoryMapStoryline, StoryReality } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type Basis = StoryReality["basis"];

export function dateOf(t: number): string {
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function hostOf(link: string): string | null {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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

/** A link to the real article: the only kind of link that leaves the app. Feeds
 *  read through Google News give Google's forwarding address, so it says so. */
export function RealArticleLink({ link, compact = false }: { link: string; compact?: boolean }) {
  const host = hostOf(link);
  const viaGoogle = host === "news.google.com";
  const label = compact
    ? viaGoogle ? "via Google News" : (host ?? "Real article")
    : viaGoogle ? "Read the real article (via Google News)" : host ? `Read the real article on ${host}` : "Read the real article";
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Opens the real article in a new browser tab"
      className="inline-flex items-center gap-1 text-x-blue hover:underline"
    >
      {label}
      <ExternalMark />
    </a>
  );
}

// ------------------------------------------------------------ the sentences

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One sentence: what the story rests on and how many of its beats were made up here. */
export function departure(s: StoryMapStoryline): string {
  const { basis, beats } = s.reality;
  const lead =
    basis === "headline"
      ? s.provenance === "adapted"
        ? "Started from a real headline, rewritten to fit this world"
        : "Started from a real headline"
      : basis === "game"
        ? "Follows a real game on the schedule; its play and score are this world’s"
        : "Invented here, with no real headline behind it";
  const real = beats.real + beats.adapted;
  const total = real + beats.invented + beats.yours;
  if (total === 0) return `${lead}.`;
  if (total === 1) {
    const only = real ? "drew on a real headline" : beats.yours ? "came from you" : "was invented here";
    return `${lead}. Its one beat so far ${only}.`;
  }
  const parts = [
    beats.invented ? `${beats.invented} ${beats.invented === 1 ? "was" : "were"} invented here` : "",
    real ? `${real} drew on ${real === 1 ? "a real headline" : "real headlines"}` : "",
    beats.yours ? `${beats.yours} came from you` : "",
  ].filter(Boolean);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `${lead}. Of its ${total} beats so far, ${list}.`;
}

/** "19 stories: 9 started from real headlines (1 of them rewritten to fit this world), 2 follow real games, 8 were invented here." */
export function basisSummary(storylines: StoryMapStoryline[]): string {
  const n = (b: Basis) => storylines.filter((s) => s.reality.basis === b).length;
  const adapted = storylines.filter((s) => s.reality.basis === "headline" && s.provenance === "adapted").length;
  const total = storylines.length;
  const parts = [
    `${n("headline")} started from real headlines${adapted ? ` (${adapted} of them rewritten to fit this world)` : ""}`,
    n("game") ? `${plural(n("game"), "follows a real game", "follow real games")}` : "",
    `${n("invented")} ${n("invented") === 1 ? "was" : "were"} invented here`,
  ].filter(Boolean);
  return `${plural(total, "story", "stories")}: ${parts.join(", ")}.`;
}

// ------------------------------------------------------------ the panels

function Panel({ title, tone, children }: { title: string; tone: "real" | "world" | "none"; children: ReactNode }) {
  const frame = tone === "real" ? "border-x-blue/50" : tone === "none" ? "border-dashed border-x-border" : "border-x-border";
  const head = tone === "real" ? "text-x-blue" : "text-x-text";
  return (
    <section className={`min-w-0 rounded-xl border bg-x-bg px-3 pb-3 pt-2.5 ${frame}`}>
      <h3 className={`mb-1.5 text-[13px] font-extrabold uppercase leading-4 tracking-wide ${head}`}>{title}</h3>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mt-2 text-[13px] leading-4 text-x-dim first:mt-0">{children}</div>;
}

function RealSide({ h }: { h: RealHeadline }) {
  return (
    <>
      <Label>The real headline, as published</Label>
      <p className="mt-0.5 text-[15px] leading-5 text-x-text">{h.title}</p>
      <p className="mt-1 text-[13px] leading-4 text-x-dim">
        {h.source}
        {h.publishedAt != null ? ` · Published ${dateOf(h.publishedAt)}` : ""}
      </p>
      {h.link ? (
        <p className="mt-1.5 text-[13px] leading-4">
          <RealArticleLink link={h.link} />
        </p>
      ) : null}
    </>
  );
}

function InventedSide({ storyline, onJump }: { storyline: StoryMapStoryline; onJump: (id: number) => void }) {
  const { invented, words, realRoot } = storyline.reality;
  const { started, parent } = storyline.background;
  const storyLink = (s: { id: number; title: string }) => (
    <button type="button" onClick={() => onJump(s.id)} className="text-left text-x-blue hover:underline">
      {s.title}
    </button>
  );
  const parentLink = parent ? storyLink(parent) : null;
  // A spin-off of a spin-off can still have a real headline at its root: say where, and that this part is not real.
  const roots = realRoot ? (
    realRoot.id === parent?.id ? (
      " That story started from a real headline; this one did not."
    ) : (
      <> The chain of stories it grew from began with a real headline ({storyLink(realRoot)}); this one did not.</>
    )
  ) : null;
  let kind: ReactNode;
  switch (invented) {
    case "whatif":
      kind = (
        <>
          <p className="text-[15px] leading-5 text-x-text">Started by your What if.</p>
          {words ? <p className="mt-1 text-[15px] leading-5 text-x-dim">You wrote: “{words}”</p> : null}
        </>
      );
      break;
    case "post":
      kind = (
        <p className="text-[15px] leading-5 text-x-text">
          Started by{" "}
          {started.kind === "post" ? (
            <Link href={`/post/${started.postId}`} className="text-x-blue hover:underline">
              your post
            </Link>
          ) : (
            "your post"
          )}
          .
        </p>
      );
      break;
    case "spinoff":
      kind = (
        <p className="text-[15px] leading-5 text-x-text">
          A spin-off of {parentLink ?? "another story"}.
          {roots}
        </p>
      );
      break;
    case "major":
      kind = (
        <p className="text-[15px] leading-5 text-x-text">
          A major event the world staged.
          {parentLink ? <> It grew out of {parentLink}.</> : null}
          {roots}
        </p>
      );
      break;
    default:
      kind = <p className="text-[15px] leading-5 text-x-text">A wildcard: the world made this story up on its own.</p>;
  }
  return (
    <>
      <p className="text-[15px] font-bold leading-5 text-x-text">Nothing. This story was invented here.</p>
      <Label>How it started</Label>
      <div className="mt-0.5">{kind}</div>
    </>
  );
}

function WorldSide({ storyline, rewritten }: { storyline: StoryMapStoryline; rewritten: string | null }) {
  const { summary, opening } = storyline.reality;
  return (
    <>
      {rewritten ? (
        <>
          <Label>First, the news desk rewrote the headline to fit this world</Label>
          <p className="mt-0.5 text-[15px] leading-5 text-x-gold">{rewritten}</p>
        </>
      ) : null}
      <Label>The story here</Label>
      <p className="mt-0.5 text-[15px] font-bold leading-5 text-x-text">{storyline.title}</p>
      {summary && summary !== storyline.title ? <p className="mt-0.5 text-[15px] leading-5 text-x-text">{summary}</p> : null}
      {opening ? (
        <>
          <Label>First reported here by {opening.outlet.name}</Label>
          <a
            href={`/news/${opening.id}`}
            onClick={(e) => openFromClick(e, opening)}
            className="mt-0.5 flex items-start gap-1.5 text-[15px] leading-5 text-x-blue hover:underline"
          >
            <span className="mt-0.5 shrink-0">
              <Avatar account={opening.outlet} size={16} />
            </span>
            <span className="min-w-0">{opening.headline}</span>
          </a>
        </>
      ) : null}
    </>
  );
}

/** "What really happened" and "In this world", then how far apart they have drifted. */
export function RealityPanels({ storyline, onJump }: { storyline: StoryMapStoryline; onJump: (id: number) => void }) {
  const { basis, game } = storyline.reality;
  const { started, drewOn } = storyline.background;
  const opener = started.kind === "headline" ? started.headline : null;
  return (
    <div className="@container mt-3">
      <div className="grid gap-2 @sm:grid-cols-2">
        <Panel title="What really happened" tone={basis === "invented" ? "none" : "real"}>
          {basis === "headline" ? (
            opener ? (
              <RealSide h={opener} />
            ) : (
              <p className="text-[15px] leading-5 text-x-text">A real headline that is no longer on file.</p>
            )
          ) : basis === "game" && game ? (
            <>
              <p className="text-[15px] leading-5 text-x-text">
                {storyline.title} was on the real {game.competition} schedule for {dateOf(game.startsAt)}.
              </p>
              <p className="mt-1 text-[13px] leading-4 text-x-dim">
                The real result is not shown here. Everything that happened in the game is this world’s.
              </p>
            </>
          ) : (
            <InventedSide storyline={storyline} onJump={onJump} />
          )}
        </Panel>
        <Panel title="In this world" tone="world">
          <WorldSide storyline={storyline} rewritten={opener?.adapted ?? null} />
        </Panel>
      </div>
      <p className="mt-3 text-[15px] font-bold leading-5 text-x-text">{departure(storyline)}</p>
      {drewOn.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-[13px] font-bold leading-4 text-x-dim">Later real headlines it drew on</div>
          <ul className="space-y-2.5">
            {drewOn.map((h) => (
              <li key={h.id}>
                <p className="text-[15px] leading-5 text-x-text">{h.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] leading-4 text-x-dim">
                  <span>
                    {h.source}
                    {h.publishedAt != null ? ` · Published ${dateOf(h.publishedAt)}` : ""}
                  </span>
                  {h.link ? (
                    <>
                      <span aria-hidden>·</span>
                      <RealArticleLink link={h.link} compact />
                    </>
                  ) : null}
                </p>
                {h.adapted ? (
                  <p className="mt-1 text-[13px] leading-4 text-x-dim">
                    Rewritten here as: <span className="text-x-gold">{h.adapted}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
