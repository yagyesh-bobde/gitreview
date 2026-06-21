/**
 * Redis-backed ETag cache for GitHub conditional requests.
 *
 * When GitHub returns an ETag header, we store it (with the response body)
 * keyed by URL + a hash of the token. On subsequent requests we send
 * If-None-Match, and if we get 304 Not Modified we return the cached body --
 * saving transfer bandwidth and NOT counting against the rate limit
 * (conditional requests that return 304 are free).
 *
 * This lives in Redis (not process memory) so it survives serverless cold
 * starts and is shared across all lambda instances -- the in-memory version
 * was effectively useless on Vercel, where every cold container started with
 * an empty cache and every "conditional" request was actually a full fetch.
 */

import { redisGet, redisSet } from '@/lib/redis';
import { tokenHash } from '@/lib/crypto';

interface ETagEntry {
  etag: string;
  body: unknown;
}

/** How long an entry lives in Redis before it must be re-fetched (10 min). */
const TTL_SECONDS = 10 * 60;

function cacheKey(url: string, token: string): string {
  // Hash the token so different users never share cached data, and so we
  // never persist the raw token in a cache key.
  return `gh:etag:${tokenHash(token)}:${url}`;
}

/**
 * Read the stored ETag + body for a URL, if any.
 */
async function getEntry(url: string, token: string): Promise<ETagEntry | null> {
  return redisGet<ETagEntry>(cacheKey(url, token));
}

/**
 * Get the stored ETag for a URL, if any.
 */
export async function getETag(url: string, token: string): Promise<string | null> {
  const entry = await getEntry(url, token);
  return entry?.etag ?? null;
}

/**
 * Get the cached body for a URL (used when we receive 304).
 */
export async function getCachedBody<T>(url: string, token: string): Promise<T | null> {
  const entry = await getEntry(url, token);
  return entry ? (entry.body as T) : null;
}

/**
 * Store an ETag and its associated response body.
 */
export async function setETagCache(
  url: string,
  token: string,
  etag: string,
  body: unknown,
): Promise<void> {
  await redisSet<ETagEntry>(cacheKey(url, token), { etag, body }, TTL_SECONDS);
}
