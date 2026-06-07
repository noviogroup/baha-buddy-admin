import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 25), 50);

    let query = supabase
      .from('places')
      .select('id,name,category,island_name,rating,review_count,status,is_active,source_priority')
      .order('name', { ascending: true })
      .limit(limit);

    if (q) query = query.ilike('name', `%${q}%`);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ places: data || [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Place search API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
