'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';
import type { Session } from 'next-auth';

interface AuthSession {
  /** The current session, or null if not authenticated */
  session: Session | null;
  /** Whether the session is currently loading */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** The GitHub access token for API calls, if available */
  accessToken: string | undefined;
  /** The internal GitReview user ID */
  userId: string | undefined;
  /** The currently active GitHub account ID */
  activeAccountId: string | undefined;
  /** The GitHub login of the active account */
  githubLogin: string | undefined;
}

/**
 * Typed wrapper around NextAuth useSession with convenient derived state.
 */
export function useAuthSession(): AuthSession {
  const { data: session, status } = useNextAuthSession();

  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    accessToken: session?.accessToken,
    userId: session?.userId,
    activeAccountId: session?.activeAccountId,
    githubLogin: session?.githubLogin,
  };
}
