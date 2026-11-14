"use client";
// Steering the world from the story map: "What if…" to start a story or give
// one its next development, and "Wrap up" to bring one to a close. Each control
// reports a request through `submit`, which resolves to an error message to
// show beside it, or null when the world has taken it.
import { useState } from "react";

/** What the reader asked for. With no storyline, a "What if" starts a new story. */
export type Steer =
  | { kind: "whatif"; text: string; storylineId: number | null }
  | { kind: "wrap"; storylineId: number };

export type Submit = (steer: Steer) => Promise<string | null>;

const MAX = 200; // the server's limit, as in the What if dialog

const INPUT =
  "h-9 min-w-0 flex-1 rounded-full border border-x-border bg-transparent px-4 text-[15px] leading-5 text-x-text outline-none placeholder:text-x-dim focus:border-x-blue";
const GO =
  "h-9 shrink-0 rounded-full bg-x-button px-4 text-[14px] font-bold leading-4 text-black transition-colors hover:bg-x-button-hover disabled:opacity-50";
const QUIET = "text-[13px] font-bold leading-4 text-x-dim transition-colors hover:text-x-blue";

function useSubmit(submit: Submit, done: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (steer: Steer) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem = await submit(steer);
    setBusy(false);
    if (problem) setError(problem);
    else done();
  };
  return { busy, error, run, clear: () => setError(null) };
}

/** The bar above the map: propose a new story. */
export function WhatIfBar({ submit }: { submit: Submit }) {
  const [text, setText] = useState("");
  const { busy, error, run } = useSubmit(submit, () => setText(""));
  return (
    <form
      className="border-b border-x-border px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) void run({ kind: "whatif", text: text.trim(), storylineId: null });
      }}
    >
      <div className="flex items-center gap-3">
        <label htmlFor="storymap-whatif" className="shrink-0 text-[15px] font-bold leading-5 text-x-text">
          What if…
        </label>
        <input
          id="storymap-whatif"
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder="Apple bought Disney?"
          autoComplete="off"
          className={INPUT}
        />
        <button type="submit" disabled={!text.trim() || busy} className={GO}>
          Start it
        </button>
      </div>
      {error ? <div className="mt-2 text-[13px] leading-4 text-x-red">{error}</div> : null}
    </form>
  );
}

/** The small actions on a beat's row, and the input or confirmation they open. */
export function useRowSteer(storylineId: number, submit: Submit) {
  const [mode, setMode] = useState<"whatif" | "wrap" | null>(null);
  const [text, setText] = useState("");
  const { busy, error, run, clear } = useSubmit(submit, () => {
    setMode(null);
    setText("");
  });
  const toggle = (next: "whatif" | "wrap") => {
    clear();
    setMode((cur) => (cur === next ? null : next));
  };
  return { mode, text, setText, busy, error, toggle, close: () => toggle(mode ?? "whatif"), run, storylineId };
}

type RowSteer = ReturnType<typeof useRowSteer>;

export function RowActions({ steer, dormant, always }: { steer: RowSteer; dormant: boolean; always: boolean }) {
  // Shown on the storyline's first row; on its other rows when hovered, focused or in use.
  const visible = always || steer.mode != null;
  return (
    <span
      className={`ml-auto flex shrink-0 items-center gap-3 pl-2 transition-opacity ${
        visible ? "" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" aria-expanded={steer.mode === "whatif"} onClick={() => steer.toggle("whatif")} className={QUIET}>
        What if…
      </button>
      {dormant ? null : (
        <button type="button" aria-expanded={steer.mode === "wrap"} onClick={() => steer.toggle("wrap")} className={QUIET}>
          Wrap up
        </button>
      )}
    </span>
  );
}

export function RowSteerPanel({ steer }: { steer: RowSteer }) {
  if (steer.mode == null) return null;
  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {steer.mode === "whatif" ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (steer.text.trim()) void steer.run({ kind: "whatif", text: steer.text.trim(), storylineId: steer.storylineId });
          }}
        >
          <input
            autoFocus
            value={steer.text}
            maxLength={MAX}
            onChange={(e) => steer.setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && steer.close()}
            placeholder="What happens next in this story?"
            aria-label="What happens next in this story?"
            autoComplete="off"
            className={INPUT}
          />
          <button type="submit" disabled={!steer.text.trim() || steer.busy} className={GO}>
            Add it
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-3 text-[13px] leading-4 text-x-dim">
          <span>Wrap up this story? The world will bring it to a close.</span>
          <button
            type="button"
            disabled={steer.busy}
            onClick={() => void steer.run({ kind: "wrap", storylineId: steer.storylineId })}
            className="font-bold text-x-text hover:underline disabled:opacity-50"
          >
            Wrap up
          </button>
          <button type="button" onClick={steer.close} className="hover:underline">
            Cancel
          </button>
        </div>
      )}
      {steer.error ? <div className="mt-2 text-[13px] leading-4 text-x-red">{steer.error}</div> : null}
    </div>
  );
}
