import { NextRequest, NextResponse } from 'next/server';
import { getRepoAuth } from '@/features/auth/auth';
import { invalidatePR } from '@/lib/cache/github-cache';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
  }>;
}

/**
 * POST /api/github/[org]/[repo]/pull/[id]/refresh
 *
 * Drops the server-side cache (metadata, files, diffs, comments) for a PR so
 * the Refresh banner's refetch reads GitHub instead of a stale Redis copy.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { org, repo, id } = await params;

  if (!(await getRepoAuth(org, repo))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const prNumber = parseInt(id, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
  }

  await invalidatePR(org, repo, prNumber);
  return new NextResponse(null, { status: 204 });
}
