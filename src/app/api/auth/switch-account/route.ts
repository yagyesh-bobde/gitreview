import { NextResponse, type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/features/auth/auth';
import { getDb } from '@/lib/db';
import { githubAccounts, users } from '@/lib/db/schema';

/**
 * POST /api/auth/switch-account
 *
 * Switch the active GitHub account. Updates the user's activeAccountId
 * in the DB. The client should update the session afterward.
 *
 * Body: { accountId: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = (await request.json()) as { accountId?: string };
  const { accountId } = body;

  if (!accountId || typeof accountId !== 'string') {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify the account belongs to this user
  const account = await db
    .select({
      id: githubAccounts.id,
      login: githubAccounts.login,
      avatarUrl: githubAccounts.avatarUrl,
    })
    .from(githubAccounts)
    .where(and(eq(githubAccounts.id, accountId), eq(githubAccounts.userId, session.userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Update active account
  await db
    .update(users)
    .set({ activeAccountId: accountId })
    .where(eq(users.id, session.userId));

  return NextResponse.json({
    success: true,
    activeAccountId: accountId,
    login: account.login,
  });
}
