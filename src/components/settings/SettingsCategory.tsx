"use client";
// One Settings category: its controls, and a way to put just this page back to
// the defaults. A search result arrives as ?focus=<control>: the page scrolls
// to that control and marks it for a moment.
import Link from "next/link";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Spinner } from "@/components/core/Spinner";
import { postJson } from "@/lib/client";
import { SUBJECTS } from "@/lib/subjects";
import { ARC_KINDS, BUDGETS, HUMOUR_STYLES, PACES, type Level, type Settings } from "@/lib/types";
import { Choice, LevelControl, Row } from "./controls";
import {
  CATEGORIES, ENTRIES, HUMOUR, MAJOR_KINDS, PACE_HINT, USAGE_HINT, compact, isChanged, type CategoryId,
} from "./model";
import { ResetTasteDialog } from "./ResetTasteDialog";
import { SavedWorlds } from "./SavedWorlds";
import { useSettings } from "./useSettings";

const quiet =
  "rounded-full px-4 py-2 text-[15px] font-bold leading-5 transition-colors hover:bg-x-hover focus-visible:outline-2 focus-visible:outline-x-blue";

const describe = (id: string) => ENTRIES.find((e) => e.id === id)?.description;
const labelOf = (id: string) => ENTRIES.find((e) => e.id === id)?.label ?? id;

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="px-4 pb-1 pt-4 text-[20px] font-extrabold leading-6 text-x-text">{children}</h3>;
}

export function SettingsCategory({ id, focus }: { id: CategoryId; focus: string | null }) {
  const { settings, sim, usage, error, save, setHumour, changePace, resetCategory } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const [learnedCleared, setLearnedCleared] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  const ready = settings != null;

  // Jump to the control a search result pointed at, once the page has rendered.
  useEffect(() => {
    if (!ready || !focus) return;
    const el = document.getElementById(focus);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    const on = window.setTimeout(() => setLit(focus), 0);
    const off = window.setTimeout(() => setLit(null), 1800);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [ready, focus]);

  if (!settings) {
    return (
      <div className="flex justify-center p-8 text-[15px] text-x-dim">
        {error ? "Settings could not be loaded." : <Spinner />}
      </div>
    );
  }

  const category = CATEGORIES.find((c) => c.id === id)!;

  const level = (key: keyof Settings, low: string, high: string) => (
    <Row id={key} lit={lit === key} label={labelOf(key)} description={describe(key)}>
      <LevelControl
        label={labelOf(key)}
        value={settings[key] as number}
        low={low}
        high={high}
        onChange={(v) => save({ [key]: v as Level } as Partial<Settings>)}
      />
    </Row>
  );

  const onOff = (id: string, label: string, value: boolean, onChange: (v: boolean) => void, description = describe(id)) => (
    <Row key={id} id={id} lit={lit === id} label={label} description={description} inline>
      <Choice
        label={label}
        value={value ? 1 : 0}
        onChange={(v) => onChange(v === 1)}
        options={[
          { value: 0, label: "Off" },
          { value: 1, label: "On" },
        ]}
      />
    </Row>
  );

  const resetTaste = () => {
    setConfirming(false);
    postJson<Settings>("/api/settings", { resetTaste: true })
      .then(() => setLearnedCleared(true))
      .catch(() => {});
  };

  let body: ReactNode = null;
  switch (id) {
    case "timeline":
      body = (
        <>
          <Heading>Subjects</Heading>
          {SUBJECTS.map((k) => <Fragment key={k}>{level(k, "Off", "Lots")}</Fragment>)}
          <Heading>Reality</Heading>
          {level("reality", "Let the world drift", "Stay close to real events")}
          <Heading>Pace</Heading>
          <Row id="pace" lit={lit === "pace"} label="Pace" description={sim ? PACE_HINT[sim.pace] : describe("pace")}>
            {sim ? (
              <Choice
                label="Pace"
                value={sim.pace}
                onChange={changePace}
                options={PACES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
              />
            ) : null}
          </Row>
        </>
      );
      break;
    case "tone":
      body = (
        <>
          <Heading>Seeing through it</Heading>
          {onOff("rage", labelOf("rage"), settings.rage, (v) => save({ rage: v }))}
          {onOff("xray", labelOf("xray"), settings.xray, (v) => save({ xray: v }))}
          <Heading>Tone</Heading>
          {level("satire", "Close to the news", "Heightened")}
          {level("conflict", "Calm", "Combative")}
          <Row id="profanity" lit={lit === "profanity"} label="Profanity" description={describe("profanity")}>
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
          <Heading>Humour</Heading>
          <Row id="shitposting" lit={lit === "shitposting"} label="How much" description={describe("shitposting")}>
            <LevelControl
              label="How much humour"
              value={settings.shitposting}
              low="Rare"
              high="Constant"
              onChange={(v) => save({ shitposting: v as Level })}
            />
          </Row>
          <div
            id="humour-kinds"
            className={`scroll-mt-[64px] px-4 pb-1 pt-3 transition-colors duration-700 ${lit === "humour-kinds" ? "bg-x-blue/15" : ""}`}
          >
            <div className="text-[15px] font-bold leading-5 text-x-text">Kinds of humour</div>
            <div className="text-[13px] leading-4 text-x-dim">{describe("humour-kinds")}</div>
          </div>
          {HUMOUR_STYLES.map((style) => (
            <Row
              key={style}
              id={`humour-${style}`}
              lit={lit === `humour-${style}`}
              label={HUMOUR[style].label}
              description={HUMOUR[style].example}
              inline
            >
              <Choice
                label={HUMOUR[style].label}
                value={settings.humourStyles[style]}
                onChange={(v) => setHumour(style, v)}
                options={[
                  { value: 0, label: "Never" },
                  { value: 1, label: "Some" },
                  { value: 2, label: "More" },
                ]}
              />
            </Row>
          ))}
          <div className="px-4 pb-4 pt-1 text-[13px] leading-4 text-x-dim">
            Famous accounts keep their own voice. This shapes the replies, and what you like teaches it the rest.
          </div>
        </>
      );
      break;
    case "replies":
      body = (
        <>
          {level("noise", "Few", "Many")}
          <Row id="media" lit={lit === "media"} label="GIFs and memes" description={describe("media")}>
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
        </>
      );
      break;
    case "personalisation":
      body = (
        <>
          <Row
            id="personalisation"
            lit={lit === "personalisation"}
            label="Personalisation"
            description={describe("personalisation")}
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
          {level("visibility", "Never", "Often")}
          <Row id="learned" lit={lit === "learned"} label="What the timeline has learned" description={describe("learned")} inline>
            <Link href="/world?tab=details" className={`${quiet} -mr-2 text-x-blue`}>
              View
            </Link>
          </Row>
          <div id="reset-taste" className={`scroll-mt-[64px] px-4 pb-4 pt-1 transition-colors duration-700 ${lit === "reset-taste" ? "bg-x-blue/15" : ""}`}>
            <button type="button" onClick={() => setConfirming(true)} className={`${quiet} -ml-4 text-x-red`}>
              Reset what the timeline has learned
            </button>
            {learnedCleared ? <span className="text-[13px] text-x-dim">Done.</span> : null}
          </div>
        </>
      );
      break;
    case "events":
      body = (
        <>
          {onOff("majorSelfStart", labelOf("majorSelfStart"), settings.majorSelfStart, (v) => save({ majorSelfStart: v }))}
          <Heading>Kinds</Heading>
          {ARC_KINDS.map((k) =>
            onOff(`major-${k}`, MAJOR_KINDS[k].label, settings.majorKinds[k], (v) =>
              save({ majorKinds: { ...settings.majorKinds, [k]: v } }),
            ),
          )}
          <Heading>What is reported</Heading>
          {onOff("majorCasualties", labelOf("majorCasualties"), settings.majorCasualties, (v) => save({ majorCasualties: v }))}
        </>
      );
      break;
    case "brok":
      body = (
        <Row id="brokWit" lit={lit === "brokWit"} label="Brok’s tone" description={describe("brokWit")}>
          <Choice
            label="Brok’s tone"
            value={settings.brokWit}
            onChange={(v) => save({ brokWit: v as Settings["brokWit"] })}
            options={[
              { value: 0, label: "Straight" },
              { value: 1, label: "Witty" },
              { value: 2, label: "Merciless" },
            ]}
          />
        </Row>
      );
      break;
    case "usage":
      body = (
        <>
          <Row id="usage" lit={lit === "usage"} label="How much the world writes" description={USAGE_HINT[settings.usage]}>
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
          <Row id="budget" lit={lit === "budget"} label="Daily limit" description={describe("budget")}>
            <Choice
              label="Daily limit"
              value={settings.budget}
              onChange={(v) => save({ budget: v })}
              options={BUDGETS.map((b) => ({ value: b, label: b === 0 ? "None" : compact(b * 1000) }))}
            />
          </Row>
          <div
            id="today"
            className={`scroll-mt-[64px] px-4 pb-4 pt-1 text-[13px] leading-4 text-x-dim transition-colors duration-700 ${lit === "today" ? "bg-x-blue/15" : ""}`}
          >
            {usage
              ? `Today: ${compact(usage.inputTokens + usage.outputTokens)} tokens in ${usage.calls} model ${usage.calls === 1 ? "call" : "calls"} (${compact(usage.inputTokens)} read, ${compact(usage.outputTokens)} written). Last hour: ${compact(usage.lastHourTokens)}.`
              : "Today: …"}
            {sim?.hold === "budget" ? " The daily limit has been reached." : null}
            {sim?.hold === "unread" ? " The world is waiting for you to catch up on the timeline." : null}
          </div>
        </>
      );
      break;
  }

  const changed = isChanged(id, settings, sim?.pace);

  // Worlds has no settings of its own, so no reset bar.
  if (id === "worlds") {
    return (
      <div>
        <div className="border-b border-x-border px-4 py-3 text-[13px] leading-4 text-x-dim">{category.blurb}</div>
        <SavedWorlds />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-x-border px-4 py-3 text-[13px] leading-4 text-x-dim">{category.blurb}</div>
      {body}
      <div className="border-t border-x-border px-4 py-3">
        <button
          type="button"
          disabled={!changed}
          onClick={() => resetCategory(id)}
          className={`${quiet} -ml-4 text-x-dim hover:text-x-text disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-x-dim`}
        >
          Reset this section
        </button>
        {!changed ? <span className="text-[13px] leading-4 text-x-dim">Everything here is at its default.</span> : null}
      </div>
      {confirming ? <ResetTasteDialog onConfirm={resetTaste} onCancel={() => setConfirming(false)} /> : null}
    </div>
  );
}
