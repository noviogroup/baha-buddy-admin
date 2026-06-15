import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('islands')
      .select('id,slug,name,short_name,active')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(
      { islands: (data || []).map((i: any) => ({ id: i.id, slug: i.slug, name: i.short_name || i.name })) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('Islands list API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
