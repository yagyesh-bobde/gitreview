import type { Session } from 'next-auth';

/**
 * A linked GitHub account as exposed to the client.
 * Tokens are never sent to the client -- only metadata.
 */
export interface GitHubAccountInfo {
  id: string;
  githubId: string;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * Extended session type with multi-account support.
 */
export interface GitReviewSession extends Session {
  accessToken?: string;
  githubLogin?: string;
  userId?: string;
  activeAccountId?: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Extended JWT claims for multi-account auth.
 */
export interface GitReviewJWT {
  sub?: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  accessToken?: string;
  githubLogin?: string;
  userId?: string;
  activeAccountId?: string;
}
