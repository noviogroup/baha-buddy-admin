import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows, isRecognizedRevenue } from '@/lib/booking-reconciliation';
import { bookingRecoveryGuidance } from '@/lib/booking-recovery';

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
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string;
  provider_status?: string;
  source_surface?: string;
  failure_state?: string;
  reconciled?: boolean;
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

function groupRevenueBy(
  rows: BookingRow[],
  key: 'booking_type' | 'provider' | 'status' | 'payment_status' | 'provider_status' | 'source_surface' | 'failure_state',
) {
  const grouped = new Map<string, { label: string; count: number; gross: number; captured: number; paid: number; issues: number }>();

  for (const row of rows) {
    const label = row[key] || 'unknown';
    const current = grouped.get(label) || { label, count: 0, gross: 0, captured: 0, paid: 0, issues: 0 };
    const amount = money(row.amount);
    current.count += 1;
    current.gross += amount;
    if (row.payment_status === 'paid') current.captured += amount;
    if (isRecognizedRevenue(row)) current.paid += amount;
    if (row.failure_state && row.failure_state !== 'none') current.issues += 1;
    grouped.set(label, current);
  }

  return Array.from(grouped.values())
    .map(item => ({ ...item, gross: money(item.gross), captured: money(item.captured), paid: money(item.paid) }))
    .sort((a, b) => b.gross - a.gross);
}

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const monthStart = monthStartIso();
    const todayStart = todayStartIso();

    const { data: bookingRows, error: bookingsError } = await supabase
      .from('bookings')
      .select('id,user_id,trip_id,booking_type,provider,amount,currency,status,created_at,paid_at,stripe_payment_intent_id,booking_reference,external_reference,financial_metadata')
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;

    const bookings = await enrichBookingRows(supabase, (bookingRows || []) as BookingRow[]);
    const paidBookings = bookings.filter(isRecognizedRevenue);
    const todayBookings = bookings.filter(b => new Date(b.created_at).toISOString() >= todayStart);
    const capturedBookings = bookings.filter(b => b.payment_status === 'paid');

    const grossBookingValue = money(bookings.reduce((sum, b) => sum + money(b.amount), 0));
    const capturedPayments = money(capturedBookings.reduce((sum, b) => sum + money(b.amount), 0));
    const revenueThisMonth = money(paidBookings.reduce((sum, b) => sum + money(b.amount), 0));
    const revenueToday = money(
      todayBookings
        .filter(isRecognizedRevenue)
        .reduce((sum, b) => sum + money(b.amount), 0)
    );

    const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
      const status = b.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const paymentStatusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
      const status = b.payment_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const providerStatusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
      const status = b.provider_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const failureStateCounts = bookings.reduce<Record<string, number>>((acc, b) => {
      const state = b.failure_state || 'none';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    const bookingIssues = bookings.filter(b => b.failure_state && b.failure_state !== 'none');
    const p0BookingIssues = bookingIssues.filter(b => bookingRecoveryGuidance(b.failure_state).priority === 'P0');

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
        capturedPayments,
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
        paymentPaid: paymentStatusCounts.paid || 0,
        paymentPending: paymentStatusCounts.pending || 0,
        paymentRefunded: paymentStatusCounts.refunded || 0,
        providerConfirmed: providerStatusCounts.confirmed || 0,
        providerPending: providerStatusCounts.pending || 0,
        providerFailed: providerStatusCounts.failed || 0,
        bookingIssues: bookingIssues.length,
        p0BookingIssues: p0BookingIssues.length,
        paidUsers: paidUsers.size,
        revenueSource: 'canonical_bookings',
      },
      breakdowns: {
        byCategory: groupRevenueBy(bookings, 'booking_type'),
        byProvider: groupRevenueBy(bookings, 'provider'),
        byStatus: groupRevenueBy(bookings, 'status'),
        byPaymentStatus: groupRevenueBy(bookings, 'payment_status'),
        byProviderStatus: groupRevenueBy(bookings, 'provider_status'),
        bySource: groupRevenueBy(bookings, 'source_surface'),
        byRecoveryState: groupRevenueBy(bookings, 'failure_state'),
      },
      statusCounts: {
        booking: statusCounts,
        payment: paymentStatusCounts,
        provider: providerStatusCounts,
        recovery: failureStateCounts,
      },
      notes: [
        bookings.length === 0 ? 'No booking rows exist yet. Revenue will remain zero until booking/order flows are validated.' : null,
        'Revenue is recognized only from canonical booking rows where payment, provider, local booking, and trip item state reconcile.',
        'Estimated net revenue currently subtracts AI cost only. Provider fees, Stripe fees, commissions, and payouts should be added later.',
        'Concierge, partner subscription, sponsored campaign, and visa referral revenue need dedicated event/category tracking later.',
      ].filter(Boolean),
    });
  } catch (err: any) {
    console.error('Revenue summary API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
