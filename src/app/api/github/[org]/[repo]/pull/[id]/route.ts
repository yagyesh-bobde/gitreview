import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/features/auth/auth';
import { fetchPR } from '@/features/github/api/pulls';
import { GitHubApiError } from '@/features/github/api/client';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
  }>;
}

/**
 * GET /api/github/[org]/[repo]/pull/[id]
 *
 * Returns full PR metadata (title, author, status, reviewers, etc.).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const { org, repo, id } = await params;
  const prNumber = parseInt(id, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    return NextResponse.json(
      { error: 'Invalid PR number' },
      { status: 400 },
    );
  }

  try {
    const pr = await fetchPR(token, org, repo, prNumber);
    return NextResponse.json({ pr });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error(`[api/github/${org}/${repo}/pull/${id}] Unexpected error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
