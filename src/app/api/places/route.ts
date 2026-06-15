import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_CATEGORIES = [
  'hotel', 'restaurant', 'beach', 'attraction', 'activity',
  'transport', 'landmark', 'shopping', 'cruise_stop', 'other',
];
const VALID_STATUSES = ['draft', 'active', 'hidden', 'archived'];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(v => v.trim());
}

type GalleryImage = { url: string; alt: string; type: string; is_primary: boolean; order: number };

function cleanGallery(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, i): GalleryImage | null => {
      if (typeof item === 'string' && item.trim()) {
        return { url: item.trim(), alt: '', type: 'gallery', is_primary: i === 0, order: i };
      }
      if (item && typeof item === 'object' && typeof (item as any).url === 'string' && (item as any).url.trim()) {
        return {
          url: (item as any).url.trim(),
          alt: typeof (item as any).alt === 'string' ? (item as any).alt : '',
          type: typeof (item as any).type === 'string' ? (item as any).type : 'gallery',
          is_primary: !!(item as any).is_primary,
          order: typeof (item as any).order === 'number' ? (item as any).order : i,
        };
      }
      return null;
    })
    .filter((img): img is GalleryImage => img !== null);
}

function cleanBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

type PlaceRow = Record<string, unknown> & {
  id: string;
  name: string;
  category: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  status: string | null;
  primary_image_url: string | null;
};

type PartnerPlaceRow = {
  id: string;
  place_id: string;
  partner_id: string;
  relationship_type: string | null;
  partners?: Record<string, unknown> | null;
};

const FULL_SELECT = [
  'id', 'name', 'slug', 'category', 'subcategory', 'island_id', 'island_name',
  'address', 'latitude', 'longitude', 'phone', 'website',
  'short_description', 'description', 'primary_image_url', 'gallery_images',
  'rating', 'review_count', 'price_level',
  'amenities', 'tags', 'best_for', 'review_highlights', 'buddy_tips',
  'opening_hours', 'source', 'partner_id',
  'status', 'is_active', 'is_verified', 'is_partner', 'featured', 'sponsored',
  'source_priority', 'metadata', 'created_at', 'updated_at',
].join(',');

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const island = (searchParams.get('island') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const featured = searchParams.get('featured');
    const partnered = searchParams.get('partner');
    const sortBy = searchParams.get('sort') || 'updated_at';
    const sortDir = searchParams.get('dir') === 'asc';
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

    const validSorts = ['name', 'rating', 'created_at', 'updated_at'];
    const orderCol = validSorts.includes(sortBy) ? sortBy : 'updated_at';

    let query = supabase
      .from('places')
      .select(FULL_SELECT)
      .order(orderCol, { ascending: sortDir })
      .limit(limit);

    if (q) query = query.ilike('name', `%${q}%`);
    if (category && category !== 'all') query = query.eq('category', category);
    if (status && status !== 'all') query = query.eq('status', status);
    if (island && island !== 'all') query = query.eq('island_name', island);
    if (featured === 'true') query = query.eq('featured', true);
    if (partnered === 'true') query = query.eq('is_partner', true);

    const { data: places, error } = await query;
    if (error) throw error;

    const placeIds = (places || []).map((p: any) => p.id);
    const partnerMap: Record<string, any[]> = {};

    if (placeIds.length > 0) {
      const { data: links } = await supabase
        .from('partner_places')
        .select('id,place_id,partner_id,relationship_type,partners(id,name,status,tier,partner_type)')
        .in('place_id', placeIds);

      for (const link of (links || []) as PartnerPlaceRow[]) {
        partnerMap[link.place_id] = partnerMap[link.place_id] || [];
        partnerMap[link.place_id].push(link);
      }
    }

    const enriched = (places || []).map((place: any) => ({
      ...place,
      partner_links: partnerMap[place.id] || [],
      partner_count: (partnerMap[place.id] || []).length,
      gallery_count: Array.isArray(place.gallery_images) ? place.gallery_images.length : 0,
    }));

    return NextResponse.json({ places: enriched }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Places list API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Place name is required' }, { status: 400 });

    const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';
    const slug = body.slug?.trim()
      ? slugify(body.slug)
      : `${slugify(name)}-${Date.now().toString(36)}`;

    const row = {
      name,
      slug,
      category,
      subcategory: cleanText(body.subcategory),
      island_id: cleanText(body.island_id),
      island_name: cleanText(body.island_name),
      address: cleanText(body.address),
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      phone: cleanText(body.phone),
      website: cleanText(body.website),
      short_description: cleanText(body.short_description),
      description: cleanText(body.description),
      primary_image_url: cleanText(body.primary_image_url),
      gallery_images: cleanGallery(body.gallery_images),
      amenities: cleanArray(body.amenities),
      tags: cleanArray(body.tags),
      best_for: cleanArray(body.best_for),
      review_highlights: cleanArray(body.review_highlights),
      buddy_tips: cleanArray(body.buddy_tips),
      opening_hours: body.opening_hours && typeof body.opening_hours === 'object' ? body.opening_hours : null,
      source: cleanText(body.source) || 'manual',
      partner_id: cleanText(body.partner_id),
      status: VALID_STATUSES.includes(body.status) ? body.status : 'active',
      is_active: cleanBool(body.is_active, true),
      is_verified: cleanBool(body.is_verified, false),
      is_partner: !!body.partner_id,
      featured: cleanBool(body.featured, false),
      sponsored: cleanBool(body.sponsored, false),
    };

    const { data, error } = await supabase
      .from('places')
      .insert(row as never)
      .select('*')
      .single();

    if (error) throw error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'place_created',
      entityType: 'place',
      entityId: (data as any).id,
      before: null,
      after: data,
      metadata: { source: 'places_manager' },
    });

    return NextResponse.json({ success: true, place: data }, { status: 201, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Place create API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Place id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase.from('places').select('*').eq('id', id).single();
    if (fetchError || !existing) return NextResponse.json({ error: fetchError?.message ?? 'Place not found' }, { status: 404 });

    const beforeRow = existing as PlaceRow;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Quick actions
    if (body.action === 'verify') { updates.is_verified = true; }
    else if (body.action === 'hide') { updates.is_active = false; updates.status = 'hidden'; }
    else if (body.action === 'show') { updates.is_active = true; updates.status = 'active'; }
    else if (body.action === 'toggle_featured') { updates.featured = !(beforeRow as any).featured; }
    else {
      // Full field update
      if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
      if (typeof body.slug === 'string') updates.slug = slugify(body.slug) || (beforeRow as any).slug;
      if (VALID_CATEGORIES.includes(body.category)) updates.category = body.category;
      if (typeof body.subcategory !== 'undefined') updates.subcategory = cleanText(body.subcategory);
      if (typeof body.island_id !== 'undefined') updates.island_id = cleanText(body.island_id);
      if (typeof body.island_name !== 'undefined') updates.island_name = cleanText(body.island_name);
      if (typeof body.address !== 'undefined') updates.address = cleanText(body.address);
      if (typeof body.latitude !== 'undefined') updates.latitude = typeof body.latitude === 'number' ? body.latitude : null;
      if (typeof body.longitude !== 'undefined') updates.longitude = typeof body.longitude === 'number' ? body.longitude : null;
      if (typeof body.phone !== 'undefined') updates.phone = cleanText(body.phone);
      if (typeof body.website !== 'undefined') updates.website = cleanText(body.website);
      if (typeof body.short_description !== 'undefined') updates.short_description = cleanText(body.short_description);
      if (typeof body.description !== 'undefined') updates.description = cleanText(body.description);
      if (typeof body.primary_image_url !== 'undefined') updates.primary_image_url = cleanText(body.primary_image_url);
      if (Array.isArray(body.gallery_images)) {
        const gallery = cleanGallery(body.gallery_images);
        updates.gallery_images = gallery;
        const primaryImg = gallery.find(img => img.is_primary);
        if (primaryImg && !body.primary_image_url) updates.primary_image_url = primaryImg.url;
      }
      if (Array.isArray(body.amenities)) updates.amenities = cleanArray(body.amenities);
      if (Array.isArray(body.tags)) updates.tags = cleanArray(body.tags);
      if (Array.isArray(body.best_for)) updates.best_for = cleanArray(body.best_for);
      if (Array.isArray(body.review_highlights)) updates.review_highlights = cleanArray(body.review_highlights);
      if (Array.isArray(body.buddy_tips)) updates.buddy_tips = cleanArray(body.buddy_tips);
      if (typeof body.opening_hours !== 'undefined') updates.opening_hours = body.opening_hours || null;
      if (typeof body.source !== 'undefined') updates.source = cleanText(body.source);
      if (typeof body.partner_id !== 'undefined') {
        updates.partner_id = cleanText(body.partner_id);
        updates.is_partner = !!body.partner_id;
      }
      if (VALID_STATUSES.includes(body.status)) updates.status = body.status;
      if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
      if (typeof body.is_verified === 'boolean') updates.is_verified = body.is_verified;
      if (typeof body.featured === 'boolean') updates.featured = body.featured;
      if (typeof body.sponsored === 'boolean') updates.sponsored = body.sponsored;
    }

    const { data, error } = await supabase
      .from('places')
      .update(updates as never)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'place_updated',
      entityType: 'place',
      entityId: id,
      before: beforeRow,
      after: data as PlaceRow,
      metadata: { updates, source: 'places_manager' },
    });

    return NextResponse.json({ success: true, place: data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Place update API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });

export const DELETE = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'Place id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase.from('places').select('id,name,category').eq('id', id).single();
    if (fetchError || !existing) return NextResponse.json({ error: 'Place not found' }, { status: 404 });

    // Archive rather than hard delete to protect referential integrity
    const { error } = await supabase
      .from('places')
      .update({ status: 'archived', is_active: false, updated_at: new Date().toISOString() } as never)
      .eq('id', id);

    if (error) throw error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'place_archived',
      entityType: 'place',
      entityId: id,
      before: existing,
      after: { ...(existing as Record<string, unknown>), status: 'archived', is_active: false },
      metadata: { source: 'places_manager' },
    });

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Place delete API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });
