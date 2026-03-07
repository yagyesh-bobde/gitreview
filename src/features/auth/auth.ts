import NextAuth, { type NextAuthConfig } from 'next-auth';
import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { authConfig } from '@/features/auth/auth.config';
import { getDb } from '@/lib/db';
import { users, githubAccounts, linkTokens } from '@/lib/db/schema';
import { encrypt, decrypt } from '@/lib/crypto';

// ---------------------------------------------------------------------------
// DB helpers for user/account persistence
// ---------------------------------------------------------------------------

interface GitHubProfile {
  githubId: string;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  accessToken: string;
  scope: string | null;
}

/**
 * Upsert a user row and their GitHub account on primary sign-in.
 *
 * Uses conflict-safe operations to prevent duplicate rows when two sign-in
 * requests race (e.g. double-click). The github_accounts_github_id_idx unique
 * index on githubId is the conflict target.
 */
async function upsertUserAndAccount(
  profile: GitHubProfile,
): Promise<{ userId: string; accountId: string }> {
  const db = getDb();
  const encryptedToken = encrypt(profile.accessToken);

  // 1. Try to find an existing account for this GitHub ID
  const existingAccount = await db
    .select({ id: githubAccounts.id, userId: githubAccounts.userId })
    .from(githubAccounts)
    .where(eq(githubAccounts.githubId, profile.githubId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existingAccount) {
    // Known account -- update token and profile info
    await db
      .update(githubAccounts)
      .set({
        login: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        accessToken: encryptedToken,
        scope: profile.scope,
      })
      .where(eq(githubAccounts.id, existingAccount.id));

    await db
      .update(users)
      .set({
        name: profile.name,
        email: profile.email,
        image: profile.avatarUrl,
      })
      .where(eq(users.id, existingAccount.userId));

    return { userId: existingAccount.userId, accountId: existingAccount.id };
  }

  // 2. New GitHub account -- create user + account with conflict safety net.
  //    If a concurrent request already inserted a row for this githubId between
  //    our SELECT and this INSERT, onConflictDoNothing prevents a unique violation.
  const [user] = await db
    .insert(users)
    .values({
      email: profile.email,
      name: profile.name,
      image: profile.avatarUrl,
    })
    .returning({ id: users.id });

  const insertResult = await db
    .insert(githubAccounts)
    .values({
      userId: user.id,
      githubId: profile.githubId,
      login: profile.login,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      accessToken: encryptedToken,
      scope: profile.scope,
    })
    .onConflictDoUpdate({
      target: githubAccounts.githubId,
      set: {
        login: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        accessToken: encryptedToken,
        scope: profile.scope,
      },
    })
    .returning({ id: githubAccounts.id, userId: githubAccounts.userId });

  const account = insertResult[0];

  // If the conflict branch fired, the account belongs to whoever created it first.
  // The orphaned user row we just created will have no accounts -- clean it up.
  if (account.userId !== user.id) {
    await db.delete(users).where(eq(users.id, user.id));
  } else {
    await db
      .update(users)
      .set({ activeAccountId: account.id })
      .where(eq(users.id, user.id));
  }

  return { userId: account.userId, accountId: account.id };
}

export class AccountConflictError extends Error {
  public ownerLogin: string;
  constructor(login: string) {
    super(`GitHub account @${login} is already linked to another GitReview user.`);
    this.name = 'AccountConflictError';
    this.ownerLogin = login;
  }
}

/**
 * Link a new GitHub account to an existing user.
 * Throws AccountConflictError if the GitHub account is already owned by a different user.
 */
async function linkAccountToUser(
  userId: string,
  profile: GitHubProfile,
): Promise<{ accountId: string }> {
  const db = getDb();
  const encryptedToken = encrypt(profile.accessToken);

  // Check if this GitHub account already exists globally (any user)
  const existingGlobal = await db
    .select({ id: githubAccounts.id, userId: githubAccounts.userId, login: githubAccounts.login })
    .from(githubAccounts)
    .where(eq(githubAccounts.githubId, profile.githubId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existingGlobal) {
    if (existingGlobal.userId !== userId) {
      // This GitHub account belongs to a different GitReview user — cannot link
      throw new AccountConflictError(profile.login);
    }

    // Already linked to this user — just refresh the token
    await db
      .update(githubAccounts)
      .set({
        login: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        accessToken: encryptedToken,
        scope: profile.scope,
      })
      .where(eq(githubAccounts.id, existingGlobal.id));
    return { accountId: existingGlobal.id };
  }

  const [account] = await db
    .insert(githubAccounts)
    .values({
      userId,
      githubId: profile.githubId,
      login: profile.login,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      accessToken: encryptedToken,
      scope: profile.scope,
    })
    .returning({ id: githubAccounts.id });

  return { accountId: account.id };
}

// ---------------------------------------------------------------------------
// Full NextAuth config (Node.js only -- never imported in Edge middleware)
// ---------------------------------------------------------------------------

// We use a typed wrapper around the JWT to access our custom claims.
// Module augmentation for next-auth/jwt doesn't work with pnpm's strict hoisting.
interface CustomJWT {
  sub?: string;
  accessToken?: string;
  githubLogin?: string;
  userId?: string;
  activeAccountId?: string;
  linkError?: string;
}

const fullConfig: NextAuthConfig = {
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile, trigger, session: updateData }) {
      const t = token as unknown as CustomJWT;

      // -------------------------------------------------------------------
      // Session update trigger (e.g. after account switch)
      // `updateSession({ activeAccountId })` on the client fires this path.
      // -------------------------------------------------------------------
      if (trigger === 'update') {
        const data = updateData as { activeAccountId?: string } | undefined;
        let targetAccountId = data?.activeAccountId;

        // If the client didn't pass an accountId, fall back to DB
        if (!targetAccountId && t.userId) {
          const db = getDb();
          const userRow = await db
            .select({ activeAccountId: users.activeAccountId })
            .from(users)
            .where(eq(users.id, t.userId))
            .limit(1)
            .then((rows) => rows[0] ?? null);
          targetAccountId = userRow?.activeAccountId ?? undefined;
        }

        if (targetAccountId) {
          const db = getDb();
          const acct = await db
            .select({
              id: githubAccounts.id,
              login: githubAccounts.login,
              accessToken: githubAccounts.accessToken,
            })
            .from(githubAccounts)
            .where(eq(githubAccounts.id, targetAccountId))
            .limit(1)
            .then((rows) => rows[0] ?? null);

          if (acct) {
            t.activeAccountId = acct.id;
            t.accessToken = decrypt(acct.accessToken);
            t.githubLogin = acct.login;
          }
        }

        return token;
      }

      // -------------------------------------------------------------------
      // OAuth sign-in (initial or link flow)
      // -------------------------------------------------------------------
      if (account?.access_token && profile) {
        const p = profile as Record<string, unknown>;
        const githubProfile: GitHubProfile = {
          githubId: String(p.id),
          login: (p.login as string) ?? '',
          name: (p.name as string) ?? null,
          email: (p.email as string) ?? null,
          avatarUrl: (p.avatar_url as string) ?? null,
          accessToken: account.access_token,
          scope: account.scope ?? null,
        };

        if (account.provider === 'github-link') {
          // Linking flow: attach to existing user
          // In same-browser flow, t.userId is already set from the existing session.
          // In cross-browser flow, we read the userId from a cookie set by /auth/link.
          let linkUserId = t.userId;

          if (!linkUserId) {
            try {
              const cookieStore = await cookies();
              linkUserId = cookieStore.get('link_user_id')?.value;
            } catch {
              // cookies() may throw in certain contexts -- fall through
            }
          }

          if (linkUserId) {
            try {
              const { accountId } = await linkAccountToUser(linkUserId, githubProfile);
              t.userId = linkUserId;
              t.activeAccountId = accountId;
              t.accessToken = account.access_token;
              t.githubLogin = githubProfile.login;
            } catch (err) {
              if (err instanceof AccountConflictError) {
                t.linkError = `account_conflict:${githubProfile.login}`;
              } else {
                throw err;
              }
            }

            // Mark the link token as used and clear cookies
            try {
              const cookieStore = await cookies();
              const linkToken = cookieStore.get('link_token')?.value;
              if (linkToken) {
                const db = getDb();
                await db
                  .update(linkTokens)
                  .set({ usedAt: new Date() })
                  .where(eq(linkTokens.token, linkToken));
              }
              cookieStore.delete('link_user_id');
              cookieStore.delete('link_token');
            } catch {
              // Best-effort cleanup -- don't fail the auth flow
            }
          } else {
            // No userId available -- treat as primary sign-in
            const { userId, accountId } = await upsertUserAndAccount(githubProfile);
            t.userId = userId;
            t.activeAccountId = accountId;
            t.accessToken = account.access_token;
            t.githubLogin = githubProfile.login;
          }
        } else {
          // Primary sign-in
          const { userId, accountId } = await upsertUserAndAccount(githubProfile);
          t.userId = userId;
          t.activeAccountId = accountId;
          t.accessToken = account.access_token;
          t.githubLogin = githubProfile.login;
        }
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // If the URL is relative or same-origin, allow it
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    session({ session, token }) {
      const t = token as unknown as CustomJWT;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = session as any;
      s.accessToken = t.accessToken;
      s.githubLogin = t.githubLogin;
      s.userId = t.userId;
      s.activeAccountId = t.activeAccountId;
      if (t.sub) {
        session.user.id = t.sub;
      }
      // Clear link error after it's been consumed
      if (t.linkError) {
        s.linkError = t.linkError;
        delete t.linkError;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(fullConfig);

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/**
 * Get the decrypted access token for a specific account.
 */
export async function getTokenForAccount(accountId: string): Promise<string | null> {
  const db = getDb();
  const account = await db
    .select({ accessToken: githubAccounts.accessToken })
    .from(githubAccounts)
    .where(eq(githubAccounts.id, accountId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!account) return null;
  return decrypt(account.accessToken);
}

/**
 * Get all decrypted tokens for a user, keyed by account ID.
 */
export async function getAllTokens(
  userId: string,
): Promise<Array<{ accountId: string; login: string; token: string }>> {
  const db = getDb();
  const accounts = await db
    .select({
      id: githubAccounts.id,
      login: githubAccounts.login,
      accessToken: githubAccounts.accessToken,
    })
    .from(githubAccounts)
    .where(eq(githubAccounts.userId, userId));

  return accounts.map((a) => ({
    accountId: a.id,
    login: a.login,
    token: decrypt(a.accessToken),
  }));
}

/**
 * Extract a GitHub access token from the session or Authorization header.
 *
 * For multi-account: resolves the active account's decrypted token from DB.
 * Falls back to the JWT-cached token or Bearer header.
 */
export async function getToken(): Promise<string | null> {
  const session = await auth();

  // If we have an activeAccountId, fetch the decrypted token from DB
  if (session?.activeAccountId) {
    const token = await getTokenForAccount(session.activeAccountId);
    if (token) return token;
  }

  // Fallback: JWT-cached token (for backward compat / edge cases)
  if (session?.accessToken) {
    return session.accessToken as string;
  }

  // Fallback: Authorization header
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Require authentication. Throws if no token is available.
 */
export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  return token;
}

// ---------------------------------------------------------------------------
// Per-repo token resolution (auto-detect which account has access)
// ---------------------------------------------------------------------------

// Lazy import to avoid circular deps and keep the import used
const getRedisHelpers = async () => {
  const { redisGet, redisSet } = await import('@/lib/redis');
  return { redisGet, redisSet };
};

/** In-memory fallback cache when Redis is unavailable. */
const repoAccountCache = new Map<string, { accountId: string; expiresAt: number }>();
const REPO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REPO_CACHE_REDIS_TTL_S = 600; // 10 minutes

function repoCacheKey(userId: string, org: string, repo: string): string {
  return `gh:repo-account:${userId}:${org}/${repo}`;
}

/**
 * Check if a token can access a given repo by calling GET /repos/{org}/{repo}.
 * Returns true for 200, false for 401/403/404.
 */
async function canAccessRepo(token: string, org: string, repo: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${org}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export interface RepoTokenResult {
  token: string;
  accountId: string;
  login: string;
}

/**
 * Resolve the best GitHub token for accessing a specific org/repo.
 *
 * Strategy:
 *  1. Single account -- return immediately, no probing needed.
 *  2. Check cache (Redis, then in-memory) for a known-good accountId.
 *  3. Try the active account first (most likely correct).
 *  4. Fall back to probing other accounts.
 *  5. Cache the successful mapping for 10 minutes.
 *
 * Returns null if no linked account can access the repo.
 */
export async function getTokenForRepo(
  userId: string,
  activeAccountId: string | undefined,
  org: string,
  repo: string,
): Promise<RepoTokenResult | null> {
  const allAccounts = await getAllTokens(userId);
  if (allAccounts.length === 0) return null;

  // Fast path: single account, skip probing entirely
  if (allAccounts.length === 1) {
    return allAccounts[0];
  }

  const cacheKey = repoCacheKey(userId, org, repo);

  // Check cache for a previously resolved accountId
  const cachedAccountId = await getCachedRepoAccount(cacheKey);
  if (cachedAccountId) {
    const cached = allAccounts.find((a) => a.accountId === cachedAccountId);
    if (cached) return cached;
    // Account was deleted or unlinked -- fall through to re-probe
  }

  // Order accounts: active account first, then the rest
  const ordered = [...allAccounts].sort((a, b) => {
    if (a.accountId === activeAccountId) return -1;
    if (b.accountId === activeAccountId) return 1;
    return 0;
  });

  for (const account of ordered) {
    if (await canAccessRepo(account.token, org, repo)) {
      // Cache the winner
      await setCachedRepoAccount(cacheKey, account.accountId);
      return account;
    }
  }

  return null;
}

async function getCachedRepoAccount(key: string): Promise<string | null> {
  // Try Redis first
  const { redisGet } = await getRedisHelpers();
  const redisVal = await redisGet<string>(key);
  if (redisVal) return redisVal;

  // Fallback: in-memory
  const entry = repoAccountCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.accountId;
  if (entry) repoAccountCache.delete(key);

  return null;
}

async function setCachedRepoAccount(key: string, accountId: string): Promise<void> {
  const { redisSet } = await getRedisHelpers();
  // Write to both layers -- Redis is authoritative, in-memory is a fast fallback
  await redisSet(key, accountId, REPO_CACHE_REDIS_TTL_S);
  repoAccountCache.set(key, { accountId, expiresAt: Date.now() + REPO_CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Route helper: extract session + resolve repo token in one call
// ---------------------------------------------------------------------------

export interface RepoAuth {
  token: string;
  accountId: string;
  login: string;
  userId: string;
}

/**
 * Convenience helper for per-repo API routes.
 *
 * Extracts the session, resolves the best token for the given org/repo,
 * and returns everything the route needs. Returns null if unauthenticated
 * or no account has access to the repo.
 */
export async function getRepoAuth(org: string, repo: string): Promise<RepoAuth | null> {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = session as any;
  const userId: string | undefined = s?.userId;
  const activeAccountId: string | undefined = s?.activeAccountId;

  if (!userId) return null;

  const result = await getTokenForRepo(userId, activeAccountId, org, repo);
  if (!result) return null;

  return { ...result, userId };
}
