import { NextResponse } from 'next/server';

// GET: existing comments, POST: new comment
export async function GET() {
  // TODO: Implement
  return NextResponse.json({ comments: [] });
}

export async function POST() {
  // TODO: Implement
  return NextResponse.json({ comment: null });
}
