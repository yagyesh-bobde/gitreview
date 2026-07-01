import { NextRequest, NextResponse } from 'next/server';
import { getRepoAuth } from '@/features/auth/auth';
import { fetchRawFile } from '@/features/github/api/contents';
import { GitHubApiError } from '@/features/github/api/client';

export const maxDuration = 60;

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
  }>;
}

/**
 * GET /api/github/[org]/[repo]/raw?path=path/to/asset.png&ref=<sha|branch>
 *
 * Streams the raw bytes of a file at a given ref with the correct Content-Type.
 * Used by the diff viewer to render binary assets (images) inline. Access is
 * gated by the same per-repo auth as the rest of the GitHub proxy, so private
 * repo assets are never exposed without authorization.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { org, repo } = await params;

  const repoAuth = await getRepoAuth(org, repo);
  if (!repoAuth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { token } = repoAuth;

  const path = request.nextUrl.searchParams.get('path');
  const ref = request.nextUrl.searchParams.get('ref');
  if (!path || !ref) {
    return NextResponse.json(
      { error: 'Missing required query parameters: path and ref' },
      { status: 400 },
    );
  }

  try {
    const { body, contentType } = await fetchRawFile(token, org, repo, ref, path);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // A blob at a fixed ref is immutable, so cache aggressively. When ref
        // is a branch name rather than a sha this is slightly optimistic, but
        // the diff viewer always passes commit shas.
        'Cache-Control': 'private, max-age=3600, immutable',
        'Content-Disposition': 'inline',
      },
    });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[api/github/${org}/${repo}/raw] Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
