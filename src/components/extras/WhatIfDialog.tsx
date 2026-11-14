"use client";
// "What if…": propose a premise for the world to play out. Not part of X.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/core/toast";
import { bus, postJson } from "@/lib/client";
import type { SimStatus } from "@/lib/types";

function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  const body = m.replace(/^\d+\s/, "");
  try {
    const j = JSON.parse(body) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
  } catch {
    // not JSON
  }
  return "Something went wrong. Try again.";
}

export function WhatIfDialog({ onClose, onSim }: { onClose: () => void; onSim: (s: SimStatus) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const start = async () => {
    const whatIf = text.trim();
    if (!whatIf || busy) return;
    setBusy(true);
    setError(null);
    try {
      const status = await postJson<SimStatus>("/api/sim", { whatIf });
      onSim(status);
      onClose();
      bus.emit("sim");
      toast("It’s happening. Watch the timeline.");
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatif-title"
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] max-w-[90vw] rounded-2xl bg-x-bg p-8"
      >
        <h2 id="whatif-title" className="text-[20px] font-bold leading-6 text-x-text">
          What if…
        </h2>
        <p className="mt-2 text-[15px] leading-5 text-x-dim">
          Propose something that could happen. The world will take it from there.
        </p>
        <textarea
          autoFocus
          value={text}
          maxLength={200}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          placeholder="What if Apple bought Disney?"
          className="mt-4 w-full resize-none rounded-lg border border-x-border bg-transparent p-3 text-[15px] leading-5 text-x-text outline-none placeholder:text-x-dim focus:border-x-blue"
        />
        <div className="mt-1 text-right text-[13px] leading-4 text-x-dim">{text.length}/200</div>
        {error ? <div className="mt-2 text-[13px] leading-4 text-x-red">{error}</div> : null}
        <button
          type="button"
          disabled={!text.trim() || busy}
          onClick={() => void start()}
          className="mt-6 h-11 w-full rounded-full bg-x-blue text-[15px] font-bold leading-5 text-white transition-colors hover:bg-x-blue-hover disabled:opacity-50"
        >
          Start it
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-11 w-full rounded-full border border-[#536471] text-[15px] font-bold leading-5 text-x-text transition-colors hover:bg-x-hover"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
