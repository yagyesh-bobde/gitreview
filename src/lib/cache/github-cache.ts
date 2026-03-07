/**
 * GitHub-specific caching layer built on top of Upstash Redis.
 *
 * Key schema: gh:{resource}:{owner}/{repo}/{...identifiers}
 * All values are JSON-serialized with a TTL.
 */

import { CACHE_TTL_SECONDS } from '@/config/constants';
import { redisGet, redisSet, redisDelPattern } from '@/lib/redis';

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

export function prKey(owner: string, repo: string, prNumber: number): string {
  return `gh:pr:${owner}/${repo}/${prNumber}`;
}

export function prFilesKey(owner: string, repo: string, prNumber: number): string {
  return `gh:pr-files:${owner}/${repo}/${prNumber}`;
}

export function prDiffKey(owner: string, repo: string, prNumber: number, filename: string): string {
  return `gh:pr-diff:${owner}/${repo}/${prNumber}:${filename}`;
}

export function prCommentsKey(owner: string, repo: string, prNumber: number): string {
  return `gh:pr-comments:${owner}/${repo}/${prNumber}`;
}

export function userPRsKey(userLogin: string): string {
  return `gh:user-prs:${userLogin}`;
}

export function fileContentKey(owner: string, repo: string, ref: string, path: string): string {
  return `gh:content:${owner}/${repo}/${ref}:${path}`;
}

// ---------------------------------------------------------------------------
// Cache operations
// ---------------------------------------------------------------------------

type CacheResource = keyof typeof CACHE_TTL_SECONDS;

/**
 * Attempt to read a cached value. Returns null on miss.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  return redisGet<T>(key);
}

/**
 * Write a value to cache with the appropriate TTL for the resource type.
 */
export async function setCached<T>(key: string, value: T, resource: CacheResource): Promise<void> {
  const ttl = CACHE_TTL_SECONDS[resource];
  await redisSet(key, value, ttl);
}

/**
 * Invalidate all cached data for a specific PR.
 * Called when we know data has changed (e.g. after posting a comment).
 */
export async function invalidatePR(owner: string, repo: string, prNumber: number): Promise<void> {
  await Promise.all([
    redisDelPattern(`gh:pr:${owner}/${repo}/${prNumber}`),
    redisDelPattern(`gh:pr-files:${owner}/${repo}/${prNumber}`),
    redisDelPattern(`gh:pr-diff:${owner}/${repo}/${prNumber}:*`),
    redisDelPattern(`gh:pr-comments:${owner}/${repo}/${prNumber}`),
  ]);
}

/**
 * Invalidate all cached user PR lists (e.g. after a new PR is opened).
 */
export async function invalidateUserPRs(userLogin: string): Promise<void> {
  await redisDelPattern(`gh:user-prs:${userLogin}`);
}
