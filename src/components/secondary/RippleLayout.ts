// Layout for the ripple: the origin at the centre, every other item on a ring
// by causal distance, each in a slice of the circle inside its cause's slice so
// a cause's consequences fan out behind it. Rings are ellipses, wider than tall,
// because the chips are. Pure: no DOM, so it can be tested on its own.
import type { RippleKind, RippleNode } from "@/lib/types";

export const ASPECT = 1.25; // horizontal radius over vertical radius
const PAD = 8; // the least space between two chips
const FIRST_GAP = 36; // between the origin's chip and the first ring
const RING_GAP = 30; // between one ring's chips and the next ring's
const START = -Math.PI / 2; // the first beat sits at the top; the ripple runs clockwise

export const CHIP_SIZE: Record<RippleKind, { w: number; h: number }> = {
  origin: { w: 216, h: 84 },
  beat: { w: 172, h: 60 },
  page: { w: 152, h: 56 },
  post: { w: 140, h: 52 },
  meme: { w: 140, h: 52 },
  tiers: { w: 140, h: 52 },
  note: { w: 140, h: 52 },
  poll: { w: 140, h: 52 },
  spinoff: { w: 140, h: 52 },
  move: { w: 108, h: 40 },
  trend: { w: 116, h: 40 },
  replies: { w: 108, h: 30 },
};

export interface Placed {
  id: string;
  x: number; // centre, relative to the origin's centre
  y: number;
  w: number;
  h: number;
  ring: number;
}

export interface Edge {
  from: string;
  to: string;
  /** SVG path data from the cause's centre to the item's. */
  d: string;
}

export interface RippleLayout {
  placed: Map<string, Placed>;
  /** Vertical radius of each ring, from ring 1 out; the horizontal one is ASPECT times it. */
  rings: number[];
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const overlapX = (a: Placed, b: Placed) => (a.w + b.w) / 2 + PAD - Math.abs(a.x - b.x);
const overlapY = (a: Placed, b: Placed) => (a.h + b.h) / 2 + PAD - Math.abs(a.y - b.y);
export const overlaps = (a: Placed, b: Placed) => overlapX(a, b) > 0.01 && overlapY(a, b) > 0.01;

export function layoutRipple(nodes: RippleNode[]): RippleLayout {
  const placed = new Map<string, Placed>();
  const edges: Edge[] = [];
  if (!nodes.length) return { placed, rings: [], edges, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const origin = nodes[0];

  // ---- the tree the slices follow: every beat hangs from the origin
  const kids = new Map<string, RippleNode[]>();
  const parentOf = (n: RippleNode) => (n.kind === "beat" ? origin.id : n.cause);
  for (const n of nodes) {
    const p = n === origin ? null : parentOf(n);
    if (p == null || !byId.has(p)) continue;
    kids.set(p, [...(kids.get(p) ?? []), n]);
  }
  const weight = new Map<string, number>();
  const weigh = (n: RippleNode): number => {
    const own = kids.get(n.id) ?? [];
    // A slice is as wide as the leaves under it, plus a little for the item itself.
    const w = own.length ? own.reduce((sum, k) => sum + weigh(k), 0) + 0.35 : 1;
    weight.set(n.id, w);
    return w;
  };
  weigh(origin);

  // ---- desired angles: each child in its share of its parent's slice
  const want = new Map<string, number>();
  const slice = (n: RippleNode, from: number, to: number) => {
    want.set(n.id, (from + to) / 2);
    const own = kids.get(n.id) ?? [];
    const total = own.reduce((sum, k) => sum + weight.get(k.id)!, 0);
    let a = from;
    for (const k of own) {
      const span = ((to - from) * weight.get(k.id)!) / total;
      slice(k, a, a + span);
      a += span;
    }
  };
  // Turn the circle so the first beat's slice is centred on the top.
  const firstBeat = kids.get(origin.id)?.[0];
  const turn = firstBeat ? (Math.PI * weight.get(firstBeat.id)!) / weight.get(origin.id)! : 0;
  slice(origin, START - turn, START - turn + 2 * Math.PI);

  // ---- rings, from the inside out
  const size = (n: RippleNode) => CHIP_SIZE[n.kind] ?? CHIP_SIZE.post;
  const maxRing = Math.max(...nodes.map((n) => n.ring));
  const rings: number[] = [];
  placed.set(origin.id, { id: origin.id, x: 0, y: 0, ...size(origin), ring: 0 });
  let inner = size(origin).h;
  let r = 0;
  for (let k = 1; k <= maxRing; k++) {
    const onRing = nodes.filter((n) => n.ring === k).sort((a, b) => want.get(a.id)! - want.get(b.id)!);
    if (!onRing.length) continue;
    const outer = Math.max(...onRing.map((n) => size(n).h));
    // Rings are spaced for chips above and below each other; a chip to the side
    // that would touch one further in moves out along its own ray instead.
    r += (inner + outer) / 2 + (k === 1 ? FIRST_GAP : RING_GAP);
    r = spread(onRing, want, size, r);
    rings.push(r);
    inner = outer;
    const further = [...placed.values()];
    for (const n of onRing) {
      const a = want.get(n.id)!;
      const p: Placed = { id: n.id, x: 0, y: 0, ...size(n), ring: k };
      for (let rho = r; rho < r * 4; rho += 4) {
        p.x = ASPECT * rho * Math.cos(a);
        p.y = rho * Math.sin(a);
        if (!further.some((q) => overlaps(p, q))) break;
      }
      placed.set(n.id, p);
    }
  }
  separate([...placed.values()]);
  // Draw each ring where its chips ended up.
  rings.forEach((_, i) => {
    const radii = [...placed.values()]
      .filter((p) => p.ring === i + 1)
      .map((p) => Math.hypot(p.x / ASPECT, p.y))
      .sort((a, b) => a - b);
    if (radii.length) rings[i] = radii[Math.floor(radii.length / 2)];
  });

  // ---- lines from each cause
  for (const n of nodes) {
    if (n.cause == null) continue;
    const a = placed.get(n.cause);
    const b = placed.get(n.id);
    if (!a || !b) continue;
    edges.push({
      from: n.cause,
      to: n.id,
      d: n.kind === "beat" && a.ring === 1 ? arc(a, b, rings[0]) : curve(a, b),
    });
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed.values()) {
    minX = Math.min(minX, p.x - p.w / 2);
    maxX = Math.max(maxX, p.x + p.w / 2);
    minY = Math.min(minY, p.y - p.h / 2);
    maxY = Math.max(maxY, p.y + p.h / 2);
  }
  return { placed, rings, edges, bounds: { minX, minY, maxX, maxY } };
}

/** Space one ring's chips around it in order, widening the ring until they fit. Returns the radius used. */
function spread(
  onRing: RippleNode[],
  want: Map<string, number>,
  size: (n: RippleNode) => { w: number; h: number },
  r0: number,
): number {
  const desired = onRing.map((n) => want.get(n.id)!);
  let r = r0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const ang = [...desired];
    const at = (i: number): Placed => ({
      id: "", ring: 0, ...size(onRing[i]), x: ASPECT * r * Math.cos(ang[i]), y: r * Math.sin(ang[i]),
    });
    let clear = false;
    for (let pass = 0; pass < 600 && !clear; pass++) {
      clear = true;
      for (let i = 0; i < ang.length; i++) {
        const j = (i + 1) % ang.length;
        if (j === i) break;
        if (!overlaps(at(i), at(j))) continue;
        clear = false;
        const nudge = 0.004;
        ang[i] -= nudge;
        ang[j] += nudge;
      }
      // Stay in order: a chip pushed past its neighbour means the ring is too small.
      if (ang.length > 1 && ang[ang.length - 1] - ang[0] > 2 * Math.PI - 0.01) break;
    }
    if (clear) {
      onRing.forEach((n, i) => want.set(n.id, ang[i]));
      return r;
    }
    r *= 1.08;
  }
  return r;
}

/** Push apart any two chips that still overlap (across rings), along the shorter way out.
 *  The origin never moves; if chips still touch, the whole ripple is spaced out a little. */
function separate(all: Placed[]) {
  for (let round = 0; round < 30; round++) {
    for (let pass = 0; pass < 200; pass++) {
      let moved = false;
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          if (!overlaps(a, b)) continue;
          moved = true;
          // The outer chip gives way; the origin never does.
          const wa = a.ring === 0 ? 0 : a.ring > b.ring ? 0.75 : a.ring < b.ring ? 0.25 : 0.5;
          const wb = b.ring === 0 ? 0 : 1 - wa;
          const share = wa + wb || 1;
          const ox = overlapX(a, b);
          const oy = overlapY(a, b);
          if (ox < oy) {
            const s = Math.sign(b.x - a.x) || 1;
            a.x -= (s * ox * wa) / share;
            b.x += (s * ox * wb) / share;
          } else {
            const s = Math.sign(b.y - a.y) || 1;
            a.y -= (s * oy * wa) / share;
            b.y += (s * oy * wb) / share;
          }
        }
      }
      if (!moved) return;
    }
    for (const p of all) {
      p.x *= 1.06;
      p.y *= 1.06;
    }
  }
}

/** A curve that leaves the cause heading outwards and reaches the item from the inside. */
function curve(a: Placed, b: Placed): string {
  const dir = (p: Placed, fallback: Placed) => {
    const x = p.ring === 0 ? fallback.x : p.x;
    const y = p.ring === 0 ? fallback.y : p.y;
    const len = Math.hypot(x / ASPECT, y) || 1;
    return { x: x / len, y: y / len };
  };
  const da = dir(a, b);
  const db = dir(b, a);
  const reach = Math.hypot(b.x - a.x, b.y - a.y) * 0.35;
  const c1 = { x: a.x + da.x * reach, y: a.y + da.y * reach };
  const c2 = { x: b.x - db.x * reach, y: b.y - db.y * reach };
  return `M ${f(a.x)} ${f(a.y)} C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(b.x)} ${f(b.y)}`;
}

/** One beat to the next, clockwise along the first ring. */
function arc(a: Placed, b: Placed, r: number): string {
  const angle = (p: Placed) => Math.atan2(p.y, p.x / ASPECT);
  let sweep = angle(b) - angle(a);
  while (sweep <= 0) sweep += 2 * Math.PI;
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${f(a.x)} ${f(a.y)} A ${f(ASPECT * r)} ${f(r)} 0 ${large} 1 ${f(b.x)} ${f(b.y)}`;
}

const f = (n: number) => n.toFixed(1);
