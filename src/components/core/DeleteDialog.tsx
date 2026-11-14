"use client";
// X's "Delete post?" confirmation: a small centred sheet over the dimmed page.
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function DeleteDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        onClick={(e) => e.stopPropagation()}
        className="w-[320px] max-w-[80vw] rounded-2xl bg-x-bg p-8"
      >
        <h2 id="delete-title" className="text-[20px] font-bold leading-6 text-x-text">
          Delete post?
        </h2>
        <p className="mt-2 text-[15px] leading-5 text-x-dim">
          This can’t be undone and it will be removed from your profile, the timeline of any accounts that follow
          you, and from search results.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 h-11 w-full rounded-full bg-x-red text-[15px] font-bold leading-5 text-white transition-colors hover:bg-[#dc1e29]"
        >
          Delete
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
