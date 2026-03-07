import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Module augmentation for next-auth to include multi-account fields.
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    githubLogin?: string;
    userId?: string;
    activeAccountId?: string;
    linkError?: string;
  }
}

/**
 * Base auth config that is safe for both Edge (middleware) and Node.js runtimes.
 *
 * Only contains providers, session strategy, pages, and the `authorized` callback.
 * The `jwt` and `session` callbacks that touch the DB live in `auth.ts` so they
 * never get bundled into the Edge middleware.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: { scope: 'read:user repo' },
      },
    }),
    GitHub({
      id: 'github-link',
      name: 'GitHub (Link Account)',
      clientId: process.env.GITHUB_LINK_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_LINK_CLIENT_SECRET ?? process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: { scope: 'read:user repo' },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLanding = nextUrl.pathname === '/';
      const isAuthRoute =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/auth-error') ||
        nextUrl.pathname.startsWith('/auth/link');

      if (isOnLanding) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
};
