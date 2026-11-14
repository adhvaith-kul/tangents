"use client";
// X's inline load failure: a dim line and a blue Retry pill.
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      <div className="text-[15px] leading-5 text-x-dim">Something went wrong. Try reloading.</div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 h-9 rounded-full bg-x-blue px-4 text-[15px] font-bold leading-5 text-white transition-colors hover:bg-x-blue-hover"
      >
        Retry
      </button>
    </div>
  );
}
