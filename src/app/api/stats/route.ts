import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows, isRecognizedRevenue, num } from '@/lib/booking-reconciliation';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  amount?: number | string | null;
  status?: string | null;
  paid_at?: string | null;
  stripe_payment_intent_id?: string | null;
  booking_type?: string | null;
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string;
  provider_status?: string;
  failure_state?: string;
  reconciled?: boolean;
};

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Parallel queries
    const [
      usersTotal,
      usersToday,
      usersWeek,
      tripsAll,
      bookingsAll,
      bookingsMonth,
      messagesTotal,
      aiCostToday,
      aiCostMonth,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('trips').select('id, status, islands'),
      supabase.from('bookings').select('id, amount, status, paid_at, stripe_payment_intent_id, booking_type, booking_reference, external_reference, financial_metadata'),
      supabase.from('bookings').select('id, amount, status, paid_at, stripe_payment_intent_id, booking_type, booking_reference, external_reference, financial_metadata').gte('created_at', monthStart),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
      supabase.from('ai_usage_log').select('estimated_cost_usd').gte('created_at', todayStart),
      supabase.from('ai_usage_log').select('estimated_cost_usd').gte('created_at', monthStart),
    ]);

    // Trip status breakdown
    const tripsByStatus: Record<string, number> = {};
    let activeTrips = 0;
    const islandCounts: Record<string, number> = {};

    (tripsAll.data || []).forEach((t: any) => {
      tripsByStatus[t.status] = (tripsByStatus[t.status] || 0) + 1;
      if (['draft', 'planned', 'booked', 'active'].includes(t.status)) activeTrips++;
      (t.islands || []).forEach((isl: string) => {
        islandCounts[isl] = (islandCounts[isl] || 0) + 1;
      });
    });

    const topIslands = Object.entries(islandCounts)
      .map(([island, count]) => ({ island, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Revenue
    const allBookings = await enrichBookingRows(supabase, (bookingsAll.data || []) as BookingRow[]);
    const monthBookings = await enrichBookingRows(supabase, (bookingsMonth.data || []) as BookingRow[]);
    const totalRevenue = allBookings.filter(isRecognizedRevenue).reduce((sum: number, b: BookingRow) => sum + num(b.amount), 0);
    const revenueThisMonth = monthBookings.filter(isRecognizedRevenue).reduce((sum: number, b: BookingRow) => sum + num(b.amount), 0);

    // AI costs
    const aiTodayCost = (aiCostToday.data || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_usd) || 0), 0);
    const aiMonthCost = (aiCostMonth.data || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_usd) || 0), 0);

    const totalUserCount = usersTotal.count || 0;

    return NextResponse.json({
      totalUsers: totalUserCount,
      newUsersToday: usersToday.count || 0,
      newUsersWeek: usersWeek.count || 0,
      activeTrips,
      totalTrips: (tripsAll.data || []).length,
      tripsByStatus,
      totalBookings: (bookingsAll.data || []).length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      aiCostToday: Math.round(aiTodayCost * 100) / 100,
      aiCostMonth: Math.round(aiMonthCost * 100) / 100,
      totalMessages: messagesTotal.count || 0,
      avgMessagesPerUser: totalUserCount > 0 ? Math.round(((messagesTotal.count || 0) / totalUserCount) * 10) / 10 : 0,
      topIslands,
    });
  } catch (err: any) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
