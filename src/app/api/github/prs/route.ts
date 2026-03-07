import { NextResponse } from 'next/server';
import { auth, getAllTokens } from '@/features/auth/auth';
import { listUserPRs } from '@/features/github/api/pulls';
import { GitHubApiError } from '@/features/github/api/client';
import type { PullRequest } from '@/types/pr';

/**
 * GET /api/github/prs
 *
 * Returns open PRs across ALL linked GitHub accounts (authored + review-requested).
 * Deduplicates by PR id since the same PR may be visible from multiple accounts.
 * Returns `githubLogins` so the dashboard can filter "created by me" / "review requested"
 * against all of the user's linked accounts.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  try {
    const accounts = await getAllTokens(userId);

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No linked GitHub accounts' },
        { status: 401 },
      );
    }

    // Fetch PRs from all accounts in parallel.
    // If one account fails (e.g. revoked token), log it and continue with the rest.
    const results = await Promise.allSettled(
      accounts.map(async ({ login, token }) => {
        const prs = await listUserPRs(token);
        // Tag each PR with the account that fetched it
        return prs.map((pr) => ({ ...pr, accountLogin: login }));
      }),
    );

    // Merge results, deduplicate by PR id (keep first occurrence)
    const seen = new Set<number>();
    const merged: PullRequest[] = [];

    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('[api/github/prs] Account fetch failed:', result.reason);
        continue;
      }
      for (const pr of result.value) {
        if (seen.has(pr.id)) continue;
        seen.add(pr.id);
        merged.push(pr);
      }
    }

    // Sort by updatedAt descending (most recent first)
    merged.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const githubLogins = accounts.map((a) => a.login);

    return NextResponse.json({ prs: merged, githubLogins });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error('[api/github/prs] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
