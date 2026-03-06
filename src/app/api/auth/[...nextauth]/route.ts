// NextAuth.js v5 catch-all handler
// TODO: Wire up once auth is configured
// export { GET, POST } from '@/features/auth/auth';

import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ message: 'Auth not configured' }, { status: 501 });
}

export function POST() {
  return NextResponse.json({ message: 'Auth not configured' }, { status: 501 });
}
