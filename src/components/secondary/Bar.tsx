// A horizontal bar centred on zero: green to the right for positive values,
// red to the left for negative ones. `value` and `max` share a unit.
export function SignedBar({ value, max, width = 120 }: { value: number; max: number; width?: number }) {
  const frac = Math.min(1, Math.abs(value) / (max || 1));
  const half = width / 2;
  return (
    <div className="relative h-2 shrink-0 rounded-full bg-x-search" style={{ width }}>
      <div className="absolute left-1/2 top-[-2px] h-3 w-px bg-x-dim" />
      <div
        className={`absolute top-0 h-2 rounded-full ${value >= 0 ? "bg-x-green" : "bg-x-red"}`}
        style={value >= 0 ? { left: half, width: frac * half } : { left: half - frac * half, width: frac * half }}
      />
    </div>
  );
}
