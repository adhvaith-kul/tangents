"use client";
// X's tab bar: equal-width tabs, the active one bold with a rounded 4px blue
// bar under its label, inactive ones dim and medium weight.
export function Tabs<K extends string>({
  tabs,
  active,
  onSelect,
  className = "",
}: {
  tabs: { key: K; label: string }[];
  active: K;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex border-b border-x-border ${className}`}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(t.key)}
            className="flex h-[53px] flex-1 justify-center px-4 transition-colors hover:bg-x-hover"
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
  );
}
