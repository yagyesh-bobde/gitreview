import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Module augmentation for next-auth to include accessToken in Session and JWT.
// We need next-auth/jwt resolvable for augmentation, so we declare it inline.
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
    jwt({ token, account }) {
      // Persist the GitHub access token from the initial sign-in
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    session({ session, token }) {
      // Expose accessToken and user id to the client session
      session.accessToken = token.accessToken as string | undefined;
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/auth-error');

      // Auth routes are always accessible
      if (isAuthRoute) {
        // Redirect logged-in users away from login page
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      // All other routes require authentication
      return isLoggedIn;
    },
  },
};
