import { NextRequest, NextResponse } from 'next/server';
import { getRepoAuth } from '@/features/auth/auth';
import { fetchFileDiff } from '@/features/github/api/pulls';
import { GitHubApiError } from '@/features/github/api/client';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
  }>;
}

/**
 * GET /api/github/[org]/[repo]/pull/[id]/diff?file=path/to/file.ts
 *
 * Returns a parsed FileDiff for the specified file in the PR.
 * The `file` query parameter is required.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const filename = request.nextUrl.searchParams.get('file');
  if (!filename) {
    return NextResponse.json(
      { error: 'Missing required query parameter: file' },
      { status: 400 },
    );
  }

  try {
    const diff = await fetchFileDiff(token, org, repo, prNumber, filename);
    return NextResponse.json({ diff });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error(`[api/github/${org}/${repo}/pull/${id}/diff] Unexpected error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
