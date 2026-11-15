// When each item of a ripple appears in the replay. The story's real span is
// compressed to 12 to 20 seconds; each moment is half real time and half running
// order, so a quiet hour does not leave the screen empty and a burst of replies
// in one minute still plays out one by one. Pure, so it can be tested on its own.
import type { RippleNode } from "@/lib/types";

const LEAD = 300; // ms before the origin appears
const TAIL = 1600; // ms the finished ripple holds before the replay ends
export const LINE_MS = 450; // a line drawing from its cause
export const CHIP_DELAY = 250; // the chip starts appearing this long after its line
export const APPEAR_MS = 450;
export const PULSE_MS = 1200;

export interface Timeline {
  /** Length of the replay, ms. */
  duration: number;
  /** When each node's line starts drawing (the origin: when it appears), ms into the replay. */
  start: Map<string, number>;
  /** When each ring is first reached, ms into the replay. */
  ringStart: Map<number, number>;
  /** The simulation time shown at a moment of the replay. */
  clockAt: (ms: number) => number;
}

export function rippleTimeline(nodes: RippleNode[]): Timeline {
  const start = new Map<string, number>();
  const ringStart = new Map<number, number>();
  if (!nodes.length) return { duration: 0, start, ringStart, clockAt: () => 0 };
  const duration = Math.min(20_000, Math.max(12_000, 9_000 + nodes.length * 180));
  const t0 = nodes[0].at;
  const last = Math.max(...nodes.map((n) => Math.max(n.at, ...(n.arrivals ?? []))));
  const span = Math.max(1, last - t0);
  const room = duration - LEAD - TAIL - CHIP_DELAY - APPEAR_MS;
  const keys: [number, number][] = [];
  nodes.forEach((n, i) => {
    const linear = (n.at - t0) / span;
    const order = nodes.length > 1 ? i / (nodes.length - 1) : 0;
    const ms = LEAD + room * (0.5 * linear + 0.5 * order);
    start.set(n.id, ms);
    if (!ringStart.has(n.ring)) ringStart.set(n.ring, ms + (n.ring === 0 ? 0 : CHIP_DELAY));
    keys.push([ms, n.at]);
  });
  keys.push([duration - TAIL, last]);

  const clockAt = (ms: number) => {
    if (ms <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [m1, t1] = keys[i];
      if (ms > m1) continue;
      const [m0, tPrev] = keys[i - 1];
      return m1 === m0 ? t1 : tPrev + ((ms - m0) / (m1 - m0)) * (t1 - tPrev);
    }
    return last;
  };
  return { duration, start, ringStart, clockAt };
}
