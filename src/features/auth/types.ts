import type { Session } from 'next-auth';

/**
 * Extended session type with GitHub access token.
 * NextAuth v5 module augmentation requires @auth/core to be resolvable,
 * which pnpm's strict hoisting doesn't guarantee. We use explicit types instead.
 */
export interface GitReviewSession extends Session {
  accessToken?: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
