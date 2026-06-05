type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const MAX_CACHE_SIZE = 500;
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL = 30_000; // 30 seconds

function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > DEFAULT_TTL) {
      cache.delete(key);
    }
  }
}

/**
 * Deduplicates and caches async function calls.
 * Concurrent calls with the same key share a single in-flight request.
 * Results are cached for `ttl` milliseconds.
 */
export function cachedRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (cached && now - cached.timestamp < ttl) {
    return Promise.resolve(cached.data);
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  // Evict if over max size
  if (cache.size >= MAX_CACHE_SIZE) {
    evictExpired();
    // If still over, delete oldest entries
    if (cache.size >= MAX_CACHE_SIZE) {
      const keysToDelete = Array.from(cache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE / 4));
      for (const k of keysToDelete) cache.delete(k);
    }
  }

  const promise = fn()
    .then((result) => {
      cache.set(key, { data: result, timestamp: Date.now() });
      inflight.delete(key);
      return result;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
