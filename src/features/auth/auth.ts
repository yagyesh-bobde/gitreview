/**
 * Auth helpers for server-side route handlers.
 *
 * TODO: Wire up NextAuth.js v5 once auth configuration is complete.
 * For now, provides a getToken() helper that extracts the GitHub
 * access token from either the session or the Authorization header.
 */

import { headers } from 'next/headers';

export interface Session {
  user: {
    name: string;
    email: string;
    image: string;
  };
  accessToken: string;
}

/**
 * Get the current auth session.
 * TODO: Replace with NextAuth auth() once configured.
 */
export async function auth(): Promise<Session | null> {
  // Placeholder: when NextAuth is wired up, this will use the
  // NextAuth auth() function. For now, return null.
  return null;
}

/**
 * Extract a GitHub access token from the session or Authorization header.
 * This is the primary way API routes get the token.
 *
 * Priority:
 * 1. NextAuth session (when auth is configured)
 * 2. Authorization: Bearer <token> header (for testing / external clients)
 */
export async function getToken(): Promise<string | null> {
  // Try session first
  const session = await auth();
  if (session?.accessToken) {
    return session.accessToken;
  }

  // Fallback: check Authorization header
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Require authentication. Throws if no token is available.
 * Use in API routes that must be authenticated.
 */
export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  return token;
}
