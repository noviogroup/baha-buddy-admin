import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('id,name,partner_type,status')
      .in('status', ['active', 'prospect'])
      .order('name', { ascending: true })
      .limit(200);

    if (error) throw error;

    return NextResponse.json(
      { partners: data || [] },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('Partners list API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
