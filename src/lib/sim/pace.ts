// How fast the world moves. One setting decides how often the engine ticks,
// how story beats alternate with everyday (ambient) posts, and how many story
// beats pass before a new event may open from a fresh headline.
import { kvGet, kvSet } from "../db";
import { PACES, type Pace } from "../types";

interface PaceSpec {
  /** Seconds between ticks. */
  seconds: number;
  /** One cycle of tick kinds, repeated. */
  pattern: ("story" | "ambient")[];
  /** Story beats on the open storylines before a new event is due. */
  newEventAfter: number;
}

const SPECS: Record<Pace, PaceSpec> = {
  // A story beat every 40 seconds: for demos.
  live: { seconds: 40, pattern: ["story", "story", "ambient"], newEventAfter: 3 },
  // A story beat about every two minutes, everyday posts in between.
  steady: { seconds: 60, pattern: ["story", "ambient"], newEventAfter: 4 },
  // A story beat about every six minutes.
  slow: { seconds: 120, pattern: ["story", "ambient", "ambient"], newEventAfter: 5 },
};

export function getPace(): Pace {
  const v = kvGet("pace");
  return PACES.includes(v as Pace) ? (v as Pace) : "steady";
}

export function setPace(pace: Pace): void {
  kvSet("pace", pace);
}

/** Real and simulated length of a tick. TICK_SECONDS, when set, overrides the pace. */
export function tickMs(): number {
  const override = Number(process.env.TICK_SECONDS);
  const seconds = Number.isFinite(override) && override >= 5 ? override : SPECS[getPace()].seconds;
  return seconds * 1000;
}

/** What the next scheduled tick should be, advancing the cycle. */
export function nextScheduledKind(): "story" | "ambient" {
  const { pattern } = SPECS[getPace()];
  const n = Number(kvGet("schedule_step") ?? 0) || 0;
  kvSet("schedule_step", String(n + 1));
  return pattern[n % pattern.length];
}

/** Whether a normal story beat should open a new event from a headline. */
export function newEventDue(ticksSinceNewEvent: number): boolean {
  return ticksSinceNewEvent >= SPECS[getPace()].newEventAfter;
}
