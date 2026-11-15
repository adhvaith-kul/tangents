"use client";
// The Home tab bar: "For you" and "Following". X follows them with a "+" that
// manages pinned timelines; there are none here, so it is left out.
import type { FeedTab } from "./HomeTimeline";

const TABS: { key: FeedTab; label: string; grow: string }[] = [
  { key: "foryou", label: "For you", grow: "flex-1" },
  { key: "following", label: "Following", grow: "flex-1" },
];

export function HomeTabs({ active, onSelect }: { active: FeedTab; onSelect: (key: FeedTab) => void }) {
  return (
    <div className="flex border-b border-x-border">
      <div role="tablist" className="flex min-w-0 flex-1">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(t.key)}
              className={`flex h-[53px] ${t.grow} justify-center px-4 transition-colors hover:bg-x-hover`}
            >
              <span
                className={`relative flex h-full items-center text-[15px] leading-5 ${on ? "font-bold text-x-text" : "font-medium text-x-dim"}`}
              >
                {t.label}
                {on ? (
                  <span className="absolute bottom-0 left-1/2 h-1 w-full min-w-14 -translate-x-1/2 rounded-full bg-x-blue" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
