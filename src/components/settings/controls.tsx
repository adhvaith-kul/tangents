"use client";
// Settings controls: a five-step level control (segments) and a segmented
// choice control, plus the row and section layout. Both controls are radio
// groups: arrow keys move and select, Home/End jump.
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-x-border">
      <h2 className="px-4 pb-1 pt-4 text-[20px] font-extrabold leading-6 text-x-text">{title}</h2>
      {children}
    </section>
  );
}

export function Row({
  label,
  description,
  children,
  inline = false,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${inline ? "flex items-center justify-between gap-4" : ""}`}>
      <div className="min-w-0">
        <div className="text-[15px] leading-5 text-x-text">{label}</div>
        {description ? <div className="text-[13px] leading-4 text-x-dim">{description}</div> : null}
      </div>
      {children ? <div className={inline ? "shrink-0" : "mt-3"}>{children}</div> : null}
    </div>
  );
}

function useRadioKeys(count: number, current: number, select: (i: number) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent) => {
    let next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(count - 1, current + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, current - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    select(next);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

const seg = "h-8 flex-1 text-[13px] font-bold leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-x-blue";

/** Five segments, 0 to 4, with the two end labels underneath. */
export function LevelControl({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
}) {
  const { refs, onKeyDown } = useRadioKeys(5, value, onChange);
  return (
    <div>
      <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i + 1} of 5`}
            tabIndex={value === i ? 0 : -1}
            onClick={() => onChange(i)}
            className={`h-2.5 flex-1 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-x-blue ${i <= value ? "bg-x-blue" : "bg-x-search hover:bg-x-border"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[13px] leading-4 text-x-dim">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

/** Segmented buttons for a short list of choices. */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const idx = options.findIndex((o) => o.value === value);
  const { refs, onKeyDown } = useRadioKeys(options.length, idx, (i) => onChange(options[i].value));
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex rounded-full border border-x-border p-0.5">
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === idx}
          tabIndex={i === idx || (idx < 0 && i === 0) ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={`${seg} min-w-[72px] rounded-full px-3 ${i === idx ? "bg-x-blue text-white" : "text-x-dim hover:bg-x-hover hover:text-x-text"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
