import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/features/auth/auth';
import { fetchPRComments, postReviewComment, postIssueComment } from '@/features/github/api/comments';
import { GitHubApiError } from '@/features/github/api/client';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
  }>;
}

/**
 * GET /api/github/[org]/[repo]/pull/[id]/comments
 *
 * Returns all comments: review comments, issue comments, and reviews.
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
    const result = await fetchPRComments(token, org, repo, prNumber);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error(`[api/github/${org}/${repo}/pull/${id}/comments] GET error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/github/[org]/[repo]/pull/[id]/comments
 *
 * Create a new comment. Body determines the type:
 * - { body, path, line, commitId, side? } -> inline review comment
 * - { body } -> issue comment (top-level)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.body || typeof body.body !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: body' },
      { status: 400 },
    );
  }

  try {
    // If path + line + commitId are present, it's an inline review comment
    if (body.path && body.line && body.commitId) {
      const comment = await postReviewComment(token, org, repo, prNumber, {
        body: body.body as string,
        commitId: body.commitId as string,
        path: body.path as string,
        line: body.line as number,
        side: (body.side as 'LEFT' | 'RIGHT') ?? undefined,
      });
      return NextResponse.json({ comment }, { status: 201 });
    }

    // Otherwise, it's a top-level issue comment
    const comment = await postIssueComment(
      token,
      org,
      repo,
      prNumber,
      body.body as string,
    );
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error(`[api/github/${org}/${repo}/pull/${id}/comments] POST error:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
