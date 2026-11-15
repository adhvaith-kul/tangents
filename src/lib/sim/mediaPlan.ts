// The engine, not the writer, decides what media a crowd batch carries: from the
// cap it works out how many GIFs and memes, and whether one account posts a
// tier list. The crowd message states the plan.
import { db } from "../db";
import { MEME_TEMPLATES } from "../media";
import type { MediaPlan } from "../prompts/crowd";
import { parseJsonList } from "./digest";

const TIER_CHANCE = 1 / 6;
const TIER_MIN_PARTICIPANTS = 6;
const TIER_MIN_HEAT = 6;
/** Handles offered for a tier list; fewer than six cannot make a valid one. */
const TIER_POOL = 8;

/** How many templates a batch is offered: enough for one to fit the moment. */
const MEME_OFFER = 6;
/** A template in the timeline's last few memes is not offered at all. */
const MEME_REST = 8;
const MEME_MEMORY = 30;

/** The templates this batch's memes may use. Left to itself the writer reaches
 *  for the same four, so each batch is offered a different handful: none of the
 *  ones just used, and the ones the timeline has not seen lately most often. */
export function offerTemplates(): string[] {
  const recent = (
    db()
      .prepare(
        `SELECT json_extract(media, '$.template') AS template FROM posts
         WHERE media IS NOT NULL AND json_extract(media, '$.kind') = 'meme' ORDER BY id DESC LIMIT ?`,
      )
      .all(MEME_MEMORY) as { template: string | null }[]
  ).map((r) => r.template);
  const resting = new Set(recent.slice(0, MEME_REST));
  const seen = new Map<string, number>();
  for (const t of recent) if (t) seen.set(t, (seen.get(t) ?? 0) + 1);
  const pool = MEME_TEMPLATES.filter((m) => !resting.has(m.id)).map((m) => ({
    id: m.id,
    weight: seen.has(m.id) ? 1 / seen.get(m.id)! : 4,
  }));
  const out: string[] = [];
  while (out.length < MEME_OFFER && pool.length) {
    let pick = Math.random() * pool.reduce((sum, m) => sum + m.weight, 0);
    const i = pool.findIndex((m) => (pick -= m.weight) <= 0);
    out.push(pool.splice(i < 0 ? pool.length - 1 : i, 1)[0].id);
  }
  return out;
}

/** Split a cap into GIFs, memes and maybe a tier list. Memes are as common as
 *  GIFs (an odd one out goes either way), and without a GIPHY key they take
 *  the GIFs' share. A tier list counts against the cap. */
export function planMedia(cap: number, tierEligible: boolean): MediaPlan {
  let left = Math.max(0, cap);
  const tierList = tierEligible && left > 0 && Math.random() < TIER_CHANCE;
  if (tierList) left--;
  const half = Math.floor(left / 2);
  const odd = left % 2 === 1 && Math.random() < 0.5 ? 1 : 0;
  const gifs = process.env.GIPHY_API_KEY ? half + odd : 0;
  const memes = left - gifs;
  return { gifs, memes, tierList, ...(memes ? { memeTemplates: offerTemplates() } : {}) };
}

/** Whether a story's batch may carry a tier list: the storyline has six or
 *  more famous participants, or its heat is 6 or more. */
export function tierEligibleFor(storylineId: number | null, heat: number): boolean {
  if (storylineId == null) return false;
  return heat >= TIER_MIN_HEAT || famousParticipants(storylineId).length >= TIER_MIN_PARTICIPANTS;
}

/** Famous accounts to rank: the storyline's famous participants, topped up
 *  with the best-known famous accounts of its subject when there are too few. */
export function tierPool(storylineId: number | null, domain: string): string[] {
  const picked = storylineId == null ? [] : famousParticipants(storylineId);
  if (picked.length >= TIER_MIN_PARTICIPANTS) return picked.slice(0, TIER_POOL);
  const more = db()
    .prepare(
      "SELECT handle FROM accounts WHERE kind = 'figure' AND domain = ? ORDER BY followers DESC LIMIT ?",
    )
    .all(domain, TIER_POOL * 2) as { handle: string }[];
  const have = new Set(picked.map((h) => h.toLowerCase()));
  for (const { handle } of more) {
    if (picked.length >= TIER_POOL) break;
    if (!have.has(handle.toLowerCase())) picked.push(handle);
  }
  return picked;
}

function famousParticipants(storylineId: number): string[] {
  const row = db().prepare("SELECT participants FROM storylines WHERE id = ?").get(storylineId) as
    | { participants: string }
    | undefined;
  if (!row) return [];
  const find = db().prepare("SELECT handle FROM accounts WHERE handle = ? COLLATE NOCASE AND kind IN ('figure', 'outlet', 'org')");
  const out: string[] = [];
  for (const h of parseJsonList(row.participants)) {
    const hit = find.get(h) as { handle: string } | undefined;
    if (hit) out.push(hit.handle);
  }
  return out;
}
