"use client";
// Simulation controls under the Post button. Not part of X, so kept small and
// quiet: a status line, Pause / Resume, Skip a day, Save and Restore.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { bus, postJson, refreshMe } from "@/lib/client";
import type { SimAction, SimStatus } from "@/lib/types";

export function SimControls({ sim, onSim }: { sim: SimStatus | undefined; onSim: (s: SimStatus) => void }) {
  const [pending, setPending] = useState<SimAction | null>(null);

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

  if (!sim) return null;

  const busy = sim.busy || pending === "skip_day";
  const state = busy ? "Generating" : sim.running ? "Running" : "Paused";
  const dot = busy ? "bg-x-blue animate-pulse" : sim.running ? "bg-x-green" : "bg-x-dim";
  const btn =
    "flex items-center gap-1 rounded-full px-2 py-1 text-[12px] leading-4 text-x-dim transition-colors hover:bg-x-hover hover:text-x-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-x-dim";

  return (
    <div className="mb-2 flex w-full flex-col items-center xl:items-start">
      <div
        className="flex items-center gap-2 px-2 py-1 text-[12px] leading-4 text-x-dim xl:px-3"
        title={sim.error ? `${state} · ${sim.error}` : state}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="hidden xl:inline">{state}</span>
      </div>
      {sim.error ? (
        <div
          className="hidden px-3 pb-1 text-[12px] leading-4 text-x-red xl:line-clamp-2"
          title={sim.error}
        >
          {sim.error}
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-0.5 xl:flex-row xl:flex-wrap xl:px-1">
        <button
          type="button"
          className={btn}
          disabled={pending != null}
          onClick={() => void run(sim.running ? "pause" : "resume")}
          title={sim.running ? "Pause" : "Resume"}
        >
          <Icon name={sim.running ? "pause" : "play"} size={14} />
          <span className="hidden xl:inline">{sim.running ? "Pause" : "Resume"}</span>
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending != null}
          onClick={() => void run("skip_day")}
          title="Skip a day"
        >
          <Icon name="forward" size={14} />
          <span className="hidden xl:inline">Skip a day</span>
        </button>
        <button type="button" className={btn} disabled={pending != null} onClick={() => void run("save")}>
          Save
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending != null || !sim.hasSnapshot}
          onClick={() => void run("restore")}
        >
          Restore
        </button>
      </div>
    </div>
  );
}
