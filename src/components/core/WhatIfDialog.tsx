"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { bus, postJson } from "@/lib/client";
import { toast } from "./toast";
import { closeWhatIf, useWhatIfOpen } from "./state";
import type { SimStatus } from "@/lib/types";

const SUGGESTIONS = [
  "Apple announces an unexpected acquisition of Disney for $240B",
  "Sam Altman and Elon Musk announce an emergency joint AI safety initiative",
  "Trump announces Elon Musk as the new Special Envoy to Asia",
  "Google open-sources Gemini 3, crashing proprietary AI stocks",
  "Tesla unveils a humanoid robot cooking restaurant chain",
];

export function WhatIfDialog() {
  const open = useWhatIfOpen();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && closeWhatIf();
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const valid = text.trim().length >= 8 && text.trim().length <= 200;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<SimStatus | { error: string }>("/api/sim", { whatIf: text.trim() });
      if (res && "error" in res && typeof res.error === "string") {
        setError(res.error);
        return;
      }
      closeWhatIf();
      setText("");
      bus.emit("sim");
      toast("Scenario launched! Watch the timeline unfold.");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatif-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(91,112,131,0.4)] p-4 sm:pt-14"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeWhatIf();
      }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-x-bg shadow-2xl border border-x-border">
        {/* Header */}
        <div className="flex h-[53px] items-center justify-between border-b border-x-border px-3">
          <button
            type="button"
            aria-label="Close"
            onClick={closeWhatIf}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-x-hover"
          >
            <Icon name="close" size={20} />
          </button>
          <div id="whatif-title" className="text-[17px] font-extrabold leading-6 text-x-text flex items-center gap-1.5">
            <span>💡</span> Create a “What if…” Scenario
          </div>
          <div className="w-9" />
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-[14px] leading-5 text-x-dim">
            Propose any hypothetical premise or breaking headline. Tangents will spin off an entire new storyline, and simulated news outlets, figures, and crowds will react live.
          </p>

          <div className="mt-4 relative rounded-xl border border-x-border bg-x-card/40 p-3 focus-within:border-x-blue focus-within:ring-1 focus-within:ring-x-blue">
            <textarea
              ref={inputRef}
              value={text}
              maxLength={200}
              rows={4}
              onChange={(e) => setText(e.target.value)}
              placeholder="What if Apple bought Disney? / What if Elon Musk stepped down from Tesla?"
              className="w-full resize-none bg-transparent text-[15px] leading-6 text-x-text outline-none placeholder:text-x-dim"
            />
            <div className="mt-1 flex items-center justify-between text-[12px] text-x-dim">
              <span>{text.trim().length < 8 && text.length > 0 ? "Minimum 8 characters" : ""}</span>
              <span className={text.length >= 190 ? "text-x-gold font-bold" : ""}>
                {text.length} / 200
              </span>
            </div>
          </div>

          {error && <div className="mt-2 text-[13px] leading-4 text-x-red">{error}</div>}

          {/* Inspiration Prompts */}
          <div className="mt-4">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-x-dim">Try an idea:</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setText(s)}
                  className="rounded-full border border-x-border bg-x-hover/30 px-3 py-1 text-left text-[12px] text-x-text hover:border-x-blue hover:text-x-blue transition-colors"
                >
                  {s.slice(0, 36)}…
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-x-border bg-x-search/30 px-5 py-3">
          <button
            type="button"
            onClick={closeWhatIf}
            disabled={busy}
            className="rounded-full px-4 py-2 text-[15px] font-bold text-x-dim hover:bg-x-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid || busy}
            className="flex items-center gap-2 rounded-full bg-x-blue px-6 py-2 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start Scenario 🚀"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(dialog, document.body) : null;
}
