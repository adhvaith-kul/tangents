"use client";
// Simulation controls under the Post button. Not part of X, so they take one
// quiet line: a status dot and label that opens a menu with everything else
// (pause / resume, pace, skip a day, save, restore, and a link to the Story
// map, where "What if…" lives).
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { bus, postJson, refreshMe } from "@/lib/client";
import { PACES, type Pace, type SimAction, type SimStatus } from "@/lib/types";

const PACE_LABEL: Record<Pace, string> = { live: "Live", steady: "Steady", slow: "Slow" };
/** Why a running world is writing nothing new. */
const HOLD_LABEL = { unread: "Waiting for you to catch up", budget: "Daily limit reached" } as const;

function Row({
  icon,
  label,
  hint,
  disabled = false,
  onSelect,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={hint}
      onClick={onSelect}
      className="flex w-full items-center px-4 py-2.5 text-left text-[15px] font-bold leading-5 text-x-text transition-colors hover:bg-x-hover-soft disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="mr-3 flex h-[18px] w-[18px] shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/** The menu, drawn like X's dropdowns and kept inside the window. */
function Panel({ anchor, onClose, children }: { anchor: DOMRect; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.bottom + 4);

  useLayoutEffect(() => {
    const h = panel.current?.offsetHeight ?? 0;
    const next = Math.max(8, Math.min(anchor.bottom + 4, window.innerHeight - h - 8));
    if (next !== top) setTop(next);
  }, [anchor, top]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={panel}
        role="menu"
        style={{ top, left: Math.max(8, anchor.left) }}
        className="fixed z-50 w-[260px] overflow-hidden rounded-xl bg-[#141414] py-1 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_2px_rgba(0,0,0,0.35)]"
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export function SimControls({
  sim,
  onSim,
}: {
  sim: SimStatus | undefined;
  onSim: (s: SimStatus) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<SimAction | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const run = async (action: SimAction) => {
    setPending(action);
    try {
      const status = await postJson<SimStatus>("/api/sim", { action });
      onSim(status);
    } catch {
      // the next sidebar poll shows the real state
    } finally {
      setPending(null);
      if (action === "restore") void refreshMe();
      bus.emit("sim");
    }
  };

  const setPace = (pace: Pace) => {
    if (!sim || pace === sim.pace) return;
    onSim({ ...sim, pace });
    postJson<SimStatus>("/api/sim", { pace })
      .then(onSim)
      .catch(() => {
        // the next sidebar poll shows the real state
      });
  };

  if (!sim) return null;

  const busy = sim.busy || pending === "skip_day";
  const state = busy ? "Generating" : sim.running ? "Running" : "Paused";
  const held = sim.running && !busy && sim.hold ? HOLD_LABEL[sim.hold] : null;
  const dot = sim.error
    ? "bg-x-red"
    : busy
      ? "bg-x-blue animate-pulse"
      : held
        ? "bg-x-gold"
        : sim.running
          ? "bg-x-green"
          : "bg-x-dim";
  const summary = held ?? `${state} · ${PACE_LABEL[sim.pace]}`;
  const close = () => setAnchor(null);
  const act = (action: SimAction) => {
    close();
    void run(action);
  };

  return (
    <div className="flex w-full justify-center xl:justify-start">
      <button
        type="button"
        aria-label={`World controls: ${summary}`}
        aria-haspopup="menu"
        aria-expanded={anchor != null}
        title={sim.error ? `${summary} · ${sim.error}` : summary}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget.getBoundingClientRect())}
        className="flex h-6 items-center gap-2 rounded-full px-2 text-[13px] leading-4 text-x-dim transition-colors hover:bg-x-hover hover:text-x-text xl:px-3"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="hidden truncate xl:inline">{summary}</span>
        {sim.error ? <span className="hidden text-x-red xl:inline">· Problem</span> : null}
      </button>
      {anchor ? (
        <Panel anchor={anchor} onClose={close}>
          <div className="flex items-center gap-2 px-4 pb-2 pt-2.5 text-[13px] leading-4 text-x-dim">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
            <span>{summary}</span>
          </div>
          {sim.error ? (
            <div className="px-4 pb-2 text-[13px] leading-4 text-x-red" title={sim.error}>
              <span className="line-clamp-4">{sim.error}</span>
            </div>
          ) : null}
          <Row
            icon={<Icon name={sim.running ? "pause" : "play"} size={18} />}
            label={sim.running ? "Pause" : "Resume"}
            disabled={pending != null}
            onSelect={() => act(sim.running ? "pause" : "resume")}
          />
          <div className="mt-1 border-t border-x-border px-4 pb-1 pt-2.5 text-[13px] leading-4 text-x-dim">Pace</div>
          {PACES.map((p) => (
            <Row
              key={p}
              icon={p === sim.pace ? <Icon name="check" size={18} className="text-x-blue" /> : null}
              label={PACE_LABEL[p]}
              onSelect={() => setPace(p)}
            />
          ))}
          <div className="mt-1 border-t border-x-border pt-1" />
          <Row
            icon={<Icon name="forward" size={18} />}
            label="Skip a day"
            disabled={pending != null}
            onSelect={() => act("skip_day")}
          />
          <Row label="Save" disabled={pending != null} onSelect={() => act("save")} />
          <Row
            label="Restore"
            hint={sim.hasSnapshot ? undefined : "Nothing saved yet"}
            disabled={pending != null || !sim.hasSnapshot}
            onSelect={() => act("restore")}
          />
          <Row
            icon={
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
              </svg>
            }
            label="What if…"
            hint="On the Story map"
            onSelect={() => {
              close();
              router.push("/world");
            }}
          />
          <div className="mt-1 border-t border-x-border py-1">
            {[
              { label: "Pace and timeline settings", href: "/settings/timeline" },
              { label: "Usage", href: "/settings/usage" },
            ].map((l) => (
              <button
                key={l.href}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  router.push(l.href);
                }}
                className="block w-full px-4 py-2 text-left text-[13px] leading-4 text-x-dim transition-colors hover:bg-x-hover-soft hover:text-x-text"
              >
                {l.label}
              </button>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
