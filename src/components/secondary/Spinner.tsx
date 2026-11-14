// X's loading ring, shown while a screen waits for its first response.
export function Spinner() {
  return (
    <div className="flex justify-center py-8" role="status" aria-label="Loading">
      <svg viewBox="0 0 32 32" width={28} height={28} className="animate-spin">
        <circle cx="16" cy="16" r="12" fill="none" stroke="#2f3336" strokeWidth="4" />
        <path d="M16 4a12 12 0 0 1 12 12" fill="none" stroke="#1d9bf0" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
