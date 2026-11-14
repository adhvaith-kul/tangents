"use client";
// The story map: every story the world has written, newest first, drawn like a
// revision history. Each storyline runs down its own coloured lane; a spin-off
// branches from the lane of the story it came out of. It is also where the
// reader steers: "What if…" starts a story or adds to one, "Wrap up" ends one.
import { Fragment, useMemo, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/core/EmptyState";
import { toast } from "@/components/core/toast";
import { errorText } from "@/components/extras/errorText";
import { Spinner } from "@/components/secondary/Spinner";
import { bus, postJson, simNow, useApi, useSimNow } from "@/lib/client";
import type { Domain, SimStatus, StoryMap as StoryMapData, StoryMapBeat, StoryMapStoryline } from "@/lib/types";
import { provenanceSummary } from "./StoryMapBackground";
import { layoutStoryMap } from "./StoryMapLayout";
import { GutterLines, PendingRow, StoryMapRow } from "./StoryMapRow";
import { WhatIfBar, type Steer, type Submit } from "./StoryMapSteer";

type Subject = "all" | Exclude<Domain, "crossover">;

const SUBJECTS: { key: Subject; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tech", label: "Technology" },
  { key: "pop", label: "Pop culture" },
  { key: "politics", label: "Politics" },
  { key: "sports", label: "Sports" },
];
const MAJOR_HEAT = 6;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;
const PENDING_TTL = 4 * 60_000; // a request that has produced nothing by then is dropped from view

// ---- requests the world has accepted and not yet written. Kept outside the
// component so they are still there after a visit to the Details tab.

interface Pending {
  key: number;
  steer: Steer;
  since: number; // simulation ms
  /** Beats already on the map when the request was made. */
  seen: Set<string>;
}

let pendingStore: Pending[] = [];
let pendingKey = 0;
const pendingSubs = new Set<() => void>();
const subscribePending = (fn: () => void) => {
  pendingSubs.add(fn);
  return () => void pendingSubs.delete(fn);
};
const getPending = () => pendingStore;
function setPending(next: Pending[]) {
  pendingStore = next;
  pendingSubs.forEach((fn) => fn());
}

/** Has the beat this request asked for appeared? */
function arrived(p: Pending, all: Pending[], data: StoryMapData): boolean {
  const fresh = data.beats.filter((b) => !p.seen.has(b.id));
  if (!fresh.length) return false;
  const sid = p.steer.storylineId;
  if (p.steer.kind === "wrap") return fresh.some((b) => b.storylineId === sid);
  const parentOf = new Map(data.storylines.map((s) => [s.id, s.parentId]));
  if (sid != null) {
    // The next development of that story, a spin-off of it, or a story of its own.
    return fresh.some((b) => b.seeded && (b.storylineId === sid || parentOf.get(b.storylineId) === sid || b.first));
  }
  const spoken = new Set(all.flatMap((q) => (q !== p && q.steer.storylineId != null ? [q.steer.storylineId] : [])));
  return fresh.some((b) => b.seeded && (b.first || !spoken.has(b.storylineId)));
}

const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Today", "Yesterday", then "Nov 12" (with the year once it differs). */
function dayLabel(t: number, now: number): string {
  const days = Math.round((dayStart(now) - dayStart(t)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(t);
  const year = d.getFullYear() === new Date(now).getFullYear() ? "" : `, ${d.getFullYear()}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${year}`;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-8 shrink-0 rounded-full border px-3 text-[14px] font-bold leading-4 transition-colors ${
        on ? "border-x-button bg-x-button text-black" : "border-x-border text-x-text hover:bg-x-hover"
      }`}
    >
      {children}
    </button>
  );
}

export function StoryMap() {
  const { data, error } = useApi<StoryMapData>("/api/storymap", { refreshMs: 5000 });
  const now = useSimNow();
  const pending = useSyncExternalStore(subscribePending, getPending, getPending);
  const [subject, setSubject] = useState<Subject>("all");
  const [majorOnly, setMajorOnly] = useState(false);
  // The story being followed, and the row its "How this story came about" panel sits under.
  const [selected, setSelected] = useState<{ storylineId: number; rowId: string } | null>(null);

  const view = useMemo(() => {
    if (!data) return null;
    const live = pending.filter((p) => now - p.since < PENDING_TTL && !arrived(p, pending, data));
    // Each waiting request is a row at the top, in its storyline's lane or a lane of its own.
    const waiting: StoryMapBeat[] = live.map((p) => ({
      id: `p${p.key}`, storylineId: p.steer.storylineId ?? -p.key, kind: "advance", first: false, seeded: true,
      provenance: "yours",
      summary: p.steer.kind === "wrap" ? "Bringing this story to a close." : p.steer.text,
      heat: 5, createdAt: p.since, postId: null, page: null, participants: [], moves: [],
    }));
    const storylines: StoryMapStoryline[] = [
      ...data.storylines,
      ...live.flatMap((p): StoryMapStoryline[] =>
        p.steer.storylineId == null
          ? [{
              id: -p.key, parentId: null, title: "A new story", domain: "crossover", dormant: false,
              origin: { kind: "whatif", text: null, source: null }, provenance: "yours",
              background: { started: { kind: "whatif", text: null }, parent: null, spinoffs: [], drewOn: [], facts: [] },
            }]
          : [],
      ),
    ];
    const byId = new Map(storylines.map((s) => [s.id, s]));
    const beats = data.beats.filter((b) => {
      const s = byId.get(b.storylineId);
      if (!s) return false;
      // A crossover belongs to every subject.
      if (subject !== "all" && s.domain !== subject && s.domain !== "crossover") return false;
      return !majorOnly || b.heat >= MAJOR_HEAT;
    });
    const rows = [...waiting, ...beats];
    return { byId, rows, waiting: waiting.length, layout: layoutStoryMap(rows, storylines) };
  }, [data, pending, now, subject, majorOnly]);

  if (!data || !view) {
    return error ? (
      <div className="p-8 text-center text-[15px] text-x-dim">The story map could not be loaded.</div>
    ) : (
      <Spinner />
    );
  }
  if (data.beats.length === 0 && view.waiting === 0) {
    return (
      <EmptyState
        title="Nothing has happened yet"
        body="When the world starts making news, every story will show up here in the order it broke, along with what it led to."
      />
    );
  }

  const submit: Submit = async (steer) => {
    const body =
      steer.kind === "wrap"
        ? { wrap: steer.storylineId }
        : steer.storylineId == null
          ? { whatIf: steer.text }
          : { whatIf: steer.text, storylineId: steer.storylineId };
    try {
      await postJson<SimStatus>("/api/sim", body);
    } catch (e) {
      return errorText(e);
    }
    const t = simNow();
    const still = pendingStore.filter((p) => t - p.since < PENDING_TTL && !arrived(p, pendingStore, data));
    setPending([{ key: ++pendingKey, steer, since: t, seen: new Set(data.beats.map((b) => b.id)) }, ...still]);
    bus.emit("sim");
    toast(steer.kind === "wrap" ? "Wrapping it up. Watch the timeline." : "It’s happening. Watch the timeline.");
    return null;
  };

  const { byId, rows, waiting, layout } = view;
  // A filter can hide the story being followed: stop following it then.
  const following = selected != null && rows.some((b) => b.storylineId === selected.storylineId) ? selected.storylineId : null;
  // The panel's row can be filtered away too: fall back to the story's newest row.
  const anchor =
    following == null
      ? null
      : (rows.find((b, i) => i >= waiting && b.id === selected?.rowId) ?? rows.find((b, i) => i >= waiting && b.storylineId === following))?.id ?? null;
  /** Follow another story (from the panel) and bring its newest beat into view. */
  const jump = (storylineId: number) => {
    const target = data.beats.find((b) => b.storylineId === storylineId);
    if (!target) return;
    if (!rows.some((b) => b.id === target.id)) {
      setSubject("all");
      setMajorOnly(false);
    }
    setSelected({ storylineId, rowId: target.id });
    // Wait for the row to be on screen with its panel open.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.getElementById(`beat-${target.id}`)?.scrollIntoView({ block: "start", behavior: "smooth" })),
    );
  };
  return (
    <>
      <WhatIfBar submit={submit} />
      <div className="flex items-center gap-2 overflow-x-auto border-b border-x-border px-4 py-3">
        {SUBJECTS.map((s) => (
          <Chip key={s.key} on={subject === s.key} onClick={() => setSubject(s.key)}>
            {s.label}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-x-border" aria-hidden />
        <Chip on={majorOnly} onClick={() => setMajorOnly((v) => !v)}>
          Major only
        </Chip>
      </div>
      <div className="border-b border-x-border px-4 py-2 text-[13px] leading-4 text-x-dim">
        {provenanceSummary(data.storylines)}
      </div>
      {rows.length === 0 ? (
        <div className="px-8 py-10 text-center text-[15px] text-x-dim">No stories match these filters.</div>
      ) : (
        rows.map((b, i) => {
          const storyline = byId.get(b.storylineId);
          if (i < waiting) {
            return (
              <PendingRow
                key={b.id}
                layout={layout.rows[i]}
                lanes={layout.lanes}
                title={storyline?.title ?? "A new story"}
                text={b.summary}
                selected={following}
              />
            );
          }
          const newDay = i === waiting || dayStart(rows[i - 1].createdAt) !== dayStart(b.createdAt);
          return (
            <Fragment key={b.id}>
              {newDay ? (
                <div className="flex border-b border-x-border bg-x-card/60">
                  <GutterLines lines={i === 0 ? [] : layout.between(i)} lanes={layout.lanes} selected={following} />
                  <div className="py-2 text-[13px] font-bold leading-4 text-x-dim">{dayLabel(b.createdAt, now)}</div>
                </div>
              ) : null}
              <StoryMapRow
                beat={b}
                storyline={storyline!}
                layout={layout.rows[i]}
                lanes={layout.lanes}
                selected={following}
                expanded={anchor === b.id}
                onSelect={(storylineId, rowId) =>
                  setSelected(anchor === rowId ? null : { storylineId, rowId })
                }
                onJump={jump}
                submit={submit}
              />
            </Fragment>
          );
        })
      )}
    </>
  );
}
