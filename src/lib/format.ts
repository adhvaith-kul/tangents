// Display formatting shared by every screen. Safe to import from client components.
import type { BirthDate } from "./types";

/** 1234 -> "1,234", 12345 -> "12.3K", 1234567 -> "1.2M" (X's rules). */
export function formatCount(n: number): string {
  if (n < 10_000) return n.toLocaleString("en-US");
  if (n < 1_000_000) return trim(n / 1_000) + "K";
  if (n < 1_000_000_000) return trim(n / 1_000_000) + "M";
  return trim(n / 1_000_000_000) + "B";
}

function trim(x: number): string {
  return x >= 100 ? String(Math.floor(x)) : (Math.floor(x * 10) / 10).toString();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Timeline timestamp: "now", "12s", "5m", "3h", then "Nov 12". */
export function timeAgo(t: number, now: number): string {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? "" : `, ${d.getFullYear()}`}`;
}

/** Post detail timestamp: "9:41 AM · Nov 14, 2026". */
export function fullTime(t: number): string {
  const d = new Date(t);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"} · ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** 345.2 -> "345.20", 96400 -> "96,400.00", 0.312 -> "0.3120". */
export function formatPrice(p: number): string {
  const digits = p < 1 ? 4 : 2;
  return p.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 4.234 -> "+4.23%", -1.5 -> "-1.50%". */
export function formatPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** A birth date written out in full, as "Edit profile" shows it. */
export function birthDateText(b: { month: number; day: number; year: number }): string {
  return `${MONTH_NAMES[b.month - 1]} ${b.day}, ${b.year}`;
}

/** The profile's "Born" line: only the parts the reader has not kept to themselves. */
export function bornLine(b: BirthDate): string | null {
  const day = b.dayAudience !== "self";
  const year = b.yearAudience !== "self";
  if (!day && !year) return null;
  return `Born ${day ? `${MONTH_NAMES[b.month - 1]} ${b.day}${year ? `, ${b.year}` : ""}` : b.year}`;
}
