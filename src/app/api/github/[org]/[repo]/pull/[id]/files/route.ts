import { NextRequest, NextResponse } from 'next/server';
import { getRepoAuth } from '@/features/auth/auth';
import { fetchPRFiles } from '@/features/github/api/pulls';
import { GitHubApiError } from '@/features/github/api/client';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
  }>;
}

/**
 * GET /api/github/[org]/[repo]/pull/[id]/files
 *
 * Returns the list of files changed in a PR with metadata
 * (additions, deletions, status, patch).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { org, repo, id } = await params;

  const repoAuth = await getRepoAuth(org, repo);
  if (!repoAuth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { token } = repoAuth;
  const prNumber = parseInt(id, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    return NextResponse.json(
      { error: 'Invalid PR number' },
      { status: 400 },
    );
  }

  try {
    const files = await fetchPRFiles(token, org, repo, prNumber);
    return NextResponse.json({ files });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error(`[api/github/${org}/${repo}/pull/${id}/files] Unexpected error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
