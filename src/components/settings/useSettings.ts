"use client";
// The settings, the pace and today's usage, with the actions that change them.
// Shared by the landing page and the category pages. Every change is applied
// optimistically, then saved.
import { useCallback, useRef } from "react";
import { bus, postJson, useApi } from "@/lib/client";
import { DEFAULT_SETTINGS, type Pace, type Settings, type SimStatus, type UsageSummary } from "@/lib/types";
import { DEFAULT_PACE, defaultsFor, type CategoryId } from "./model";

export function useSettings() {
  const { data: settings, setData, reload, error } = useApi<Settings>("/api/settings");
  const { data: sim, setData: setSim, reload: reloadSim } = useApi<SimStatus>("/api/sim");
  const { data: usage } = useApi<UsageSummary>("/api/usage");
  // The humour map as last changed here. Each change sends the whole map, so two
  // quick changes must build on each other, not on the same older copy.
  const styles = useRef<Settings["humourStyles"] | null>(null);

  const save = useCallback(
    (patch: Partial<Settings>) => {
      if (!settings) return;
      if (patch.humourStyles) styles.current = patch.humourStyles;
      setData({ ...settings, ...patch });
      postJson<Settings>("/api/settings", patch)
        // Rage bait re-ranks the timeline and X-ray relabels it: tell the screens that show them.
        .then(() => {
          if ("xray" in patch) bus.emit("settings");
          if ("rage" in patch) bus.emit("sim");
        })
        .catch(reload);
    },
    [settings, setData, reload],
  );

  const setHumour = useCallback(
    (style: keyof Settings["humourStyles"], value: 0 | 1 | 2) => {
      if (!settings) return;
      save({ humourStyles: { ...(styles.current ?? settings.humourStyles), [style]: value } });
    },
    [settings, save],
  );

  const changePace = useCallback(
    (pace: Pace) => {
      if (sim) setSim({ ...sim, pace });
      postJson<SimStatus>("/api/sim", { pace })
        .then((s) => {
          setSim(s);
          bus.emit("sim");
        })
        .catch(reloadSim);
    },
    [sim, setSim, reloadSim],
  );

  const resetAll = useCallback(() => {
    styles.current = null;
    setData({ ...DEFAULT_SETTINGS });
    postJson<Settings>("/api/settings", { reset: true }).catch(reload);
  }, [setData, reload]);

  /** Put one category back to its defaults; the timeline's pace goes back too. */
  const resetCategory = useCallback(
    (id: CategoryId) => {
      if (id === "tone") styles.current = null;
      save(defaultsFor(id));
      if (id === "timeline" && sim && sim.pace !== DEFAULT_PACE) changePace(DEFAULT_PACE);
    },
    [save, sim, changePace],
  );

  return { settings, sim, usage, error, save, setHumour, changePace, resetAll, resetCategory };
}
