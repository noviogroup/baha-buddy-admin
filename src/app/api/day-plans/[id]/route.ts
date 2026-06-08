import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getPlanId(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  const id = getPlanId(request);

  if (!id) {
    return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cruise_itineraries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data });
});

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  const id = getPlanId(request);
  const body = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
  }

  const allowed = [
    'title',
    'slug',
    'short_description',
    'full_description',
    'island',
    'area',
    'itinerary_type',
    'traveler_types',
    'interests',
    'duration_min_minutes',
    'duration_max_minutes',
    'mobility_level',
    'budget_level',
    'base_price',
    'personalized_price',
    'concierge_price',
    'hero_image_url',
    'default_return_buffer_minutes',
    'supports_live_guide',
    'supports_google_maps_fallback',
    'supports_mapbox_navigation',
    'status',
  ];

  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  );

  const { data, error } = await supabase
    .from('cruise_itineraries')
    .update({ ...payload, updated_by: admin.id } as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data });
});
