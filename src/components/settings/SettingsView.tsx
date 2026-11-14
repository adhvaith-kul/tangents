"use client";
// The Settings screen body. Every change is applied optimistically, then saved.
import { useState } from "react";
import { Spinner } from "@/components/core/Spinner";
import { bus, postJson, useApi } from "@/lib/client";
import {
  BUDGETS, DEFAULT_SETTINGS, PACES, type Level, type Pace, type Settings, type SimStatus, type UsageSummary,
} from "@/lib/types";
import { Choice, LevelControl, Row, Section } from "./controls";
import { ResetTasteDialog } from "./ResetTasteDialog";

const PRESET_KEYS = ["satire", "conflict", "shitposting", "reality", "noise", "profanity", "media"] as const;

const PRESETS: { name: string; values: Pick<Settings, (typeof PRESET_KEYS)[number]> }[] = [
  { name: "Newsroom", values: { satire: 0, conflict: 1, shitposting: 0, reality: 4, noise: 0, profanity: "off", media: 0 } },
  {
    name: "Balanced",
    values: Object.fromEntries(PRESET_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])) as Pick<Settings, (typeof PRESET_KEYS)[number]>,
  },
  { name: "Chaos", values: { satire: 4, conflict: 4, shitposting: 4, reality: 1, noise: 4, profanity: "full", media: 2 } },
];

const PACE_HINT: Record<Pace, string> = {
  live: "A story beat every 40 seconds. For demos.",
  steady: "A story beat about every two minutes, everyday posts in between.",
  slow: "A story beat about every six minutes.",
};

const quiet =
  "rounded-full px-4 py-2 text-[15px] font-bold leading-5 transition-colors hover:bg-x-hover";

const USAGE_HINT: Record<Settings["usage"], string> = {
  0: "Fewer replies under each story and shorter articles. The world waits sooner when you stop reading.",
  1: "The standard amount of writing per story.",
  2: "More replies under each story, and the world keeps writing further ahead of you.",
};

/** 1,234,567 -> "1.2M"; 45,300 -> "45K". */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function SettingsView() {
  const { data: settings, setData, reload, error } = useApi<Settings>("/api/settings");
  const { data: sim, setData: setSim, reload: reloadSim } = useApi<SimStatus>("/api/sim");
  const { data: usage } = useApi<UsageSummary>("/api/usage");
  const [confirming, setConfirming] = useState(false);
  const [learnedCleared, setLearnedCleared] = useState(false);

  if (!settings) {
    return (
      <div className="flex justify-center p-8 text-[15px] text-x-dim">
        {error ? "Settings could not be loaded." : <Spinner />}
      </div>
    );
  }

  const save = (patch: Partial<Settings>) => {
    setData({ ...settings, ...patch });
    postJson<Settings>("/api/settings", patch).catch(reload);
  };
  const level = (key: keyof Settings, label: string, low: string, high: string, description?: string) => (
    <Row label={label} description={description}>
      <LevelControl
        label={label}
        value={settings[key] as number}
        low={low}
        high={high}
        onChange={(v) => save({ [key]: v as Level } as Partial<Settings>)}
      />
    </Row>
  );
  const activePreset = PRESETS.find((p) => PRESET_KEYS.every((k) => settings[k] === p.values[k]))?.name;

  const changePace = (pace: Pace) => {
    if (sim) setSim({ ...sim, pace });
    postJson<SimStatus>("/api/sim", { pace })
      .then((s) => {
        setSim(s);
        bus.emit("sim");
      })
      .catch(reloadSim);
  };

  const resetAll = () => {
    setData({ ...DEFAULT_SETTINGS });
    postJson<Settings>("/api/settings", { reset: true }).catch(reload);
  };

  const resetTaste = () => {
    setConfirming(false);
    postJson<Settings>("/api/settings", { resetTaste: true })
      .then(() => setLearnedCleared(true))
      .catch(() => {});
  };

  return (
    <div>
      <Section title="Presets">
        <div className="flex gap-2 px-4 pb-4 pt-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={activePreset === p.name}
              onClick={() => save(p.values)}
              className={`h-9 flex-1 rounded-full border text-[15px] font-bold leading-5 transition-colors ${activePreset === p.name ? "border-x-blue bg-x-blue text-white" : "border-x-border text-x-text hover:bg-x-hover"}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tone">
        {level("satire", "Satire", "Close to the news", "Heightened")}
        {level("conflict", "Conflict", "Calm", "Combative")}
        {level("shitposting", "Shitposting", "Rare", "Constant")}
      </Section>

      <Section title="Reality">
        {level(
          "reality",
          "Follow the real news",
          "Let the world drift",
          "Stay close to real events",
          "How much new real-world headlines steer the timeline once it has its own history.",
        )}
      </Section>

      <Section title="Subjects">
        {level("tech", "Technology and business", "Off", "Lots")}
        {level("pop", "Pop culture", "Off", "Lots", "Celebrities and fashion, film and TV, music, gaming and internet culture.")}
        {level("politics", "Politics", "Off", "Lots")}
        {level("sports", "Sports", "Off", "Lots")}
      </Section>

      <Section title="Replies">
        {level("noise", "Trolls and bots", "Few", "Many")}
        <Row label="Profanity" inline>
          <Choice
            label="Profanity"
            value={settings.profanity}
            onChange={(v) => save({ profanity: v })}
            options={[
              { value: "off", label: "Off" },
              { value: "mild", label: "Mild" },
              { value: "full", label: "In character" },
            ]}
          />
        </Row>
        <Row label="GIFs and memes" inline>
          <Choice
            label="GIFs and memes"
            value={settings.media}
            onChange={(v) => save({ media: v as Settings["media"] })}
            options={[
              { value: 0, label: "None" },
              { value: 1, label: "Some" },
              { value: 2, label: "Lots" },
            ]}
          />
        </Row>
      </Section>

      <Section title="You">
        {level("visibility", "How often famous accounts engage with you", "Never", "Often")}
        <Row
          label="Personalisation"
          description="How strongly the timeline and the stories follow what you engage with."
        >
          <Choice
            label="Personalisation"
            value={settings.personalisation}
            onChange={(v) => save({ personalisation: v })}
            options={[
              { value: "off", label: "Off" },
              { value: "light", label: "Light" },
              { value: "strong", label: "Strong" },
            ]}
          />
        </Row>
        <div className="px-4 pb-4 pt-1">
          <button type="button" onClick={() => setConfirming(true)} className={`${quiet} -ml-4 text-x-red`}>
            Reset what the timeline has learned
          </button>
          {learnedCleared ? <span className="text-[13px] text-x-dim">Done.</span> : null}
        </div>
      </Section>

      <Section title="Pace">
        <Row label="Pace" description={sim ? PACE_HINT[sim.pace] : undefined}>
          {sim ? (
            <Choice
              label="Pace"
              value={sim.pace}
              onChange={changePace}
              options={PACES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
            />
          ) : null}
        </Row>
      </Section>

      <Section title="Usage">
        <Row label="How much the world writes" description={USAGE_HINT[settings.usage]}>
          <Choice
            label="How much the world writes"
            value={settings.usage}
            onChange={(v) => save({ usage: v as Settings["usage"] })}
            options={[
              { value: 0, label: "Saver" },
              { value: 1, label: "Balanced" },
              { value: 2, label: "Full" },
            ]}
          />
        </Row>
        <Row
          label="Daily limit"
          description="In tokens. Once today's total passes it, the world stops moving on its own until tomorrow. Replies to your own posts still arrive."
        >
          <Choice
            label="Daily limit"
            value={settings.budget}
            onChange={(v) => save({ budget: v })}
            options={BUDGETS.map((b) => ({ value: b, label: b === 0 ? "None" : compact(b * 1000) }))}
          />
        </Row>
        <div className="px-4 pb-4 pt-1 text-[13px] text-x-dim">
          {usage
            ? `Today: ${compact(usage.inputTokens + usage.outputTokens)} tokens in ${usage.calls} model ${usage.calls === 1 ? "call" : "calls"} (${compact(usage.inputTokens)} read, ${compact(usage.outputTokens)} written). Last hour: ${compact(usage.lastHourTokens)}.`
            : "Today: …"}
          {sim?.hold === "budget" ? " The daily limit has been reached." : null}
          {sim?.hold === "unread" ? " The world is waiting for you to catch up on the timeline." : null}
        </div>
      </Section>

      <div className="px-4 py-4">
        <button type="button" onClick={resetAll} className={`${quiet} -ml-4 text-x-dim hover:text-x-text`}>
          Reset all settings
        </button>
      </div>

      {confirming ? <ResetTasteDialog onConfirm={resetTaste} onCancel={() => setConfirming(false)} /> : null}
    </div>
  );
}
