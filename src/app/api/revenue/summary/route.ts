import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  booking_type: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
};

type AiUsageRow = {
  id: string;
  user_id: string | null;
  thread_id: string | null;
  model: string | null;
  estimated_cost_usd: number | string | null;
  created_at: string;
};

function money(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function todayStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function groupRevenueBy(rows: BookingRow[], key: 'booking_type' | 'provider' | 'status') {
  const grouped = new Map<string, { label: string; count: number; gross: number; paid: number }>();

  for (const row of rows) {
    const label = row[key] || 'unknown';
    const current = grouped.get(label) || { label, count: 0, gross: 0, paid: 0 };
    const amount = money(row.amount);
    current.count += 1;
    current.gross += amount;
    if (row.status === 'confirmed' || row.paid_at) current.paid += amount;
    grouped.set(label, current);
  }

  return Array.from(grouped.values())
    .map(item => ({ ...item, gross: money(item.gross), paid: money(item.paid) }))
    .sort((a, b) => b.gross - a.gross);
}

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const monthStart = monthStartIso();
    const todayStart = todayStartIso();

    const { data: bookingRows, error: bookingsError } = await supabase
      .from('bookings')
      .select('id,user_id,trip_id,booking_type,provider,amount,currency,status,created_at,paid_at,stripe_payment_intent_id')
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;

    const bookings = (bookingRows || []) as BookingRow[];
    const paidBookings = bookings.filter(b => b.status === 'confirmed' || b.paid_at);
    const todayBookings = bookings.filter(b => new Date(b.created_at).toISOString() >= todayStart);

    const grossBookingValue = money(bookings.reduce((sum, b) => sum + money(b.amount), 0));
    const revenueThisMonth = money(paidBookings.reduce((sum, b) => sum + money(b.amount), 0));
    const revenueToday = money(
      todayBookings
        .filter(b => b.status === 'confirmed' || b.paid_at)
        .reduce((sum, b) => sum + money(b.amount), 0)
    );

    const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
      const status = b.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const { data: aiRows } = await supabase
      .from('ai_usage_log')
      .select('id,user_id,thread_id,model,estimated_cost_usd,created_at')
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false });

    const aiUsage = (aiRows || []) as AiUsageRow[];
    const aiCostMonth = money(aiUsage.reduce((sum, row) => sum + money(row.estimated_cost_usd), 0));
    const aiCostToday = money(
      aiUsage
        .filter(row => new Date(row.created_at).toISOString() >= todayStart)
        .reduce((sum, row) => sum + money(row.estimated_cost_usd), 0)
    );

    const paidUsers = new Set(paidBookings.map(b => b.user_id).filter(Boolean));
    const revenuePerUser = paidUsers.size ? money(revenueThisMonth / paidUsers.size) : 0;
    const estimatedNetRevenue = money(revenueThisMonth - aiCostMonth);

    return NextResponse.json({
      summary: {
        revenueToday,
        revenueThisMonth,
        grossBookingValue,
        estimatedNetRevenue,
        aiCostToday,
        aiCostMonth,
        apiCostMonth: 0,
        revenuePerUser,
        totalBookings: bookings.length,
        confirmedBookings: statusCounts.confirmed || 0,
        pendingBookings: statusCounts.pending || 0,
        failedBookings: statusCounts.failed || 0,
        cancelledBookings: statusCounts.cancelled || 0,
        refundedBookings: statusCounts.refunded || 0,
        paidUsers: paidUsers.size,
      },
      breakdowns: {
        byCategory: groupRevenueBy(bookings, 'booking_type'),
        byProvider: groupRevenueBy(bookings, 'provider'),
        byStatus: groupRevenueBy(bookings, 'status'),
      },
      notes: [
        bookings.length === 0 ? 'No booking rows exist yet. Revenue will remain zero until booking/order flows are validated.' : null,
        'Estimated net revenue currently subtracts AI cost only. Provider fees, Stripe fees, commissions, and payouts should be added later.',
        'Concierge, partner subscription, sponsored campaign, and visa referral revenue need dedicated event/category tracking later.',
      ].filter(Boolean),
    });
  } catch (err: any) {
    console.error('Revenue summary API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
