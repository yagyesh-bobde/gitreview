import { NextResponse, after } from 'next/server';
import { auth, getAllTokens } from '@/features/auth/auth';
import { listUserPRs } from '@/features/github/api/pulls';
import { GitHubApiError } from '@/features/github/api/client';
import { mapWithConcurrency } from '@/features/github/utils/concurrency';
import { redisGet, redisSet, redisSetNX } from '@/lib/redis';
import type { PullRequest } from '@/types/pr';

// This route fans out to GitHub per linked account; give it headroom.
export const maxDuration = 60;

// Stale-while-revalidate windows for the per-user PR list.
const SOFT_TTL_MS = 45_000; // serve fresh under this age
const HARD_TTL_SECONDS = 600; // Redis entry lifetime
const ACCOUNT_CONCURRENCY = 4; // cap parallel per-account fetches

type AccountStatus = { login: string; status: 'ok' | 'error'; error?: string };

interface PRPayload {
  prs: PullRequest[];
  githubLogins: string[];
  accountStatuses: AccountStatus[];
}

interface CachedPRs {
  payload: PRPayload;
  ts: number;
}

function prsCacheKey(userId: string): string {
  return `gh:user-prs:v2:${userId}`;
}

function prsLockKey(userId: string): string {
  return `gh:user-prs:lock:${userId}`;
}

/**
 * Fetch + merge open PRs across all of the user's linked accounts.
 * Per-account failures (e.g. revoked token) are isolated and reported.
 */
async function computePRPayload(userId: string): Promise<PRPayload> {
  const accounts = await getAllTokens(userId);
  if (accounts.length === 0) {
    throw new GitHubApiError(401, 'No linked GitHub accounts');
  }

  const results = await mapWithConcurrency(accounts, ACCOUNT_CONCURRENCY, async ({ login, token }) => {
    try {
      const prs = await listUserPRs(token);
      return {
        login,
        status: 'ok' as const,
        prs: prs.map((pr) => ({ ...pr, accountLogin: login })),
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[api/github/prs] Account @${login} fetch failed:`, err);
      return { login, status: 'error' as const, error: reason, prs: [] as PullRequest[] };
    }
  });

  const accountStatuses: AccountStatus[] = results.map((r) =>
    r.status === 'ok'
      ? { login: r.login, status: 'ok' }
      : { login: r.login, status: 'error', error: r.error },
  );

  // Deduplicate by PR id (same PR may be visible from multiple accounts).
  const seen = new Set<number>();
  const merged: PullRequest[] = [];
  for (const r of results) {
    for (const pr of r.prs) {
      if (seen.has(pr.id)) continue;
      seen.add(pr.id);
      merged.push(pr);
    }
  }

  merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return { prs: merged, githubLogins: accounts.map((a) => a.login), accountStatuses };
}

/**
 * GET /api/github/prs
 *
 * Returns open PRs across ALL linked GitHub accounts (authored + review-requested
 * + involves), deduplicated by PR id. Backed by a stale-while-revalidate cache:
 * fresh results are served instantly, stale results are served instantly while a
 * single-flight background refresh runs after the response.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const cacheKey = prsCacheKey(userId);

  try {
    const cached = await redisGet<CachedPRs>(cacheKey);

    if (cached) {
      const age = Date.now() - cached.ts;

      if (age >= SOFT_TTL_MS) {
        // Stale: serve immediately, refresh in the background (single-flight
        // via an NX lock so concurrent stale hits don't all recompute).
        after(async () => {
          const locked = await redisSetNX(prsLockKey(userId), '1', 30);
          if (!locked) return;
          try {
            const fresh = await computePRPayload(userId);
            await redisSet<CachedPRs>(cacheKey, { payload: fresh, ts: Date.now() }, HARD_TTL_SECONDS);
          } catch (err) {
            console.warn(
              '[api/github/prs] background refresh failed:',
              err instanceof Error ? err.message : err,
            );
          }
        });
      }

      return NextResponse.json({
        ...cached.payload,
        cache: age < SOFT_TTL_MS ? 'fresh' : 'stale',
      });
    }

    // Cache miss: compute synchronously and store.
    const payload = await computePRPayload(userId);
    await redisSet<CachedPRs>(cacheKey, { payload, ts: Date.now() }, HARD_TTL_SECONDS);
    return NextResponse.json({ ...payload, cache: 'miss' });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[api/github/prs] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
