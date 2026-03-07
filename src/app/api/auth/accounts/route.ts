import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/features/auth/auth';
import { getDb } from '@/lib/db';
import { githubAccounts } from '@/lib/db/schema';
import type { GitHubAccountInfo } from '@/features/auth/types';

/**
 * GET /api/auth/accounts
 *
 * Returns all linked GitHub accounts for the authenticated user.
 * Tokens are never exposed to the client.
 */
export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const db = getDb();
  const accounts = await db
    .select({
      id: githubAccounts.id,
      githubId: githubAccounts.githubId,
      login: githubAccounts.login,
      name: githubAccounts.name,
      email: githubAccounts.email,
      avatarUrl: githubAccounts.avatarUrl,
    })
    .from(githubAccounts)
    .where(eq(githubAccounts.userId, session.userId));

  const result: GitHubAccountInfo[] = accounts.map((a) => ({
    id: a.id,
    githubId: a.githubId,
    login: a.login,
    name: a.name,
    email: a.email,
    avatarUrl: a.avatarUrl,
  }));

  return NextResponse.json({ accounts: result, activeAccountId: session.activeAccountId });
}
