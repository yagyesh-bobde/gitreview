import { NextRequest, NextResponse } from 'next/server';
import { getRepoAuth } from '@/features/auth/auth';
import { submitReview } from '@/features/github/api/comments';
import { GitHubApiError } from '@/features/github/api/client';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
  }>;
}

/**
 * POST /api/github/[org]/[repo]/pull/[id]/reviews
 *
 * Submit a PR review (approve, request changes, or comment).
 * Body: { event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const validEvents = ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'] as const;
  if (!body.event || !validEvents.includes(body.event as typeof validEvents[number])) {
    return NextResponse.json(
      { error: `Invalid event. Must be one of: ${validEvents.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const review = await submitReview(token, org, repo, prNumber, {
      event: body.event as 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
      body: (body.body as string) ?? undefined,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error(`[api/github/${org}/${repo}/pull/${id}/reviews] POST error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
