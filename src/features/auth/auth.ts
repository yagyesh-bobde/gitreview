import NextAuth from 'next-auth';
import { headers } from 'next/headers';
import { authConfig } from '@/features/auth/auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Extract a GitHub access token from the session or Authorization header.
 * Priority:
 * 1. NextAuth session
 * 2. Authorization: Bearer <token> header (for testing / external clients)
 */
export async function getToken(): Promise<string | null> {
  const session = await auth();
  if (session?.accessToken) {
    return session.accessToken as string;
  }

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
