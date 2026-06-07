import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');

    if (!partnerId) return NextResponse.json({ error: 'partner_id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('partner_places')
      .select('id,partner_id,place_id,relationship_type,created_at,places(id,name,category,island_name,rating,review_count,status,is_active)')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ links: data || [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Partner place links API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const partnerId = typeof body.partner_id === 'string' ? body.partner_id : '';
    const placeId = typeof body.place_id === 'string' ? body.place_id : '';
    const relationshipType = typeof body.relationship_type === 'string' && body.relationship_type.trim()
      ? body.relationship_type.trim()
      : 'owner_operator';

    if (!partnerId) return NextResponse.json({ error: 'partner_id is required' }, { status: 400 });
    if (!placeId) return NextResponse.json({ error: 'place_id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('partner_places')
      .insert({ partner_id: partnerId, place_id: placeId, relationship_type: relationshipType } as never)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This partner is already linked to that place' }, { status: 409 });
      throw error;
    }

    await logAudit({
      supabase,
      admin,
      request,
      action: 'partner_place_linked',
      entityType: 'partner_place',
      entityId: data.id,
      after: data,
      metadata: { partner_id: partnerId, place_id: placeId, relationship_type: relationshipType },
    });

    return NextResponse.json({ success: true, link: data });
  } catch (err: any) {
    console.error('Partner place link create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });

export const DELETE = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const before = await supabase.from('partner_places').select('*').eq('id', id).single();
    if (before.error) return NextResponse.json({ error: before.error.message }, { status: 404 });

    const { error } = await supabase.from('partner_places').delete().eq('id', id);
    if (error) throw error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'partner_place_unlinked',
      entityType: 'partner_place',
      entityId: id,
      before: before.data,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Partner place link delete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });
