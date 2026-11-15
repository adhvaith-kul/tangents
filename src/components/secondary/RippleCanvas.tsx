"use client";
// The ripple drawn and replayed. Chips are HTML on a stage that pans and zooms
// (drag, wheel, pinch); rings and lines are SVG on the same stage. The replay
// runs on requestAnimationFrame and writes styles straight to the elements, so
// React renders the picture once and not on every frame.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fullTime } from "@/lib/format";
import type { RippleNode } from "@/lib/types";
import { RippleChip } from "./RippleChip";
import { ASPECT, layoutRipple } from "./RippleLayout";
import { APPEAR_MS, CHIP_DELAY, LINE_MS, PULSE_MS, rippleTimeline } from "./RippleTimeline";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;
const FIT_FLOOR = 0.4; // a first view smaller than this is not readable; pan instead
const MARGIN = 20;
const BAR_H = 52; // the replay controls along the bottom

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const clamp01 = (x: number) => clamp(x, 0, 1);
const easeOut = (x: number) => 1 - (1 - x) ** 3;
/** Overshoots a little before settling, for the chips' pop. */
const easeBack = (x: number) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RippleCanvas({ nodes, footnote }: { nodes: RippleNode[]; footnote: string | null }) {
  const layout = useMemo(() => layoutRipple(nodes), [nodes]);
  const timeline = useMemo(() => rippleTimeline(nodes), [nodes]);
  const [reduced] = useState(prefersReducedMotion);
  const [playing, setPlaying] = useState(!reduced);
  const [ended, setEnded] = useState(reduced);
  const tau = useRef(reduced ? timeline.duration : 0);

  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const scrub = useRef<HTMLInputElement>(null);
  const els = useRef({
    chips: new Map<string, HTMLElement>(),
    counts: new Map<string, HTMLElement>(),
    lines: new Map<string, SVGPathElement>(),
    guides: new Map<number, SVGEllipseElement>(),
    pulses: new Map<number, SVGEllipseElement>(),
  });

  // ---- the replay

  const draw = useCallback(
    (t: number) => {
      const { chips, counts, lines, guides, pulses } = els.current;
      const done = t >= timeline.duration;
      const now = timeline.clockAt(t);
      for (const n of nodes) {
        const s0 = timeline.start.get(n.id) ?? 0;
        const appear = done ? 1 : clamp01((t - s0 - (n.cause == null ? 0 : CHIP_DELAY)) / APPEAR_MS);
        const chip = chips.get(n.id);
        if (chip) {
          chip.style.opacity = String(easeOut(appear));
          chip.style.transform = `scale(${0.55 + 0.45 * easeBack(appear)})`;
          chip.style.visibility = appear > 0 ? "visible" : "hidden";
        }
        const line = lines.get(n.id);
        // As an attribute: a unitless stroke-dashoffset is always valid there.
        if (line) line.setAttribute("stroke-dashoffset", (1 - easeOut(done ? 1 : clamp01((t - s0) / LINE_MS))).toFixed(3));
        const count = counts.get(n.id);
        if (count && n.arrivals) {
          const k = done ? n.arrivals.length : n.arrivals.filter((a) => a <= now).length;
          count.textContent = `+${Math.max(1, k)} replies`;
        }
      }
      layout.rings.forEach((_, i) => {
        const at = timeline.ringStart.get(i + 1) ?? Infinity;
        const guide = guides.get(i + 1);
        if (guide) guide.style.opacity = String(done ? 1 : clamp01((t - at) / 500));
        const pulse = pulses.get(i + 1);
        if (!pulse) return;
        const p = (t - at) / PULSE_MS;
        const on = !reduced && !done && p > 0 && p < 1;
        pulse.style.opacity = on ? String(0.7 * (1 - p)) : "0";
        pulse.setAttribute("transform", `scale(${on ? 0.82 + 0.3 * easeOut(p) : 1})`);
      });
      if (clock.current) clock.current.textContent = fullTime(now);
      if (scrub.current) scrub.current.value = String(Math.round((clamp(t, 0, timeline.duration) / timeline.duration) * 1000));
    },
    [nodes, layout, timeline, reduced],
  );

  useLayoutEffect(() => draw(tau.current), [draw]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function step(at) {
      tau.current += Math.max(0, at - last);
      last = at;
      draw(tau.current);
      if (tau.current >= timeline.duration) {
        setPlaying(false);
        setEnded(true);
        return;
      }
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, draw, timeline]);

  const play = () => {
    if (playing) return setPlaying(false);
    if (ended || tau.current >= timeline.duration) tau.current = 0;
    setEnded(false);
    setPlaying(true);
  };

  // ---- pan and zoom

  const view = useRef({ x: 0, y: 0, s: 1 });
  const touched = useRef(false);
  const apply = () => {
    const { x, y, s } = view.current;
    if (stage.current) stage.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  };
  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const { minX, minY, maxX, maxY } = layout.bounds;
    const w = el.clientWidth;
    const h = el.clientHeight - BAR_H;
    const s = clamp(Math.min(1, (w - 2 * MARGIN) / (maxX - minX || 1), (h - 2 * MARGIN) / (maxY - minY || 1)), FIT_FLOOR, 1);
    view.current = { s, x: w / 2 - ((minX + maxX) / 2) * s, y: h / 2 - ((minY + maxY) / 2) * s };
    const { x, y } = view.current;
    if (stage.current) stage.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, [layout]);

  useLayoutEffect(() => {
    fit();
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => !touched.current && fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const zoomAt = (px: number, py: number, factor: number) => {
    const v = view.current;
    const s = clamp(v.s * factor, MIN_SCALE, MAX_SCALE);
    const f = s / v.s;
    view.current = { s, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    touched.current = true;
    apply();
  };

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // A non-passive listener, so the page does not scroll while zooming.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, x: 0, y: 0 });
  const local = (e: React.PointerEvent) => {
    const r = viewport.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) drag.current = { moved: false, x: p.x, y: p.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      // The button was let go outside the canvas.
      pointers.current.delete(e.pointerId);
      return;
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      // Pinch: zoom by the change in distance, about the point between the fingers.
      const other = [...pointers.current].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
      const after = Math.hypot(p.x - other.x, p.y - other.y);
      drag.current.moved = true;
      zoomAt((p.x + other.x) / 2, (p.y + other.y) / 2, after / before);
      return;
    }
    if (!drag.current.moved) {
      if (Math.hypot(p.x - drag.current.x, p.y - drag.current.y) < 4) return;
      // Only now, so a plain click still reaches the chip under the pointer.
      drag.current.moved = true;
      viewport.current?.setPointerCapture(e.pointerId);
    }
    view.current.x += p.x - prev.x;
    view.current.y += p.y - prev.y;
    touched.current = true;
    apply();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  // ---- the picture, rendered once per ripple

  const picture = useMemo(() => {
    const { chips, counts, lines, guides, pulses } = els.current;
    const keep =
      <K, T>(map: Map<K, T>, key: K) =>
      (el: T | null) => {
        if (el) map.set(key, el);
        else map.delete(key);
      };
    const hidden = reduced ? undefined : ("hidden" as const);
    const beatLine = new Set(nodes.filter((n) => n.kind === "beat").map((n) => n.id));
    const moveOf = new Map(nodes.filter((n) => n.kind === "move").map((n) => [n.id, (n.pct ?? 0) >= 0]));
    return (
      <>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          {layout.rings.map((r, i) => (
            <g key={i}>
              <ellipse
                ref={keep(guides, i + 1)}
                rx={ASPECT * r}
                ry={r}
                fill="none"
                stroke="var(--color-x-border)"
                strokeDasharray="3 7"
                style={{ opacity: reduced ? 1 : 0 }}
              />
              <ellipse
                ref={keep(pulses, i + 1)}
                rx={ASPECT * r}
                ry={r}
                fill="none"
                stroke="var(--color-x-blue)"
                strokeWidth={2}
                style={{ opacity: 0 }}
              />
            </g>
          ))}
          {layout.edges.map((e) => {
            const up = moveOf.get(e.to);
            const colour = up == null ? "var(--color-x-blue)" : up ? "var(--color-x-green)" : "var(--color-x-red)";
            return (
              <path
                key={e.to}
                ref={keep(lines, e.to)}
                d={e.d}
                pathLength={1}
                fill="none"
                stroke={colour}
                strokeOpacity={beatLine.has(e.to) ? 0.9 : 0.5}
                strokeWidth={beatLine.has(e.to) ? 2 : 1.25}
                strokeDasharray="1 1"
                strokeDashoffset={reduced ? 0 : 1}
              />
            );
          })}
        </svg>
        {nodes.map((n) => {
          const p = layout.placed.get(n.id);
          if (!p) return null;
          return (
            <RippleChip
              key={n.id}
              node={n}
              elRef={keep(chips, n.id)}
              countRef={keep(counts, n.id)}
              style={{ left: p.x - p.w / 2, top: p.y - p.h / 2, width: p.w, height: p.h, visibility: hidden }}
            />
          );
        })}
      </>
    );
  }, [nodes, layout, reduced]);

  return (
    <div
      ref={viewport}
      className="relative h-[calc(100dvh-53px)] touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        // The end of a drag is not a click on the chip under it.
        if (!drag.current.moved) return;
        e.preventDefault();
        e.stopPropagation();
        drag.current.moved = false;
      }}
    >
      <div ref={stage} className="absolute left-0 top-0 origin-top-left">
        {picture}
      </div>

      <button
        type="button"
        onClick={() => {
          touched.current = false;
          fit();
        }}
        className="absolute right-3 top-3 h-8 rounded-full border border-x-border bg-black/70 px-3 text-[13px] font-bold text-x-text backdrop-blur-md transition-colors hover:bg-x-hover"
      >
        Reset view
      </button>

      <div
        className="absolute inset-x-0 bottom-0 border-t border-x-border bg-black/80 backdrop-blur-md"
        style={{ height: BAR_H }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {footnote ? (
          <div className="absolute -top-7 left-3 rounded-full bg-black/70 px-2 py-0.5 text-[12px] leading-4 text-x-dim">
            {footnote}
          </div>
        ) : null}
        <div className="flex h-full items-center gap-3 px-4">
          <button
            type="button"
            onClick={play}
            className="h-8 w-[76px] shrink-0 rounded-full bg-x-button text-[14px] font-bold text-black transition-colors hover:bg-x-button-hover"
          >
            {playing ? "Pause" : ended ? "Replay" : "Play"}
          </button>
          <input
            ref={scrub}
            type="range"
            min={0}
            max={1000}
            defaultValue={reduced ? 1000 : 0}
            aria-label="Replay position"
            onChange={(e) => {
              setPlaying(false);
              tau.current = (Number(e.target.value) / 1000) * timeline.duration;
              setEnded(tau.current >= timeline.duration);
              draw(tau.current);
            }}
            className="min-w-0 flex-1 accent-x-blue"
          />
          <span ref={clock} className="shrink-0 text-[13px] tabular-nums text-x-dim" />
        </div>
      </div>
    </div>
  );
}
