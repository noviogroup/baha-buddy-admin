import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getPlanId(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  const planId = getPlanId(request);

  if (!planId) {
    return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cruise_itinerary_stops')
    .select('*')
    .eq('itinerary_id', planId)
    .order('stop_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stops: data || [] });
});

export const POST = withAdminAuth(async (request, { supabase }) => {
  const planId = getPlanId(request);
  const body = await request.json();

  if (!planId) {
    return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
  }

  const payload = {
    itinerary_id: planId,
    stop_order: body.stop_order,
    name: body.name,
    stop_type: body.stop_type || 'attraction',
    address: body.address || null,
    latitude: body.latitude,
    longitude: body.longitude,
    google_place_id: body.google_place_id || null,
    tripadvisor_location_id: body.tripadvisor_location_id || null,
    suggested_arrival_offset_minutes: body.suggested_arrival_offset_minutes ?? null,
    suggested_duration_minutes: body.suggested_duration_minutes || 20,
    description: body.description || null,
    baha_tip: body.baha_tip || null,
    best_photo_spot: body.best_photo_spot || null,
    estimated_cost: body.estimated_cost ?? null,
    cost_note: body.cost_note || null,
    is_required: body.is_required ?? true,
    is_partner_stop: body.is_partner_stop ?? false,
    kid_friendly: body.kid_friendly ?? false,
    bathroom_available: body.bathroom_available ?? false,
    food_available: body.food_available ?? false,
    accessibility_notes: body.accessibility_notes || null,
    safety_notes: body.safety_notes || null,
    image_urls: body.image_urls || [],
    metadata: body.metadata || {},
  };

  const { data, error } = await supabase
    .from('cruise_itinerary_stops')
    .insert(payload as never)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stop: data }, { status: 201 });
});
