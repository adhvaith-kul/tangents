// How fast the world moves. One setting decides how often the engine ticks,
// how story beats alternate with everyday (ambient) posts, and how many story
// beats pass before a new event may open from a fresh headline.
import { kvGet, kvSet } from "../db";
import { getSettings } from "../settings";
import { PACES, type Pace } from "../types";
import { volumes } from "../usage";

interface PaceSpec {
  /** Seconds between ticks in the separate cycle. In the combined cycle a tick
   *  is longer: see tickMs. */
  seconds: number;
  /** One cycle of tick kinds, repeated. */
  pattern: ("story" | "ambient")[];
  /** Story beats on the open storylines before a new event is due. */
  newEventAfter: number;
}

const SPECS: Record<Pace, PaceSpec> = {
  // Ticks 40 seconds apart, two of every three a story beat: a beat about
  // every minute on average. For demos.
  live: { seconds: 40, pattern: ["story", "story", "ambient"], newEventAfter: 3 },
  // Ticks a minute apart, alternating: a story beat about every two minutes.
  steady: { seconds: 60, pattern: ["story", "ambient"], newEventAfter: 4 },
  // Ticks two minutes apart, one in three a story beat: a beat about every
  // six minutes.
  slow: { seconds: 120, pattern: ["story", "ambient", "ambient"], newEventAfter: 5 },
};

export function getPace(): Pace {
  const v = kvGet("pace");
  return PACES.includes(v as Pace) ? (v as Pace) : "steady";
}

export function setPace(pace: Pace): void {
  kvSet("pace", pace);
}

/** Real and simulated length of a tick. TICK_SECONDS, when set, overrides the pace.
 *  In a combined cycle every tick is a story beat that also carries the
 *  everyday posts, so a tick lasts as long as the story-to-story gap. */
export function tickMs(): number {
  const override = Number(process.env.TICK_SECONDS);
  if (Number.isFinite(override) && override >= 5) return override * 1000;
  const { seconds, pattern } = SPECS[getPace()];
  if (!volumes().combined) return seconds * 1000;
  const stories = pattern.filter((k) => k === "story").length;
  return Math.round((seconds * pattern.length) / stories) * 1000;
}

/** What the next scheduled tick should be, advancing the cycle. */
export function nextScheduledKind(): "story" | "ambient" {
  if (volumes().combined) return "story";
  const { pattern } = SPECS[getPace()];
  const n = Number(kvGet("schedule_step") ?? 0) || 0;
  kvSet("schedule_step", String(n + 1));
  return pattern[n % pattern.length];
}

/** Whether a normal story beat should open a new event from a headline. */
export function newEventDue(ticksSinceNewEvent: number): boolean {
  // Reality 4 opens a real event two beats sooner than the pace alone; 0 waits four beats longer.
  const shift = [4, 2, 0, -1, -2][getSettings().reality] ?? 0;
  return ticksSinceNewEvent >= Math.max(1, SPECS[getPace()].newEventAfter + shift);
}
