/**
 * In-memory ETag cache for GitHub conditional requests.
 *
 * When GitHub returns an ETag header, we store it keyed by URL + token.
 * On subsequent requests we send If-None-Match, and if we get 304 Not Modified
 * we return the cached body -- saving transfer bandwidth and not counting
 * against the rate limit (conditional requests that return 304 are free).
 */

interface ETagEntry {
  etag: string;
  body: unknown;
  cachedAt: number;
}

/** Max age before an entry is considered stale and eligible for eviction (10 min) */
const MAX_AGE_MS = 10 * 60 * 1000;

/** Max entries before we prune oldest */
const MAX_ENTRIES = 500;

const cache = new Map<string, ETagEntry>();

function cacheKey(url: string, token: string): string {
  // Include a token prefix so different users don't share cached data
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
  }
  return `${hash.toString(36)}:${url}`;
}

/**
 * Get the stored ETag for a URL, if any.
 */
export function getETag(url: string, token: string): string | null {
  const entry = cache.get(cacheKey(url, token));
  if (!entry) return null;

  // Evict stale entries
  if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
    cache.delete(cacheKey(url, token));
    return null;
  }

  return entry.etag;
}

/**
 * Get the cached body for a URL (used when we receive 304).
 */
export function getCachedBody<T>(url: string, token: string): T | null {
  const entry = cache.get(cacheKey(url, token));
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
    cache.delete(cacheKey(url, token));
    return null;
  }

  return entry.body as T;
}

/**
 * Store an ETag and its associated response body.
 */
export function setETagCache(url: string, token: string, etag: string, body: unknown): void {
  // Prune if we're at capacity
  if (cache.size >= MAX_ENTRIES) {
    pruneOldest();
  }

  cache.set(cacheKey(url, token), {
    etag,
    body,
    cachedAt: Date.now(),
  });
}

/**
 * Remove the oldest half of entries when we exceed capacity.
 */
function pruneOldest(): void {
  const entries = [...cache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
  const toRemove = Math.floor(entries.length / 2);
  for (let i = 0; i < toRemove; i++) {
    cache.delete(entries[i][0]);
  }
}

/**
 * Clear all cached entries (useful for testing or logout).
 */
export function clearETagCache(): void {
  cache.clear();
}
