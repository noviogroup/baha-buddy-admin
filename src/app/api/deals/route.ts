import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_DEAL_TYPES = [
  'partner_offer',
  'featured_place',
  'sponsored_content',
  'concierge_upsell',
  'tour_promotion',
];

function cleanText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

function cleanNum(value: unknown): number | null {
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : null;
}

function cleanBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function cleanDate(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const dealType = (searchParams.get('deal_type') || '').trim();
    const activeFilter = searchParams.get('active');
    const featuredFilter = searchParams.get('featured');
    const sponsoredFilter = searchParams.get('sponsored');
    const partnerId = (searchParams.get('partner_id') || '').trim();
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortDir = searchParams.get('dir') !== 'asc';
    const limit = Math.min(Number(searchParams.get('limit') || 200), 500);

    let query = supabase
      .from('deals')
      .select('*')
      .limit(limit);

    if (dealType && VALID_DEAL_TYPES.includes(dealType)) {
      query = query.eq('deal_type', dealType);
    }
    if (activeFilter === 'true') query = query.eq('active', true);
    if (activeFilter === 'false') query = query.eq('active', false);
    if (featuredFilter === 'true') query = query.eq('featured', true);
    if (sponsoredFilter === 'true') query = query.eq('sponsored', true);
    if (partnerId) query = query.eq('partner_id', partnerId);

    const validSortCols = ['created_at', 'updated_at', 'starts_at', 'title', 'price_from'];
    const col = validSortCols.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(col, { ascending: !sortDir, nullsFirst: false });

    const { data: deals, error } = await query;
    if (error) throw error;

    // Fetch partner names in one shot if any deals have partner_id
    const partnerIds = [...new Set((deals || []).map((d: any) => d.partner_id).filter(Boolean))];
    let partnerMap: Record<string, string> = {};
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from('partners')
        .select('id,name')
        .in('id', partnerIds);
      if (partners) {
        partnerMap = Object.fromEntries(partners.map((p: any) => [p.id, p.name]));
      }
    }

    // Fetch place names in one shot
    const placeIds = [...new Set((deals || []).map((d: any) => d.place_id).filter(Boolean))];
    let placeMap: Record<string, string> = {};
    if (placeIds.length > 0) {
      const { data: places } = await supabase
        .from('places')
        .select('id,name')
        .in('id', placeIds);
      if (places) {
        placeMap = Object.fromEntries(places.map((p: any) => [p.id, p.name]));
      }
    }

    const enriched = (deals || []).map((d: any) => ({
      ...d,
      partner_name: d.partner_id ? (partnerMap[d.partner_id] || null) : null,
      place_name: d.place_id ? (placeMap[d.place_id] || null) : null,
    }));

    return NextResponse.json(
      { deals: enriched },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err: any) {
    console.error('Deals GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const title = cleanText(body.title);
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const deal_type = cleanText(body.deal_type) || 'partner_offer';
    if (!VALID_DEAL_TYPES.includes(deal_type)) {
      return NextResponse.json({ error: `Invalid deal_type: ${deal_type}` }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      title,
      deal_type,
      description: cleanText(body.description),
      image: cleanText(body.image),
      price_from: cleanNum(body.price_from),
      cta_label: cleanText(body.cta_label),
      cta_url: cleanText(body.cta_url),
      source: cleanText(body.source),
      starts_at: cleanDate(body.starts_at),
      ends_at: cleanDate(body.ends_at),
      active: cleanBool(body.active, true),
      featured: cleanBool(body.featured, false),
      sponsored: cleanBool(body.sponsored, false),
      partner_id: cleanText(body.partner_id) || null,
      place_id: cleanText(body.place_id) || null,
    };

    const { data, error } = await supabase
      .from('deals')
      .insert(payload as never)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ deal: data }, { status: 201 });
  } catch (err: any) {
    console.error('Deals POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id);
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: fetchErr } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    // Quick toggle actions
    const action = cleanText(body.action);
    let patch: Record<string, unknown> = {};

    if (action === 'toggle_active') {
      patch = { active: !(existing as any).active, updated_at: new Date().toISOString() };
    } else if (action === 'toggle_featured') {
      patch = { featured: !(existing as any).featured, updated_at: new Date().toISOString() };
    } else if (action === 'toggle_sponsored') {
      patch = { sponsored: !(existing as any).sponsored, updated_at: new Date().toISOString() };
    } else {
      // Full update
      const deal_type = cleanText(body.deal_type);
      if (deal_type && !VALID_DEAL_TYPES.includes(deal_type)) {
        return NextResponse.json({ error: `Invalid deal_type: ${deal_type}` }, { status: 400 });
      }
      if (body.title !== undefined && !cleanText(body.title)) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      patch = {
        ...(body.title !== undefined && { title: cleanText(body.title) }),
        ...(body.deal_type !== undefined && { deal_type }),
        ...(body.description !== undefined && { description: cleanText(body.description) }),
        ...(body.image !== undefined && { image: cleanText(body.image) }),
        ...(body.price_from !== undefined && { price_from: cleanNum(body.price_from) }),
        ...(body.cta_label !== undefined && { cta_label: cleanText(body.cta_label) }),
        ...(body.cta_url !== undefined && { cta_url: cleanText(body.cta_url) }),
        ...(body.source !== undefined && { source: cleanText(body.source) }),
        ...(body.starts_at !== undefined && { starts_at: cleanDate(body.starts_at) }),
        ...(body.ends_at !== undefined && { ends_at: cleanDate(body.ends_at) }),
        ...(body.active !== undefined && { active: cleanBool(body.active, true) }),
        ...(body.featured !== undefined && { featured: cleanBool(body.featured, false) }),
        ...(body.sponsored !== undefined && { sponsored: cleanBool(body.sponsored, false) }),
        ...(body.partner_id !== undefined && { partner_id: cleanText(body.partner_id) || null }),
        ...(body.place_id !== undefined && { place_id: cleanText(body.place_id) || null }),
        updated_at: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from('deals')
      .update(patch as never)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ deal: data });
  } catch (err: any) {
    console.error('Deals PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Deals DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
