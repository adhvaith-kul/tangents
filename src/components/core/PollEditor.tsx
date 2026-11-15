"use client";
// The poll a new post can carry, as X's composer draws it: a bordered box of
// floating-label choices (two required, up to four), the Poll length selects
// and a red Remove poll row. The composer owns the state.
import { useState } from "react";
import { Icon } from "@/components/icons";

export const CHOICE_MAX = 25;
const MAX_CHOICES = 4;

export interface PollDraftState {
  choices: string[];
  days: number;
  hours: number;
  minutes: number;
}

/** X's default: two empty choices, open for a day. */
export const NEW_POLL: PollDraftState = { choices: ["", ""], days: 1, hours: 0, minutes: 0 };

/** The draft's length in minutes. */
export function pollMinutes(p: PollDraftState): number {
  return p.days * 1440 + p.hours * 60 + p.minutes;
}

/** Keep the length between 5 minutes and 7 days, as X does when a select changes. */
function clampLength(p: PollDraftState): PollDraftState {
  if (p.days >= 7) return { ...p, days: 7, hours: 0, minutes: 0 };
  if (p.days === 0 && p.hours === 0 && p.minutes < 5) return { ...p, minutes: 5 };
  return p;
}

function ChoiceField({
  index,
  value,
  onChange,
  autoFocus,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value !== "";
  const label = `Choice ${index + 1}${index >= 2 ? " (optional)" : ""}`;
  return (
    <label
      className={`relative block h-14 min-w-0 flex-1 rounded border ${focused ? "border-x-blue ring-1 ring-x-blue" : "border-x-border"}`}
    >
      <span
        className={`pointer-events-none absolute left-2 transition-all ${
          raised ? "top-1.5 text-[13px] leading-4" : "top-4 text-[17px] leading-6"
        } ${focused ? "text-x-blue" : "text-x-dim"}`}
      >
        {label}
      </span>
      <input
        value={value}
        maxLength={CHOICE_MAX}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-x-2 bottom-1.5 bg-transparent text-[17px] leading-6 text-x-text outline-none"
        autoComplete="off"
      />
      <span className="absolute right-2 top-1.5 text-[13px] leading-4 text-x-dim">
        {focused ? `${value.length} / ${CHOICE_MAX}` : ""}
      </span>
    </label>
  );
}

function LengthSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label
      className={`relative block h-14 min-w-0 flex-1 rounded border ${focused ? "border-x-blue ring-1 ring-x-blue" : "border-x-border"}`}
    >
      <span className={`pointer-events-none absolute left-2 top-1.5 text-[13px] leading-4 ${focused ? "text-x-blue" : "text-x-dim"}`}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent px-2 pt-5 text-[17px] leading-6 text-x-text outline-none"
      >
        {options.map((n) => (
          <option key={n} value={n} className="bg-x-bg">
            {n}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        width={22}
        height={22}
        fill="currentColor"
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${focused ? "text-x-blue" : "text-x-dim"}`}
      >
        <path d="M3.543 8.96l1.414-1.42L12 14.59l7.043-7.05 1.414 1.42L12 17.41 3.543 8.96z" />
      </svg>
    </label>
  );
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function PollEditor({
  poll,
  onChange,
  onRemove,
}: {
  poll: PollDraftState;
  onChange: (p: PollDraftState) => void;
  onRemove: () => void;
}) {
  const setChoice = (i: number, v: string) => onChange({ ...poll, choices: poll.choices.map((c, j) => (j === i ? v : c)) });
  const last = poll.choices.length - 1;
  const full = poll.days >= 7;
  const short = poll.days === 0 && poll.hours === 0;

  return (
    <div className="mb-3 mt-3 rounded-2xl border border-x-border">
      <div className="flex flex-col gap-3 p-3">
        {poll.choices.map((c, i) => (
          <div key={i} className="flex items-center">
            <ChoiceField index={i} value={c} onChange={(v) => setChoice(i, v)} autoFocus={i > 1 && i === last} />
            {/* The "+" sits beside the last choice; the other rows keep its width so the fields line up. */}
            <div className="ml-3 flex w-9 shrink-0 justify-center">
              {i === last && poll.choices.length < MAX_CHOICES ? (
                <button
                  type="button"
                  aria-label="Add a choice"
                  onClick={() => onChange({ ...poll, choices: [...poll.choices, ""] })}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-x-blue transition-colors hover:bg-x-blue/10"
                >
                  <Icon name="plus" size={22} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-x-border p-3">
        <div className="mb-1 text-[15px] leading-5 text-x-text">Poll length</div>
        <div className="flex gap-3">
          <LengthSelect label="Days" value={poll.days} options={range(0, 7)} onChange={(days) => onChange(clampLength({ ...poll, days }))} />
          <LengthSelect
            label="Hours"
            value={poll.hours}
            options={full ? [0] : range(0, 23)}
            onChange={(hours) => onChange(clampLength({ ...poll, hours }))}
          />
          <LengthSelect
            label="Minutes"
            value={poll.minutes}
            options={full ? [0] : short ? range(5, 59) : range(0, 59)}
            onChange={(minutes) => onChange(clampLength({ ...poll, minutes }))}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="block h-[53px] w-full rounded-b-2xl border-t border-x-border text-center text-[15px] leading-5 text-x-red transition-colors hover:bg-x-red/10"
      >
        Remove poll
      </button>
    </div>
  );
}
