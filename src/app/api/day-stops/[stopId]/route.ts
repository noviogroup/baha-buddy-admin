import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getStopId(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

const ALLOWED_FIELDS = new Set([
  'stop_order',
  'name',
  'stop_type',
  'address',
  'latitude',
  'longitude',
  'google_place_id',
  'tripadvisor_location_id',
  'suggested_arrival_offset_minutes',
  'suggested_duration_minutes',
  'description',
  'baha_tip',
  'best_photo_spot',
  'estimated_cost',
  'cost_note',
  'is_required',
  'is_partner_stop',
  'kid_friendly',
  'bathroom_available',
  'food_available',
  'accessibility_notes',
  'safety_notes',
  'image_urls',
  'metadata',
]);

export const PATCH = withAdminAuth(async (request, { supabase }) => {
  const stopId = getStopId(request);
  const body = await request.json();

  if (!stopId) {
    return NextResponse.json({ error: 'Missing stop id' }, { status: 400 });
  }

  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => ALLOWED_FIELDS.has(key))
  );

  const { data, error } = await supabase
    .from('cruise_itinerary_stops')
    .update(payload)
    .eq('id', stopId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stop: data });
});

export const DELETE = withAdminAuth(async (request, { supabase }) => {
  const stopId = getStopId(request);

  if (!stopId) {
    return NextResponse.json({ error: 'Missing stop id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('cruise_itinerary_stops')
    .delete()
    .eq('id', stopId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
