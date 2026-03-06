import { NextResponse } from 'next/server';

// GET: list sessions, POST: create session
export async function GET() {
  // TODO: Implement
  return NextResponse.json({ sessions: [] });
}

export async function POST() {
  // TODO: Implement
  return NextResponse.json({ session: null });
}
