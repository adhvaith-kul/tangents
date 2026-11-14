"use client";
// Confirmation for clearing learned taste, styled like the delete dialog.
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ResetTasteDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-taste-title"
        onClick={(e) => e.stopPropagation()}
        className="w-[320px] max-w-[80vw] rounded-2xl bg-x-bg p-8"
      >
        <h2 id="reset-taste-title" className="text-[20px] font-bold leading-6 text-x-text">
          Reset what the timeline has learned?
        </h2>
        <p className="mt-2 text-[15px] leading-5 text-x-dim">
          Your timeline and the stories will forget what you have liked, opened and skipped. Your posts and settings
          stay as they are.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 h-11 w-full rounded-full bg-x-red text-[15px] font-bold leading-5 text-white transition-colors hover:bg-[#dc1e29]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 h-11 w-full rounded-full border border-[#536471] text-[15px] font-bold leading-5 text-x-text transition-colors hover:bg-x-hover"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
