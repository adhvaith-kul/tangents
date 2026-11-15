// Persona briefs: what the writer is told about an account. Every account has a
// one-line entry in the index (always in the prompt). A full brief (the short
// sheet, researched background, a style analysis of the real feed, and any
// reference posts the user has supplied) is loaded only for the accounts that
// matter to the beat being written, so the prompt stays small. Server-only.
import { interestPull } from "./interests";
import fs from "node:fs";
import path from "node:path";
import { FIGURES, ORGS, OUTLETS, type CastMember } from "./cast";
import { FIGURE_PERSONAS, ORG_STYLES, OUTLET_STYLES } from "./personas";
import type { Domain } from "./types";

// The ignore comment stops the bundler tracing every file under the project as
// a dependency of this module; without it, any write in the project (the
// database included) triggers a recompile and a page reload.
const ROOT = /* turbopackIgnore: true */ process.cwd();
const BACKGROUND = path.join(ROOT, "src/lib/briefs/background");
const STYLE = path.join(ROOT, "src/lib/briefs/style");
const REFERENCES = path.join(ROOT, "references");

function read(dir: string, handle: string, ext: string): string | null {
  try {
    const text = fs.readFileSync(path.join(dir, `${handle}.${ext}`), "utf8").trim();
    return text || null;
  } catch {
    return null;
  }
}

const sheet = (c: CastMember) =>
  c.kind === "figure" ? FIGURE_PERSONAS[c.handle] : c.kind === "org" ? ORG_STYLES[c.handle] : OUTLET_STYLES[c.handle];

/** Everyone the director may write as. */
export const WRITABLE: CastMember[] = [...FIGURES, ...ORGS, ...OUTLETS];

/** One line per account: enough to know who exists and roughly how they sound. */
export function castIndex(list: CastMember[]): string {
  return list
    .map((c) => {
      const first = (sheet(c) ?? "").split(/(?<=[.!?])\s/)[0] ?? "";
      return `@${c.handle} (${c.name}; ${c.kind === "figure" ? c.domain : `${c.kind}, ${c.domain}`}): ${first}`;
    })
    .join("\n");
}

/** Everything known about one account, for the writer. */
export function fullBrief(c: CastMember): string {
  const parts = [`## @${c.handle} (${c.name})`, sheet(c) ?? ""];
  const background = read(BACKGROUND, c.handle, "md");
  if (background) parts.push(background.replace(/^# .*\n/, "Background:\n"));
  const style = read(STYLE, c.handle, "md");
  if (style) parts.push(style.replace(/^# .*\n/, "How the real account writes:\n"));
  const refs = read(REFERENCES, c.handle, "txt");
  if (refs) {
    const posts = refs.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 6);
    parts.push(
      `Real posts, for style reference only. Never reuse or reword them:\n${posts.map((p) => `- ${p.replace(/\n/g, " / ")}`).join("\n")}`,
    );
  }
  return parts.filter(Boolean).join("\n");
}

const byHandle = new Map(WRITABLE.map((c) => [c.handle.toLowerCase(), c]));

/** The accounts to brief in full for one call: everyone already involved
 *  (`handles`), everyone named in `text` (headlines, a user post), then a random
 *  draw weighted towards `lean` and the reader's chosen `interests`, up to `limit`. */
export function selectCast(
  handles: string[], text: string, lean: Domain[], limit: number, interests: readonly string[] = [],
): CastMember[] {
  const picked = new Map<string, CastMember>();
  const add = (c: CastMember | undefined) => {
    if (c && picked.size < limit) picked.set(c.handle, c);
  };
  for (const h of handles) add(byHandle.get(h.replace(/^@/, "").toLowerCase()));
  const hay = text.toLowerCase();
  for (const c of [...FIGURES, ...ORGS]) {
    const last = c.name.split(" ").pop()!.toLowerCase();
    if (hay.includes(c.name.toLowerCase()) || hay.includes(`@${c.handle.toLowerCase()}`) || (c.kind === "figure" && last.length > 4 && hay.includes(last))) add(c);
  }
  // A random draw fills the rest, so quiet accounts get their turn.
  const rest = [...FIGURES, ...ORGS]
    .filter((c) => !picked.has(c.handle))
    // Accounts inside the reader's chosen interests come up about four times as
    // often, and those in an interest they passed over rarely: enough to keep
    // the world wider than the reader's picks without filling the timeline with it.
    .map((c) => ({
      c,
      key: -Math.log(1 - Math.random()) / ((lean.includes(c.domain) ? 3 : 1) * interestPull(c.handle, c.domain, interests)),
    }))
    .sort((a, b) => a.key - b.key);
  for (const { c } of rest) add(c);
  return [...picked.values()];
}
