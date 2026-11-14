// The user's content controls, stored as one JSON value in the kv table.
// Server-only. Unknown keys and out-of-range values are ignored.
import { kvGet, kvSet } from "./db";
import { BUDGETS, DEFAULT_SETTINGS, type Settings } from "./types";

const KEY = "settings";
const LEVELS = ["satire", "conflict", "shitposting", "reality", "tech", "pop", "politics", "sports", "noise", "visibility"] as const;
const ENUMS = {
  profanity: ["off", "mild", "full"],
  personalisation: ["off", "light", "strong"],
} as const;

/** Copy the valid fields of an untrusted object into a partial Settings. */
function sanitize(input: unknown): Partial<Settings> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const k of LEVELS) {
    const v = src[k];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 4) out[k] = v;
  }
  const m = src.media;
  if (typeof m === "number" && Number.isInteger(m) && m >= 0 && m <= 2) out.media = m;
  const u = src.usage;
  if (typeof u === "number" && Number.isInteger(u) && u >= 0 && u <= 2) out.usage = u;
  const b = src.budget;
  if (typeof b === "number" && (BUDGETS as readonly number[]).includes(b)) out.budget = b;
  for (const k of Object.keys(ENUMS) as (keyof typeof ENUMS)[]) {
    const v = src[k];
    if (typeof v === "string" && (ENUMS[k] as readonly string[]).includes(v)) out[k] = v;
  }
  return out as Partial<Settings>;
}

export function getSettings(): Settings {
  let stored: unknown = null;
  try {
    const raw = kvGet(KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // corrupt value: fall back to the defaults
  }
  return { ...DEFAULT_SETTINGS, ...sanitize(stored) };
}

/** Validate, merge over the current settings, store, and return the result. */
export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...sanitize(patch) };
  kvSet(KEY, JSON.stringify(next));
  return next;
}
