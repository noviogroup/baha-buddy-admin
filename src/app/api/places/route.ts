import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const queue = (searchParams.get('queue') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const island = (searchParams.get('island') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

    let query = supabase
      .from('places')
      .select('id,name,category,subcategory,island_name,address,phone,website,description,primary_image_url,rating,review_count,price_level,status,is_active,is_verified,is_partner,source_priority,metadata,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (q) query = query.ilike('name', `%${q}%`);
    if (category && category !== 'all') query = query.eq('category', category);
    if (status && status !== 'all') query = query.eq('status', status);
    if (island && island !== 'all') query = query.eq('island_name', island);
    if (queue === 'missing_images') query = query.is('primary_image_url', null);
    if (queue === 'unverified') query = query.eq('is_verified', false);
    if (queue === 'hidden') query = query.or('is_active.eq.false,status.eq.hidden');
    if (queue === 'partner_linked') query = query.eq('is_partner', true);

    const { data: places, error } = await query;
    if (error) throw error;

    const placeIds = (places || []).map((p: any) => p.id);
    const partnerMap: Record<string, any[]> = {};

    if (placeIds.length > 0) {
      const { data: links } = await supabase
        .from('partner_places')
        .select('id,place_id,partner_id,relationship_type,partners(id,name,status,tier,partner_type,is_featured,is_sponsored)')
        .in('place_id', placeIds);

      for (const link of links || []) {
        partnerMap[link.place_id] = partnerMap[link.place_id] || [];
        partnerMap[link.place_id].push(link);
      }
    }

    const enriched = (places || []).map((place: any) => ({
      ...place,
      partner_links: partnerMap[place.id] || [],
      partner_count: (partnerMap[place.id] || []).length,
    }));

    return NextResponse.json({ places: enriched }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Places list API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Place id is required' }, { status: 400 });

    const before = await supabase.from('places').select('*').eq('id', id).single();
    if (before.error) return NextResponse.json({ error: before.error.message }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.is_verified === 'boolean') updates.is_verified = body.is_verified;
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
    if (typeof body.status === 'string' && ['draft', 'active', 'hidden', 'archived'].includes(body.status)) updates.status = body.status;
    if (typeof body.primary_image_url === 'string') updates.primary_image_url = body.primary_image_url.trim() || null;
    if (typeof body.description === 'string') updates.description = body.description.trim() || null;

    if (body.action === 'verify') updates.is_verified = true;
    if (body.action === 'hide') { updates.is_active = false; updates.status = 'hidden'; }
    if (body.action === 'show') { updates.is_active = true; updates.status = 'active'; }

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
      before: before.data,
      after: data,
      metadata: { updates, source: 'places_admin' },
    });

    return NextResponse.json({ success: true, place: data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Place update API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });
