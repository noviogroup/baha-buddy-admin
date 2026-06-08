import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const island = searchParams.get('island') || 'nassau';
  const limit = Math.min(Number(searchParams.get('limit') || 10), 25);

  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const { data: googlePlaces, error: googleError } = await supabase
    .from('google_places')
    .select('id,name,type,island_id,rating,user_ratings_total,price_level,address,lat,lng,image_url,photo_url,description,kid_friendly,types')
    .eq('island_id', island)
    .eq('is_active', true)
    .neq('is_disabled', true)
    .ilike('name', `%${q}%`)
    .order('user_ratings_total', { ascending: false })
    .limit(limit);

  if (googleError) {
    return NextResponse.json({ error: googleError.message }, { status: 500 });
  }

  const { data: tripadvisorPlaces } = await supabase
    .from('tripadvisor_locations')
    .select('id,location_id,category,island_name,name,address,rating,num_reviews,price_level,latitude,longitude,website,tripadvisor_url')
    .ilike('name', `%${q}%`)
    .order('num_reviews', { ascending: false })
    .limit(limit);

  const google = (googlePlaces || []).map((place: any) => ({
    source: 'google',
    source_id: place.id,
    google_place_id: place.id,
    name: place.name,
    stop_type: place.type || 'attraction',
    address: place.address,
    latitude: Number(place.lat),
    longitude: Number(place.lng),
    rating: place.rating,
    review_count: place.user_ratings_total,
    image_url: place.image_url || place.photo_url || null,
    description: place.description || null,
    kid_friendly: Boolean(place.kid_friendly),
    metadata: { types: place.types || [], price_level: place.price_level ?? null },
  }));

  const tripadvisor = (tripadvisorPlaces || []).map((place: any) => ({
    source: 'tripadvisor',
    source_id: place.location_id || place.id,
    tripadvisor_location_id: place.location_id,
    name: place.name,
    stop_type: place.category || 'attraction',
    address: typeof place.address === 'string' ? place.address : place.address?.address_string || null,
    latitude: place.latitude ? Number(place.latitude) : null,
    longitude: place.longitude ? Number(place.longitude) : null,
    rating: place.rating,
    review_count: place.num_reviews,
    image_url: null,
    description: null,
    kid_friendly: false,
    metadata: { price_level: place.price_level ?? null, website: place.website ?? null, tripadvisor_url: place.tripadvisor_url ?? null },
  }));

  return NextResponse.json({ places: [...google, ...tripadvisor].slice(0, limit) });
});
