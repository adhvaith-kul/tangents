// A day-change pill: green up, red down.
import { formatPct } from "@/lib/format";

export function Pill({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={`inline-block min-w-[72px] rounded-md px-2 py-1 text-center text-[13px] font-bold tabular-nums ${
        up ? "bg-x-green/15 text-x-green" : "bg-x-red/15 text-x-red"
      }`}
    >
      {formatPct(pct)}
    </span>
  );
}
