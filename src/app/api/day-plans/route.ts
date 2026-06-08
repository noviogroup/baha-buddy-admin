import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('cruise_itineraries')
    .select('*, cruise_itinerary_stops(count)', { count: 'exact' })
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plans = (data || []).map((plan: any) => ({
    ...plan,
    stop_count: plan.cruise_itinerary_stops?.[0]?.count || 0,
  }));

  return NextResponse.json({ plans, total: count || 0 });
});
