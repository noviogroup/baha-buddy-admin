import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ plans: [], total: 0, note: 'Connect this endpoint to the guided day tables.' });
}
