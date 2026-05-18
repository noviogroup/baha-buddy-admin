import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('bookings')
      .select('*, trips(name), users!inner(display_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ bookings: data || [], total: count || 0 });
  } catch (err: any) {
    console.error('Bookings API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
