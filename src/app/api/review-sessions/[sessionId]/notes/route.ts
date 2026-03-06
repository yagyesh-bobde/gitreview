import { NextResponse } from 'next/server';

// GET/POST/DELETE: local notes
export async function GET() {
  // TODO: Implement
  return NextResponse.json({ notes: [] });
}

export async function POST() {
  // TODO: Implement
  return NextResponse.json({ note: null });
}

export async function DELETE() {
  // TODO: Implement
  return NextResponse.json({ deleted: false });
}
