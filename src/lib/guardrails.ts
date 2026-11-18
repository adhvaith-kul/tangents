// Production guardrails: rate limiting, DDoS defense, and LLM cost protection.
// Server-only: operates in memory with fallback to database usage tracking.
import { db, now } from "./db";
import { getSettings } from "./settings";

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// Token-bucket storage keyed by client identifier (IP or user handle)
const BUCKETS = new Map<string, RateLimitEntry>();

// Global daily token safety ceiling (default 500k tokens per day if not set)
const DEFAULT_MAX_DAILY_TOKENS = 500_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Token-bucket rate limiter.
 * @param key unique identifier (e.g. IP + endpoint)
 * @param maxCapacity bucket size (burst allowance)
 * @param refillPerSec tokens added per second
 */
export function checkRateLimit(key: string, maxCapacity = 20, refillPerSec = 2): RateLimitResult {
  const t = Date.now();
  let bucket = BUCKETS.get(key);

  if (!bucket) {
    bucket = { tokens: maxCapacity - 1, lastRefill: t };
    BUCKETS.set(key, bucket);
    return { ok: true, remaining: maxCapacity - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsedSec = (t - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxCapacity, bucket.tokens + elapsedSec * refillPerSec);
  bucket.lastRefill = t;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { ok: true, remaining: Math.floor(bucket.tokens) };
  }

  const waitMs = Math.ceil(((1 - bucket.tokens) / refillPerSec) * 1000);
  return { ok: false, remaining: 0, retryAfterMs: waitMs };
}

/**
 * Check if the world or user has exceeded the daily LLM token safety budget.
 */
export function isLlmBudgetExceeded(): { exceeded: boolean; usedTokens: number; limit: number } {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const startOfDay = d.getTime();

  const settings = getSettings();
  const limit = settings.budget > 0 ? settings.budget * 1000 : DEFAULT_MAX_DAILY_TOKENS;

  const row = db()
    .prepare(
      `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS total
       FROM llm_calls WHERE created_at >= ?`
    )
    .get(startOfDay) as { total: number } | undefined;

  const usedTokens = row?.total ?? 0;
  return {
    exceeded: usedTokens >= limit,
    usedTokens,
    limit,
  };
}

/** Clean up stale rate limit buckets periodically */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 300_000; // 5 minutes inactive
    for (const [k, v] of BUCKETS.entries()) {
      if (v.lastRefill < cutoff) BUCKETS.delete(k);
    }
  }, 60_000);
}
