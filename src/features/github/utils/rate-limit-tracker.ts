/**
 * In-memory tracker for GitHub API rate limit state.
 * Updated from response headers on every API call.
 * Keyed by access token hash so multiple users don't collide in-process.
 */

import type { GitHubRateLimit } from '@/features/github/api/types';

interface RateLimitEntry {
  limit: number;
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
  used: number;
  updatedAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Derive a short key from the token. We don't store the token itself.
 * This is NOT cryptographic -- it's just a collision-resistant in-memory key.
 */
function tokenKey(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
  }
  return `rl:${hash.toString(36)}`;
}

/**
 * Update rate limit state from a GitHub API response.
 */
export function updateRateLimit(token: string, rateLimit: GitHubRateLimit): void {
  store.set(tokenKey(token), {
    limit: rateLimit.limit,
    remaining: rateLimit.remaining,
    reset: rateLimit.reset,
    used: rateLimit.used,
    updatedAt: Date.now(),
  });
}

/**
 * Get the current rate limit state for a token.
 * Returns null if we haven't seen a response for this token yet.
 */
export function getRateLimit(token: string): RateLimitEntry | null {
  return store.get(tokenKey(token)) ?? null;
}

/**
 * Check whether we should hold off on making requests.
 * Returns the number of milliseconds to wait, or 0 if clear to proceed.
 */
export function getRateLimitDelay(token: string): number {
  const entry = store.get(tokenKey(token));
  if (!entry) return 0;

  // If we still have budget, proceed
  if (entry.remaining > 0) return 0;

  const now = Math.floor(Date.now() / 1000);
  const waitSeconds = entry.reset - now;

  // If the reset time has passed, the window has refreshed
  if (waitSeconds <= 0) return 0;

  return waitSeconds * 1000;
}

/**
 * Parse rate limit info from GitHub response headers.
 */
export function parseRateLimitHeaders(headers: Headers): GitHubRateLimit {
  return {
    limit: parseInt(headers.get('x-ratelimit-limit') ?? '5000', 10),
    remaining: parseInt(headers.get('x-ratelimit-remaining') ?? '5000', 10),
    reset: parseInt(headers.get('x-ratelimit-reset') ?? '0', 10),
    used: parseInt(headers.get('x-ratelimit-used') ?? '0', 10),
  };
}
