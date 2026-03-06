import { NextResponse } from 'next/server';

export function middleware() {
  // TODO: Add auth redirect logic and rate limit headers
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
