// The price engine. OWNER: news, markets and avatars workstream. Signatures are frozen.
// A tick whose t is in the future is a scheduled move: every read filters on t <= now().
import { db, now, tx } from "./db";
import type { StockMove, StockView, WorldDigest } from "./types";

const HISTORY_POINTS = 40;
const SPACING_MS = 30 * 60_000;
const MOVE_MS = 60_000;
const DAY_MS = 24 * 3600_000;

interface StockRow {
  ticker: string;
  name: string;
  kind: "stock" | "crypto";
  day_open: number;
}

const tickers = () =>
  db().prepare("SELECT ticker, name, kind, day_open FROM stocks ORDER BY sort").all() as unknown as StockRow[];

function randn(): number {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

/** Keep about five significant digits so DOGE does not collapse to 0.31. */
function round(p: number): number {
  return p >= 10 ? Math.round(p * 100) / 100 : Number(p.toPrecision(5));
}

/** Latest price at or before t, or null if the ticker has no tick yet. */
function priceAt(ticker: string, t: number): number | null {
  const row = db()
    .prepare("SELECT price FROM stock_ticks WHERE ticker = ? AND t <= ? ORDER BY t DESC, id DESC LIMIT 1")
    .get(ticker, t) as { price: number } | undefined;
  return row ? row.price : null;
}

const insertTick = () =>
  db().prepare(
    "INSERT INTO stock_ticks (ticker, t, price, pct, reason, storyline_id) VALUES (?, ?, ?, ?, ?, ?)",
  );

// ------------------------------------------------------------------ live quotes

async function liveQuote(ticker: string, kind: "stock" | "crypto"): Promise<number | null> {
  const symbol = kind === "crypto" ? `${ticker}-USD` : ticker;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { signal: AbortSignal.timeout(4_000), headers: { "user-agent": "Mozilla/5.0 (compatible; Tangents/1.0)" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } };
    const p = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof p === "number" && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** Best effort: replace the seeded opening prices with live quotes. Only acts
 *  before any story has moved a price. Never throws. */
export async function primeQuotes(): Promise<void> {
  try {
    const moved = db().prepare("SELECT 1 FROM stock_ticks WHERE reason IS NOT NULL LIMIT 1").get();
    if (moved) return;
    const rows = tickers();
    const quotes = await Promise.all(rows.map((r) => liveQuote(r.ticker, r.kind)));
    const t = now();
    tx(() => {
      rows.forEach((r, i) => {
        const p = quotes[i];
        if (p === null) return;
        const price = round(p);
        // Drop the seeded and back-filled points so the history does not jump.
        db().prepare("DELETE FROM stock_ticks WHERE ticker = ? AND reason IS NULL").run(r.ticker);
        db().prepare("UPDATE stocks SET day_open = ? WHERE ticker = ?").run(price, r.ticker);
        insertTick().run(r.ticker, t, price, null, null, null);
      });
    });
  } catch (err) {
    console.error("primeQuotes failed", err);
  }
}

// ---------------------------------------------------------------------- history

/** Give every ticker enough back-history for a sparkline. Idempotent. */
export function ensureStockHistory(): void {
  const count = db().prepare("SELECT COUNT(*) AS n, MIN(t) AS t0 FROM stock_ticks WHERE ticker = ?");
  const first = db().prepare("SELECT price FROM stock_ticks WHERE ticker = ? ORDER BY t, id LIMIT 1");
  const ins = insertTick();
  tx(() => {
    for (const s of tickers()) {
      const c = count.get(s.ticker) as { n: number; t0: number | null };
      if (c.t0 === null || c.n >= HISTORY_POINTS) continue;
      const sigma = s.kind === "crypto" ? 0.008 : 0.004;
      let price = (first.get(s.ticker) as { price: number }).price;
      // Walk backwards from the earliest tick so the series ends at the current price.
      for (let k = 1; k <= HISTORY_POINTS - c.n; k++) {
        price = Math.max(price * (1 - sigma * randn()), 1e-6);
        ins.run(s.ticker, c.t0 - k * SPACING_MS, round(price), null, null, null);
      }
    }
  });
}

// ------------------------------------------------------------------------ moves

/** Schedule story-driven moves to land around `at` (simulation ms). */
export function scheduleMoves(
  moves: { ticker: string; pct: number; reason: string }[],
  at: number,
  storylineId: number | null,
): void {
  const ins = insertTick();
  tx(() => {
    for (const m of moves) {
      // Include earlier steps scheduled in the same window so moves on one ticker compound.
      const base = priceAt(m.ticker, at + MOVE_MS);
      if (base === null) continue;
      const target = round(base * (1 + m.pct / 100));
      const steps = 3 + Math.floor(Math.random() * 2);
      for (let i = 1; i <= steps; i++) {
        const last = i === steps;
        const frac = i / steps;
        const t = at + Math.round(MOVE_MS * frac);
        const wobble = last ? 0 : (Math.abs(target - base) || base * 0.002) * 0.15 * randn();
        const price = last ? target : round(base + (target - base) * frac + wobble);
        ins.run(m.ticker, t, price, last ? m.pct : null, last ? m.reason : null, last ? storylineId : null);
      }
      // A back-dated move (first-run history) lands before ticks that already
      // exist; carry it through them so the price stays moved.
      db()
        .prepare("UPDATE stock_ticks SET price = price * ? WHERE ticker = ? AND t > ?")
        .run(1 + m.pct / 100, m.ticker, at + MOVE_MS);
    }
  });
}

/** Add a little random movement to every ticker at `at`. Called once per tick. */
export function noiseTick(at: number): void {
  const ins = insertTick();
  tx(() => {
    for (const s of tickers()) {
      const base = priceAt(s.ticker, at);
      if (base === null) continue;
      const sigma = s.kind === "crypto" ? 0.004 : 0.0015;
      ins.run(s.ticker, at, round(base * (1 + sigma * randn())), null, null, null);
    }
  });
}

/** Reset each ticker's daily baseline to its current price ("Skip a day"). */
export function startNewDay(): void {
  const t = now();
  tx(() => {
    for (const s of tickers()) {
      const p = priceAt(s.ticker, t);
      if (p !== null) db().prepare("UPDATE stocks SET day_open = ? WHERE ticker = ?").run(p, s.ticker);
    }
  });
}

// ------------------------------------------------------------------------ reads

/** Current state of every ticker (or the first `limit`), in display order. */
export function stockViews(limit?: number): StockView[] {
  const t = now();
  const hist = db().prepare(
    "SELECT price FROM stock_ticks WHERE ticker = ? AND t <= ? ORDER BY t DESC, id DESC LIMIT ?",
  );
  const reason = db().prepare(
    `SELECT reason FROM stock_ticks WHERE ticker = ? AND reason IS NOT NULL AND t <= ? AND t > ?
     ORDER BY t DESC, id DESC LIMIT 1`,
  );
  const rows = limit === undefined ? tickers() : tickers().slice(0, limit);
  const out: StockView[] = [];
  for (const s of rows) {
    const prices = (hist.all(s.ticker, t, HISTORY_POINTS) as { price: number }[]).map((r) => r.price).reverse();
    if (prices.length === 0) continue;
    const price = prices[prices.length - 1];
    const r = reason.get(s.ticker, t, t - DAY_MS) as { reason: string } | undefined;
    out.push({
      ticker: s.ticker,
      name: s.name,
      kind: s.kind,
      price,
      dayOpen: s.day_open,
      changePct: s.day_open > 0 ? (price / s.day_open - 1) * 100 : 0,
      history: prices,
      lastReason: r ? r.reason : null,
    });
  }
  return out;
}

/** Story-driven moves that have already happened, newest first. */
export function recentMoves(limit = 30): StockMove[] {
  const rows = db()
    .prepare(
      `SELECT ticker, t, price, pct, reason, storyline_id FROM stock_ticks
       WHERE reason IS NOT NULL AND t <= ? ORDER BY t DESC, id DESC LIMIT ?`,
    )
    .all(now(), limit) as {
    ticker: string;
    t: number;
    price: number;
    pct: number | null;
    reason: string;
    storyline_id: number | null;
  }[];
  return rows.map((r) => ({
    ticker: r.ticker,
    t: r.t,
    price: r.price,
    pct: r.pct ?? 0,
    reason: r.reason,
    storylineId: r.storyline_id,
  }));
}

export function digestStocks(): WorldDigest["stocks"] {
  return stockViews().map((s) => ({ ticker: s.ticker, price: s.price, changePct: s.changePct }));
}

