import { NextResponse } from 'next/server';

// GET: parsed diff for file (?path=src/foo.ts)
export async function GET() {
  // TODO: Implement
  return NextResponse.json({ diff: null });
}
