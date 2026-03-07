import { NextRequest, NextResponse } from 'next/server';
import { getRepoAuth } from '@/features/auth/auth';
import { replyToReviewComment } from '@/features/github/api/comments';
import { GitHubApiError } from '@/features/github/api/client';

interface RouteParams {
  params: Promise<{
    org: string;
    repo: string;
    id: string;
    commentId: string;
  }>;
}

/**
 * POST /api/github/[org]/[repo]/pull/[id]/comments/[commentId]/replies
 *
 * Reply to an existing review comment thread.
 * Body: { body: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { org, repo, id, commentId } = await params;

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

  const commentIdNum = parseInt(commentId, 10);
  if (isNaN(commentIdNum) || commentIdNum <= 0) {
    return NextResponse.json(
      { error: 'Invalid comment ID' },
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
    const comment = await replyToReviewComment(
      token,
      org,
      repo,
      prNumber,
      commentIdNum,
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
    console.error(
      `[api/github/${org}/${repo}/pull/${id}/comments/${commentId}/replies] POST error:`,
      err,
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
