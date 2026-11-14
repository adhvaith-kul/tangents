// Real headlines in. OWNER: news, markets and avatars workstream. Signatures are frozen.
import type { WorldDigest } from "./types";

/** Fetch the RSS feeds and store new headlines. Returns how many were added.
 *  Falls back to the bundled premises when nothing can be fetched. Never throws. */
export async function refreshHeadlines(): Promise<number> {
  return 0;
}

/** Up to n unused headlines, mixed across domains, freshest first. */
export function pickHeadlines(n: number): WorldDigest["headlines"] {
  void n;
  return [];
}

export function markHeadlineUsed(id: number): void {
  void id;
}
