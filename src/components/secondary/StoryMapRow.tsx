"use client";
// One beat on the story map: its slice of the lane gutter, then what happened.
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { openFromClick } from "@/components/browser/open";
import { fullTime, formatPct } from "@/lib/format";
import type { BeatKind, StoryMapBeat, StoryMapStoryline, StoryOrigin } from "@/lib/types";
import type { Line, RowLayout } from "./StoryMapLayout";
import { RowActions, RowSteerPanel, useRowSteer, type Submit } from "./StoryMapSteer";

const KIND_LABEL: Record<BeatKind, string> = {
  new_event: "New story",
  advance: "Develops",
  spinoff: "Spin-off",
  crossover: "Crossover",
  user_reaction: "You",
};

const NO_STEER: Submit = async () => null;

const DOT_Y = 20; // centre of the dot, level with the row's first line of text
const CURVE_H = 24;

/** x of a lane's centre within the gutter. */
const laneX = (lane: number, pitch: number) => 12 + lane * pitch + pitch / 2;
const gutterWidth = (lanes: number, pitch: number) => 12 + lanes * pitch + 8;
/** Lanes are 16px apart until there are too many to fit a 100px gutter. */
const lanePitch = (lanes: number) => (lanes > 6 ? Math.floor(96 / lanes) : 16);

function originText(o: StoryOrigin): string {
  const source = o.source ? ` (${o.source})` : "";
  switch (o.kind) {
    case "headline":
      return o.text ? `From a real headline: ${o.text}${source}` : "From a real headline";
    case "adapted":
      return `Adapted from: ${o.text}${source}`;
    case "whatif":
      return "Your What if";
    case "post":
      return "Started by your post";
    case "you":
      return "Started by you";
    case "spinoff":
      return o.text ? `Spun off from: ${o.text}` : "Spin-off";
    default:
      return "Invented";
  }
}

function Segment({ line, pitch, top, bottom, height, dim }: {
  line: Line; pitch: number; top?: number; bottom?: number; height?: number; dim: boolean;
}) {
  return (
    <span
      className="absolute w-0.5"
      style={{ left: laneX(line.lane, pitch) - 1, top, bottom, height, background: line.colour, opacity: dim ? 0.25 : 1 }}
    />
  );
}

/** The lane lines for a stretch with no beat of its own (the day separators). */
export function GutterLines({ lines, lanes, selected }: { lines: Line[]; lanes: number; selected: number | null }) {
  const pitch = lanePitch(lanes);
  return (
    <div className="relative shrink-0 self-stretch" style={{ width: gutterWidth(lanes, pitch) }} aria-hidden>
      {lines.map((l) => (
        <Segment key={l.storylineId} line={l} pitch={pitch} top={0} bottom={0} dim={selected != null && selected !== l.storylineId} />
      ))}
    </div>
  );
}

/** `dot`: "big" for a major beat, "pending" for one still being written. */
function Gutter({ layout, lanes, dot, selected }: {
  layout: RowLayout; lanes: number; dot: "normal" | "big" | "pending"; selected: number | null;
}) {
  const pitch = lanePitch(lanes);
  const dim = (l: Line) => selected != null && selected !== l.storylineId;
  const { own, branch, parentStart } = layout;
  const x = laneX(own.lane, pitch);
  const r = dot === "big" ? 7 : 5;
  const width = gutterWidth(lanes, pitch);
  return (
    <div className="relative shrink-0 self-stretch" style={{ width }} aria-hidden>
      {layout.through.map((l) => (
        <Segment key={l.storylineId} line={l} pitch={pitch} top={0} bottom={0} dim={dim(l)} />
      ))}
      {own.above ? <Segment line={own} pitch={pitch} top={0} height={DOT_Y} dim={dim(own)} /> : null}
      {own.below ? <Segment line={own} pitch={pitch} top={DOT_Y} bottom={0} dim={dim(own)} /> : null}
      {parentStart ? <Segment line={parentStart} pitch={pitch} top={DOT_Y + CURVE_H} bottom={0} dim={dim(parentStart)} /> : null}
      {branch ? (
        <svg className="absolute left-0" style={{ top: DOT_Y, opacity: dim(own) ? 0.25 : 1 }} width={width} height={CURVE_H}>
          <path
            d={`M ${x} 0 C ${x} ${CURVE_H * 0.7}, ${laneX(branch.lane, pitch)} ${CURVE_H * 0.3}, ${laneX(branch.lane, pitch)} ${CURVE_H}`}
            fill="none"
            stroke={own.colour}
            strokeWidth={2}
          />
        </svg>
      ) : null}
      <span
        className="absolute rounded-full"
        style={{
          left: x - r, top: DOT_Y - r, width: r * 2, height: r * 2, opacity: dim(own) ? 0.25 : 1,
          background: own.hollow || dot === "pending" ? "#000" : own.colour,
          border: `2px ${dot === "pending" ? "dashed" : "solid"} ${own.colour}`,
        }}
      />
    </div>
  );
}

/** A request the world has accepted and not yet written. */
export function PendingRow({ layout, lanes, title, text, selected }: {
  layout: RowLayout; lanes: number; title: string; text: string; selected: number | null;
}) {
  const faded = selected != null && selected !== layout.own.storylineId;
  return (
    <div className="flex border-b border-x-border pr-4">
      <Gutter layout={layout} lanes={lanes} dot="pending" selected={selected} />
      <div className={`min-w-0 flex-1 py-3 transition-opacity ${faded ? "opacity-40" : ""}`}>
        <div className="text-[13px] font-bold leading-4" style={{ color: layout.own.colour }}>
          Writing…
        </div>
        <div className="mt-0.5 text-[15px] leading-5 text-x-dim">{title}</div>
        <p className="mt-0.5 text-[15px] leading-5">{text}</p>
      </div>
    </div>
  );
}

export function StoryMapRow({
  beat, storyline, layout, lanes, selected, onSelect, submit,
}: {
  beat: StoryMapBeat;
  storyline: StoryMapStoryline;
  layout: RowLayout;
  lanes: number;
  selected: number | null;
  onSelect: (storylineId: number) => void;
  /** null while steering from the map is switched off. */
  submit: Submit | null;
}) {
  const router = useRouter();
  const steer = useRowSteer(beat.storylineId, submit ?? NO_STEER);
  const faded = selected != null && selected !== beat.storylineId;
  const page = beat.page;
  // A beat rebuilt from a page has that page's headline as its summary: say it once.
  const summary = beat.summary && beat.summary !== storyline.title && beat.summary !== page?.headline ? beat.summary : "";
  const open = () => {
    if (beat.postId != null) router.push(`/post/${beat.postId}`);
  };
  return (
    <div
      role={beat.postId != null ? "link" : undefined}
      tabIndex={beat.postId != null ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) open();
      }}
      className={`group flex border-b border-x-border pr-4 transition-colors hover:bg-x-hover-soft ${beat.postId != null ? "cursor-pointer" : ""}`}
    >
      <Gutter layout={layout} lanes={lanes} dot={beat.heat >= 7 ? "big" : "normal"} selected={selected} />
      <div className={`min-w-0 flex-1 py-3 transition-opacity ${faded ? "opacity-40" : ""}`}>
        <div className="flex items-center gap-1 text-[13px] leading-4 text-x-dim">
          <span className="font-bold" style={{ color: layout.own.colour }}>
            {KIND_LABEL[beat.kind]}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={new Date(beat.createdAt).toISOString()} title={fullTime(beat.createdAt)}>
            {fullTime(beat.createdAt).split(" · ")[0]}
          </time>
          {submit && beat.seeded && !beat.first ? (
            <>
              <span aria-hidden>·</span>
              <span>Your What if</span>
            </>
          ) : null}
          {submit ? <RowActions steer={steer} dormant={storyline.dormant} always={beat.first} /> : null}
        </div>
        <button
          type="button"
          aria-pressed={selected === beat.storylineId}
          title={selected === beat.storylineId ? "Show every story" : "Follow this story"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(beat.storylineId);
          }}
          className={`mt-0.5 block text-left text-[15px] leading-5 hover:underline ${beat.first ? "font-bold text-x-text" : "text-x-dim"}`}
        >
          {storyline.title}
        </button>
        {summary ? <p className="mt-0.5 text-[15px] leading-5">{summary}</p> : null}
        {beat.first ? <p className="mt-1 text-[13px] leading-4 text-x-dim">{originText(storyline.origin)}</p> : null}
        {page ? (
          <a
            href={`/news/${page.id}`}
            onClick={(e) => openFromClick(e, page)}
            className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-4 text-x-blue hover:underline"
          >
            <Avatar account={page.outlet} size={16} />
            <span className="min-w-0 truncate">{page.headline}</span>
          </a>
        ) : null}
        {beat.participants.length > 0 || beat.moves.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {beat.participants.length > 0 ? (
              <div className="flex -space-x-1">
                {beat.participants.map((p) => (
                  <span key={p.handle} title={`${p.name} @${p.handle}`} className="rounded-full ring-2 ring-black">
                    <Avatar account={p} size={20} />
                  </span>
                ))}
              </div>
            ) : null}
            {beat.moves.map((m) => (
              <span
                key={m.ticker}
                className={`rounded-md px-1.5 py-0.5 text-[12px] font-bold leading-4 tabular-nums ${
                  m.pct >= 0 ? "bg-x-green/15 text-x-green" : "bg-x-red/15 text-x-red"
                }`}
              >
                {m.ticker} {formatPct(m.pct)}
              </span>
            ))}
          </div>
        ) : null}
        {submit ? <RowSteerPanel steer={steer} /> : null}
      </div>
    </div>
  );
}
