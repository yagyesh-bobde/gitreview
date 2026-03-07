/**
 * Upstash Redis singleton.
 *
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 * In development without Redis configured, operations silently no-op
 * so the app still works (just without server-side caching).
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set -- caching disabled');
    }
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

/**
 * Type-safe GET with JSON deserialization.
 * Returns null if key doesn't exist or Redis is unavailable.
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (err) {
    console.error('[redis] GET failed:', key, err);
    return null;
  }
}

/**
 * Type-safe SET with TTL (seconds).
 * Silently no-ops if Redis is unavailable.
 */
export async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error('[redis] SET failed:', key, err);
  }
}

/**
 * Delete a key. Returns true if the key was deleted.
 */
export async function redisDel(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    const result = await client.del(key);
    return result > 0;
  } catch (err) {
    console.error('[redis] DEL failed:', key, err);
    return false;
  }
}

/**
 * Delete keys matching a pattern (e.g. "gh:pr:owner/repo/*").
 * Uses SCAN to avoid blocking the server.
 */
export async function redisDelPattern(pattern: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;

  try {
    let deleted = 0;
    // First scan
    let scanResult = await client.scan(0, { match: pattern, count: 100 });

    while (true) {
      const keys = scanResult[1] as string[];
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }
        await pipeline.exec();
        deleted += keys.length;
      }

      const nextCursor = String(scanResult[0]);
      if (nextCursor === '0') break;

      scanResult = await client.scan(Number(nextCursor), { match: pattern, count: 100 });
    }

    return deleted;
  } catch (err) {
    console.error('[redis] DEL pattern failed:', pattern, err);
    return 0;
  }
}
