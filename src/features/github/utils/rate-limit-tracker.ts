/**
 * Redis-backed tracker for GitHub API rate limit state.
 *
 * Updated from response headers on every API call and keyed by a hash of the
 * access token. Living in Redis (not process memory) makes the accounting
 * GLOBAL across all serverless instances -- the previous in-memory Map could
 * only ever see one lambda's view, so it neither prevented hitting GitHub's
 * account-wide limit nor reliably reflected the real remaining budget.
 */

import type { GitHubRateLimit } from '@/features/github/api/types';
import { redisGet, redisSet } from '@/lib/redis';
import { tokenHash } from '@/lib/crypto';

interface RateLimitEntry {
  limit: number;
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
  used: number;
}

function tokenKey(token: string): string {
  return `gh:ratelimit:${tokenHash(token)}`;
}

/**
 * Update rate limit state from a GitHub API response.
 * TTL'd until just past the reset time so stale state expires on its own.
 */
export async function updateRateLimit(token: string, rateLimit: GitHubRateLimit): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, (rateLimit.reset || now + 60) - now + 5);
  await redisSet<RateLimitEntry>(
    tokenKey(token),
    {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
      used: rateLimit.used,
    },
    ttl,
  );
}

/**
 * Get the current rate limit state for a token.
 * Returns null if we haven't seen a response for this token yet.
 */
export async function getRateLimit(token: string): Promise<RateLimitEntry | null> {
  return redisGet<RateLimitEntry>(tokenKey(token));
}

/**
 * Check whether we should hold off on making requests.
 * Returns the number of milliseconds to wait, or 0 if clear to proceed.
 */
export async function getRateLimitDelay(token: string): Promise<number> {
  const entry = await redisGet<RateLimitEntry>(tokenKey(token));
  if (!entry) return 0;

  // If we still have budget, proceed.
  if (entry.remaining > 0) return 0;

  const now = Math.floor(Date.now() / 1000);
  const waitSeconds = entry.reset - now;

  // If the reset time has passed, the window has refreshed.
  if (waitSeconds <= 0) return 0;

  return waitSeconds * 1000;
}

/**
 * Parse rate limit info from GitHub response headers. (Pure, synchronous.)
 */
export function parseRateLimitHeaders(headers: Headers): GitHubRateLimit {
  return {
    limit: parseInt(headers.get('x-ratelimit-limit') ?? '5000', 10),
    remaining: parseInt(headers.get('x-ratelimit-remaining') ?? '5000', 10),
    reset: parseInt(headers.get('x-ratelimit-reset') ?? '0', 10),
    used: parseInt(headers.get('x-ratelimit-used') ?? '0', 10),
  };
}
