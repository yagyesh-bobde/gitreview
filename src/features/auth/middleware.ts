import NextAuth from 'next-auth';
import { authConfig } from '@/features/auth/auth.config';

/**
 * Edge-compatible auth instance for Next.js middleware.
 *
 * This intentionally uses the same authConfig (which includes providers),
 * but crucially does NOT import any server-only modules like `next/headers`.
 * The full auth module (auth.ts) imports `next/headers` for the getToken()
 * helper, which breaks the Edge runtime bundling and silently kills
 * the middleware -- letting unauthenticated requests through.
 *
 * The `authorized` callback in authConfig handles all redirect logic.
 */
export const { auth } = NextAuth(authConfig);
