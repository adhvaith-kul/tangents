// The user's content controls, stored as one JSON value in the kv table.
// Server-only. Unknown keys and out-of-range values are ignored.
import { kvGet, kvSet } from "./db";
import { SUBJECTS } from "./subjects";
import { ARC_KINDS, BUDGETS, DEFAULT_SETTINGS, HUMOUR_STYLES, type Settings } from "./types";

const KEY = "settings";
const LEVELS = ["satire", "conflict", "shitposting", "reality", ...SUBJECTS, "noise", "visibility"] as const;
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
  const w = src.brokWit;
  if (typeof w === "number" && Number.isInteger(w) && w >= 0 && w <= 2) out.brokWit = w;
  const hs = src.humourStyles;
  if (hs && typeof hs === "object") {
    // Only the valid entries; the caller merges them over what is stored.
    const styles: Record<string, number> = {};
    for (const k of HUMOUR_STYLES) {
      const v = (hs as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 2) styles[k] = v;
    }
    out.humourStyles = styles;
  }
  const b = src.budget;
  if (typeof b === "number" && (BUDGETS as readonly number[]).includes(b)) out.budget = b;
  for (const k of Object.keys(ENUMS) as (keyof typeof ENUMS)[]) {
    const v = src[k];
    if (typeof v === "string" && (ENUMS[k] as readonly string[]).includes(v)) out[k] = v;
  }
  for (const k of ["majorSelfStart", "majorCasualties", "rage", "xray"] as const) {
    if (typeof src[k] === "boolean") out[k] = src[k];
  }
  const mk = src.majorKinds;
  if (mk && typeof mk === "object") {
    // Only the valid entries; the caller merges them over what is stored.
    const kinds: Record<string, boolean> = {};
    for (const k of ARC_KINDS) {
      const v = (mk as Record<string, unknown>)[k];
      if (typeof v === "boolean") kinds[k] = v;
    }
    out.majorKinds = kinds;
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
  const clean = sanitize(stored);
  return {
    ...DEFAULT_SETTINGS, ...clean, humourStyles: { ...DEFAULT_SETTINGS.humourStyles, ...clean.humourStyles },
    majorKinds: { ...DEFAULT_SETTINGS.majorKinds, ...clean.majorKinds },
  };
}

/** Validate, merge over the current settings, store, and return the result. */
export function saveSettings(patch: Partial<Settings>): Settings {
  const current = getSettings();
  const clean = sanitize(patch);
  const next = {
    ...current, ...clean, humourStyles: { ...current.humourStyles, ...clean.humourStyles },
    majorKinds: { ...current.majorKinds, ...clean.majorKinds },
  };
  kvSet(KEY, JSON.stringify(next));
  return next;
}
