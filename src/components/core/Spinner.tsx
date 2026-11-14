// X's loading indicator: a blue arc turning over a faint blue ring.
export function Spinner({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex justify-center ${className}`} role="progressbar" aria-label="Loading">
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: "0.75s" }}
      >
        <circle cx="16" cy="16" r="14" fill="none" strokeWidth="4" className="stroke-x-blue" opacity="0.2" />
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          strokeWidth="4"
          className="stroke-x-blue"
          strokeDasharray="80"
          strokeDashoffset="60"
        />
      </svg>
    </div>
  );
}
