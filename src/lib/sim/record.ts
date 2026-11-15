// The figures on record for one batch of replies: prices as they stand once
// this beat's moves have landed, the moves themselves, and what the story has
// established. The reply writer is shown them so that a number in a reply is
// the number the world keeps, not one made up to sound right.
import { db, now } from "../db";
import { MOVE_LANDS_MS, pricesAt } from "../stocks";

export interface CrowdRecord {
  prices: string[];
  moves: string[];
  facts: string[];
}

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export function recordFor(
  storylineId: number | null,
  moves: { ticker: string; pct: number }[] = [],
  at: number = now(),
): CrowdRecord {
  const facts =
    storylineId == null
      ? []
      : (
          db()
            .prepare("SELECT text FROM facts WHERE storyline_id = ? AND created_at <= ? ORDER BY created_at DESC, id DESC LIMIT 6")
            .all(storylineId, now()) as { text: string }[]
        ).map((f) => f.text);
  return {
    prices: pricesAt(at + MOVE_LANDS_MS + 1000).map(
      (s) => `${s.ticker} ${s.price < 1 ? s.price.toFixed(4) : s.price.toFixed(2)} (${pct(s.changePct)} today)`,
    ),
    moves: moves.map((m) => `${m.ticker} ${pct(m.pct)}`),
    facts,
  };
}
