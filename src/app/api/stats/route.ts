import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

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
      supabase.from('bookings').select('id, amount, status'),
      supabase.from('bookings').select('id, amount, status').gte('created_at', monthStart),
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
    const confirmedBookings = (bookingsAll.data || []).filter((b: any) => b.status === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum: number, b: any) => sum + (parseFloat(b.amount) || 0), 0);
    const confirmedMonth = (bookingsMonth.data || []).filter((b: any) => b.status === 'confirmed');
    const revenueThisMonth = confirmedMonth.reduce((sum: number, b: any) => sum + (parseFloat(b.amount) || 0), 0);

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
