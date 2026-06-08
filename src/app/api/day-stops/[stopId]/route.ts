import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getStopId(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export const PATCH = withAdminAuth(async (request, { supabase }) => {
  const stopId = getStopId(request);
  const body = await request.json();

  if (!stopId) {
    return NextResponse.json({ error: 'Missing stop id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cruise_itinerary_stops')
    .update(body)
    .eq('id', stopId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stop: data });
});
