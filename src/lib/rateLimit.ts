/**
 * Minimal fixed-window rate limiter (in-memory, per key).
 * Sufficient for a single server instance; use a shared store when scaling out.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now: number = Date.now()): { allowed: boolean; retryAfterSec: number; remaining: number } {
    // Opportunistic cleanup keeps the map from growing without bound.
    if (hits.size > 5_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
    }
    if (entry.count >= limit) {
      return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000), remaining: 0 };
    }
    entry.count += 1;
    return { allowed: true, retryAfterSec: 0, remaining: limit - entry.count };
  };
}
