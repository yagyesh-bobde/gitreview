/**
 * Redis singleton (ioredis / standard RESP protocol).
 *
 * Reads REDIS_URL from env (e.g. redis://default:password@host:6379, or
 * rediss://... for TLS). If unset, all operations silently no-op so the app
 * still works without server-side caching (e.g. in local dev).
 *
 * Resilience: a remote/self-hosted Redis can be slow or briefly unreachable.
 * We must never let that hang a request. Two safeguards:
 *   1. commandTimeout — any single command fails fast instead of hanging.
 *   2. a circuit breaker — once a command fails, we skip Redis entirely for a
 *      short cooldown so the app runs at full speed (cache-less) instead of
 *      paying a timeout on every call until Redis recovers.
 *
 * Serverless note: on Vercel each warm lambda instance reuses one connection
 * via a global; lazyConnect keeps module import cheap.
 */

import Redis, { type RedisOptions } from 'ioredis';

const globalForRedis = globalThis as unknown as {
  __redisClient?: Redis | null;
};

// --- Circuit breaker -------------------------------------------------------
const BREAKER_COOLDOWN_MS = 10_000;
let circuitOpenUntil = 0;

function breakerOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}
function tripBreaker(): void {
  circuitOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
}

function createClient(): Redis | null {
  const url = process.env.REDIS_URL;

  if (!url) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[redis] REDIS_URL not set -- caching disabled');
    }
    return null;
  }

  const options: RedisOptions = {
    lazyConnect: true,
    // Fail a single command fast rather than hang a request on a stalled host.
    commandTimeout: 2000,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    enableAutoPipelining: true,
    retryStrategy(times) {
      if (times > 5) return null; // stop reconnecting; operations no-op
      return Math.min(times * 200, 2000);
    },
  };

  const client = new Redis(url, options);

  client.on('error', (err) => {
    // Trip the breaker so we stop hitting a dead host on every request.
    tripBreaker();
    console.error('[redis] connection error:', err.message);
  });

  return client;
}

export function getRedis(): Redis | null {
  if (globalForRedis.__redisClient !== undefined) {
    return globalForRedis.__redisClient;
  }
  const client = createClient();
  globalForRedis.__redisClient = client;
  return client;
}

/**
 * Type-safe GET with JSON deserialization.
 * Returns null on miss, when Redis is unavailable, or when the breaker is open.
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  if (breakerOpen()) return null;
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  } catch (err) {
    tripBreaker();
    console.error('[redis] GET failed:', key, err);
    return null;
  }
}

/**
 * Type-safe SET with TTL (seconds). Silently no-ops if unavailable.
 */
export async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (breakerOpen()) return;
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    tripBreaker();
    console.error('[redis] SET failed:', key, err);
  }
}

/**
 * SET only if the key does not already exist (NX), with a TTL.
 * Returns true if the key was set (lock acquired), false otherwise.
 */
export async function redisSetNX<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  if (breakerOpen()) return false;
  const client = getRedis();
  if (!client) return false;

  try {
    const result = await client.set(key, JSON.stringify(value), 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    tripBreaker();
    console.error('[redis] SET NX failed:', key, err);
    return false;
  }
}

/**
 * Delete a key. Returns true if the key was deleted.
 */
export async function redisDel(key: string): Promise<boolean> {
  if (breakerOpen()) return false;
  const client = getRedis();
  if (!client) return false;

  try {
    const result = await client.del(key);
    return result > 0;
  } catch (err) {
    tripBreaker();
    console.error('[redis] DEL failed:', key, err);
    return false;
  }
}

/**
 * Delete keys matching a pattern (e.g. "gh:pr:owner/repo/*").
 * Uses SCAN to avoid blocking the server.
 */
export async function redisDelPattern(pattern: string): Promise<number> {
  if (breakerOpen()) return 0;
  const client = getRedis();
  if (!client) return 0;

  try {
    let deleted = 0;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      if (keys.length > 0) {
        deleted += await client.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== '0');

    return deleted;
  } catch (err) {
    tripBreaker();
    console.error('[redis] DEL pattern failed:', pattern, err);
    return 0;
  }
}
