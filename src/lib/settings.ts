// The user's content controls. STUB: the settings workstream replaces the body
// (storage in the kv table). The two exported signatures are frozen. Server-only.
import { DEFAULT_SETTINGS, type Settings } from "./types";

export function getSettings(): Settings {
  return DEFAULT_SETTINGS;
}

/** Validate, merge over the current settings, store, and return the result. */
export function saveSettings(patch: Partial<Settings>): Settings {
  return { ...getSettings(), ...patch };
}
