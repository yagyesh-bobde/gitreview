export { auth as middleware } from '@/features/auth/middleware';

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (NextAuth routes)
     * - api/aira/ (shared-secret auth via x-aira-sync-key, not session auth)
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!api/auth|api/aira/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
