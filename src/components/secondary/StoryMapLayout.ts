// Lane layout for the story map: which column each storyline's line runs in and
// what each row has to draw. Rows are newest first, so a storyline's line runs
// from its newest row (small index) down to its opening row (large index).
import type { StoryMapBeat, StoryMapStoryline } from "@/lib/types";

const LANE_COLOURS = ["#1d9bf0", "#f91880", "#00ba7c", "#ffd400", "#7856ff", "#ff7a00", "#8b98a5", "#f4212e"];

export interface Line {
  storylineId: number;
  lane: number;
  colour: string;
}

export interface RowLayout {
  /** Other storylines' lines that run the full height of this row. */
  through: Line[];
  /** This beat's own storyline. */
  own: Line & { above: boolean; below: boolean; hollow: boolean };
  /** A spin-off's opening beat: the curve down to its parent's lane. */
  branch: Line | null;
  /** The parent's line when it only begins at that curve on this row. */
  parentStart: Line | null;
}

export interface MapLayout {
  lanes: number;
  rows: RowLayout[];
  /** Lines crossing the gap above row i (for the day separators). */
  between: (i: number) => Line[];
  colourOf: (storylineId: number) => string;
}

interface Span {
  id: number;
  newest: number; // row of the newest beat
  top: number; // row where the line begins: `newest`, or a child's branch above it
  oldest: number; // row of the opening beat
  lane: number;
  colour: string;
  dormant: boolean;
  parent: Span | null;
}

export function layoutStoryMap(beats: StoryMapBeat[], storylines: StoryMapStoryline[]): MapLayout {
  const info = new Map(storylines.map((s, i) => [s.id, { s, colour: LANE_COLOURS[i % LANE_COLOURS.length] }]));
  const spans = new Map<number, Span>();
  beats.forEach((b, i) => {
    const span = spans.get(b.storylineId);
    if (span) span.oldest = i;
    else {
      const meta = info.get(b.storylineId);
      spans.set(b.storylineId, {
        id: b.storylineId, newest: i, top: i, oldest: i, lane: 0,
        colour: meta?.colour ?? LANE_COLOURS[0], dormant: meta?.s.dormant ?? false, parent: null,
      });
    }
  });
  // A spin-off joins its parent where it opens, if the parent's line can reach that row.
  for (const span of spans.values()) {
    const parentId = info.get(span.id)?.s.parentId;
    const parent = parentId != null ? spans.get(parentId) : undefined;
    if (!parent || span.oldest > parent.oldest) continue;
    span.parent = parent;
    parent.top = Math.min(parent.top, span.oldest);
  }
  // Oldest storyline first, each in the leftmost lane that is free for its whole run.
  const taken: { top: number; oldest: number }[][] = [];
  for (const span of [...spans.values()].sort((a, b) => b.oldest - a.oldest)) {
    let lane = 0;
    while (taken[lane]?.some((t) => span.top <= t.oldest && t.top <= span.oldest)) lane++;
    (taken[lane] ??= []).push({ top: span.top, oldest: span.oldest });
    span.lane = lane;
  }

  const all = [...spans.values()];
  const line = (s: Span): Line => ({ storylineId: s.id, lane: s.lane, colour: s.colour });
  const rows = beats.map((b, i): RowLayout => {
    const me = spans.get(b.storylineId)!;
    const branching = me.parent != null && i === me.oldest;
    return {
      through: all.filter((s) => s !== me && s.top < i && i < s.oldest).map(line),
      own: { ...line(me), above: i > me.top, below: i < me.oldest, hollow: me.dormant && i === me.newest },
      branch: branching ? line(me.parent!) : null,
      // The parent's own beats are all below: its line starts at the curve.
      parentStart: branching && me.parent!.top === i ? line(me.parent!) : null,
    };
  });
  return {
    lanes: Math.max(1, taken.length),
    rows,
    between: (i) => all.filter((s) => s.top <= i - 1 && s.oldest >= i).map(line),
    colourOf: (id) => spans.get(id)?.colour ?? info.get(id)?.colour ?? LANE_COLOURS[0],
  };
}
