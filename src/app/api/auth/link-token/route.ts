import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { auth } from '@/features/auth/auth';
import { getDb } from '@/lib/db';
import { linkTokens } from '@/lib/db/schema';

const TOKEN_EXPIRY_MINUTES = 15;

/**
 * POST /api/auth/link-token
 *
 * Generates a one-time link token for cross-browser account linking.
 * The user copies the resulting URL and opens it in another browser
 * where a different GitHub account is logged in.
 */
export async function POST() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getDb();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(linkTokens).values({
    userId: session.userId,
    token,
    expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const url = `${baseUrl}/auth/link?token=${token}`;

  return NextResponse.json({ token, url, expiresAt: expiresAt.toISOString() });
}

/**
 * GET /api/auth/link-token?token=xxx
 *
 * Check the status of a link token. Used for polling from the dialog
 * to detect when the account has been linked.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
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
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  // Only allow the token owner to check status
  if (row.userId !== session.userId) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  if (row.usedAt) {
    return NextResponse.json({ status: 'used' });
  }

  if (new Date() > row.expiresAt) {
    return NextResponse.json({ status: 'expired' });
  }

  return NextResponse.json({ status: 'pending' });
}
