/**
 * Simple in-memory rate limiter for server actions.
 * Uses a sliding window approach per key.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leak (runs every 60s)
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., IP + action name, or email)
 * @param limit - Max number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { success: true } if allowed, { success: false, retryAfterMs } if blocked
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: true } | { success: false; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (entry.count >= limit) {
    return { success: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { success: true };
}
