import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Module augmentation for next-auth to include accessToken and githubLogin.
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    githubLogin?: string;
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
    jwt({ token, account, profile }) {
      // Persist the GitHub access token and login from the initial sign-in
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile?.login) {
        token.githubLogin = profile.login as string;
      }
      return token;
    },
    session({ session, token }) {
      // Expose accessToken, user id, and GitHub login to the client session
      session.accessToken = token.accessToken as string | undefined;
      session.githubLogin = token.githubLogin as string | undefined;
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLanding = nextUrl.pathname === '/';
      const isAuthRoute =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/auth-error');

      // Landing page: redirect authenticated users to dashboard,
      // allow unauthenticated users through to see the marketing page
      if (isOnLanding) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // Auth routes (login, auth-error): always accessible to
      // unauthenticated users, redirect authenticated users to dashboard
      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // All other routes (app routes) require authentication.
      // Returning false triggers NextAuth to redirect to pages.signIn (/login)
      return isLoggedIn;
    },
  },
};
