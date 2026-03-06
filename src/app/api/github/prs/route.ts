import { NextResponse } from 'next/server';

// GET: user's PRs (authored + review-requested)
export async function GET() {
  // TODO: Implement
  return NextResponse.json({ prs: [] });
}
