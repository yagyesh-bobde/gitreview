import { NextResponse } from 'next/server';
import { getToken } from '@/features/auth/auth';
import { listUserPRs } from '@/features/github/api/pulls';
import { GitHubApiError } from '@/features/github/api/client';

/**
 * GET /api/github/prs
 *
 * Returns the authenticated user's open PRs (authored + review-requested).
 */
export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  try {
    const prs = await listUserPRs(token);
    return NextResponse.json({ prs });
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
