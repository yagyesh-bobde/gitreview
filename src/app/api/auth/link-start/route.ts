import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { linkTokens } from '@/lib/db/schema';
import { signIn } from '@/features/auth/auth';

/**
 * GET /api/auth/link-start?token=xxx
 *
 * Route Handler that validates a link token, sets httpOnly cookies with
 * the userId and token value, then kicks off the github-link OAuth flow
 * via the server-side signIn() helper.
 *
 * This exists because cookies can only be set in Route Handlers or Server
 * Actions -- not in Server Components (pages).
 *
 * NOTE: We use the server-side signIn() instead of redirecting to
 * /api/auth/signin/github-link because NextAuth v5 requires a POST with
 * CSRF to initiate OAuth. The server-side signIn() handles this internally
 * (skipCSRFCheck) and calls redirect() which Next.js catches properly.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
  }

  const db = getDb();
  const row = await db
    .select({
      id: linkTokens.id,
      userId: linkTokens.userId,
      expiresAt: linkTokens.expiresAt,
      usedAt: linkTokens.usedAt,
    })
    .from(linkTokens)
    .where(eq(linkTokens.token, token))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) {
    const url = new URL('/auth/link', request.nextUrl.origin);
    url.searchParams.set('error', 'not_found');
    return NextResponse.redirect(url);
  }

  if (row.usedAt) {
    const url = new URL('/auth/link', request.nextUrl.origin);
    url.searchParams.set('error', 'used');
    return NextResponse.redirect(url);
  }

  if (new Date() > row.expiresAt) {
    const url = new URL('/auth/link', request.nextUrl.origin);
    url.searchParams.set('error', 'expired');
    return NextResponse.redirect(url);
  }

  // Set httpOnly cookies so the JWT callback can read the userId after OAuth
  const cookieStore = await cookies();
  cookieStore.set('link_user_id', row.userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 20, // 20 minutes
  });
  cookieStore.set('link_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 20,
  });

  // Use server-side signIn which internally POSTs to NextAuth with
  // skipCSRFCheck, then calls redirect() to the GitHub OAuth URL.
  await signIn('github-link', { redirectTo: '/settings' });
}
