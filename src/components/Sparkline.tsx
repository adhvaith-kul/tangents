// A small price line: green when up on the day, red when down. FROZEN after phase 1.
export function Sparkline({
  points,
  up,
  width = 72,
  height = 28,
}: {
  points: number[];
  up: boolean;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 2;
  const d = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (width - 2 * pad);
      const y = pad + (1 - (p - min) / span) * (height - 2 * pad);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path
        d={d}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={up ? "stroke-x-green" : "stroke-x-red"}
      />
    </svg>
  );
}
