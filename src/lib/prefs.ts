// The learned taste profile. OWNER: feed and personalisation workstream. Signatures are frozen.
import type { InteractionEvent, TasteProfile, TasteSummary } from "./types";

/** Log engagement events and credit them to the taste weights. */
export function recordInteractions(events: InteractionEvent[]): void {
  void events;
}

/** Decay every weight by about 2%. Called once per tick. */
export function decayPrefs(): void {}

/** What the director is told about the user's taste. */
export function tasteSummary(): TasteSummary {
  return {
    likes: { authors: [], topics: [], tones: [], domains: [] },
    avoids: { authors: [], topics: [], tones: [], domains: [] },
    signals: 0,
  };
}

/** The full profile for the Behind the scenes page. */
export function tasteProfile(): TasteProfile {
  return { weights: [], signals: 0 };
}
