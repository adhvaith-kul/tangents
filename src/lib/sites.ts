// The simulated web: which site each publishing account has and what its
// addresses look like. STUB: the simulated-browser workstream replaces the body.
// The two exported signatures are frozen.
import type { PageKind } from "./types";

/** The address shown on a link card and in the simulated browser, without a
 *  scheme, e.g. "bloomberg.com/news/articles/2026-11-14/nvidia-board-review". */
export function pageUrl(handle: string, kind: PageKind, id: number, headline: string, createdAt: number): string {
  void kind; void createdAt;
  const slug = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${handle.toLowerCase()}.com/${slug}-${id}`;
}
