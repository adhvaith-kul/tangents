// The price engine. OWNER: news, markets and avatars workstream. Signatures are frozen.
import type { StockMove, StockView, WorldDigest } from "./types";

/** Best effort: replace the seeded opening prices with live quotes. Only acts
 *  before any story has moved a price. Never throws. */
export async function primeQuotes(): Promise<void> {}

/** Give every ticker enough back-history for a sparkline. Idempotent. */
export function ensureStockHistory(): void {}

/** Schedule story-driven moves to land around `at` (simulation ms). */
export function scheduleMoves(
  moves: { ticker: string; pct: number; reason: string }[],
  at: number,
  storylineId: number | null,
): void {
  void moves; void at; void storylineId;
}

/** Add a little random movement to every ticker at `at`. Called once per tick. */
export function noiseTick(at: number): void {
  void at;
}

/** Reset each ticker's daily baseline to its current price ("Skip a day"). */
export function startNewDay(): void {}

/** Current state of every ticker (or the first `limit`), in display order. */
export function stockViews(limit?: number): StockView[] {
  void limit;
  return [];
}

/** Story-driven moves that have already happened, newest first. */
export function recentMoves(limit = 30): StockMove[] {
  void limit;
  return [];
}

export function digestStocks(): WorldDigest["stocks"] {
  return [];
}
