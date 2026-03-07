import { NextResponse, type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/features/auth/auth';
import { getDb } from '@/lib/db';
import { githubAccounts, users } from '@/lib/db/schema';

/**
 * DELETE /api/auth/accounts/[accountId]
 *
 * Unlink a GitHub account from the authenticated user.
 * Prevents removing the last account (user must have at least one).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { accountId } = await params;
  const db = getDb();

  // Verify the account belongs to this user
  const account = await db
    .select({ id: githubAccounts.id })
    .from(githubAccounts)
    .where(and(eq(githubAccounts.id, accountId), eq(githubAccounts.userId, session.userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Prevent removing the last account
  const allAccounts = await db
    .select({ id: githubAccounts.id })
    .from(githubAccounts)
    .where(eq(githubAccounts.userId, session.userId));

  if (allAccounts.length <= 1) {
    return NextResponse.json(
      { error: 'Cannot remove your only linked account' },
      { status: 400 },
    );
  }

  // Delete the account
  await db
    .delete(githubAccounts)
    .where(and(eq(githubAccounts.id, accountId), eq(githubAccounts.userId, session.userId)));

  // If this was the active account, switch to the first remaining one
  if (session.activeAccountId === accountId) {
    const remaining = await db
      .select({ id: githubAccounts.id })
      .from(githubAccounts)
      .where(eq(githubAccounts.userId, session.userId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (remaining) {
      await db
        .update(users)
        .set({ activeAccountId: remaining.id })
        .where(eq(users.id, session.userId));
    }
  }

  return NextResponse.json({ success: true });
}
