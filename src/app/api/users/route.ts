import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows, isRecognizedRevenue, normalizedStatus, num } from '@/lib/booking-reconciliation';
import { bookingRecoveryGuidance } from '@/lib/booking-recovery';

export const dynamic = 'force-dynamic';

type TravelerBookingRow = {
  id: string;
  user_id?: string | null;
  trip_id?: string | null;
  booking_type?: string | null;
  provider?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  stripe_payment_intent_id?: string | null;
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string | null;
  provider_status?: string | null;
  source_surface?: string | null;
  failure_state?: string | null;
};

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const users = data || [];
    const bookingContext = await loadBookingContextForUsers(supabase, users.map((user: any) => user.id).filter(Boolean));

    return NextResponse.json({
      users: users.map((user: any) => ({
        ...user,
        booking_summary: bookingContext.byUser.get(user.id) || emptySerializedBookingSummary(),
      })),
      total: count || 0,
      summary: {
        travelers: count || users.length,
        loaded: users.length,
        travelersWithBookings: bookingContext.travelersWithBookings,
        travelersWithBookingIssues: bookingContext.travelersWithBookingIssues,
        recognizedRevenue: bookingContext.recognizedRevenue,
        capturedPayments: bookingContext.capturedPayments,
      },
      ...(bookingContext.note ? { bookingNote: bookingContext.note } : {}),
    });
  } catch (err: any) {
    console.error('Users API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

async function loadBookingContextForUsers(supabase: any, userIds: string[]) {
  if (!userIds.length) {
    return {
      byUser: new Map<string, ReturnType<typeof serializeBookingSummary>>(),
      travelersWithBookings: 0,
      travelersWithBookingIssues: 0,
      recognizedRevenue: 0,
      capturedPayments: 0,
    };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('id, user_id, trip_id, booking_type, provider, amount, currency, status, paid_at, created_at, stripe_payment_intent_id, booking_reference, external_reference, financial_metadata')
    .in('user_id', userIds);

  if (error?.code === '42P01') {
    return {
      byUser: new Map<string, ReturnType<typeof serializeBookingSummary>>(),
      travelersWithBookings: 0,
      travelersWithBookingIssues: 0,
      recognizedRevenue: 0,
      capturedPayments: 0,
      note: 'bookings table not found; traveler booking summaries are unavailable.',
    };
  }
  if (error) throw error;

  const enriched = await enrichBookingRows(supabase, (data || []) as TravelerBookingRow[]);
  const byUser = new Map<string, ReturnType<typeof emptyBookingSummary>>();

  for (const id of userIds) {
    byUser.set(id, emptyBookingSummary());
  }

  for (const row of enriched as TravelerBookingRow[]) {
    if (!row.user_id) continue;
    const summary = byUser.get(row.user_id) || emptyBookingSummary();
    const amount = num(row.amount);
    const status = normalizedStatus(row.status);
    const failureState = row.failure_state || 'none';
    const recovery = bookingRecoveryGuidance(failureState);

    summary.total += 1;
    if (['booked', 'confirmed', 'succeeded', 'paid'].includes(status)) summary.confirmed += 1;
    if (status === 'pending') summary.pending += 1;
    if (status === 'failed') summary.failed += 1;
    if (status === 'cancelled' || status === 'canceled') summary.cancelled += 1;
    if (status === 'refunded') summary.refunded += 1;
    if (row.payment_status === 'paid') {
      summary.paymentPaid += 1;
      summary.capturedPayments += amount;
    }
    if (row.provider_status === 'confirmed') summary.providerConfirmed += 1;
    if (row.provider_status === 'pending') summary.providerPending += 1;
    if (row.provider_status === 'failed') summary.providerFailed += 1;
    if (failureState !== 'none') summary.issues += 1;
    if (recovery.priority === 'P0') summary.p0Issues += 1;
    if (isRecognizedRevenue(row)) summary.recognizedRevenue += amount;
    if (row.trip_id) summary.tripIds.add(row.trip_id);
    if (row.booking_type) summary.bookingTypes.add(row.booking_type);
    if (row.provider) summary.providers.add(row.provider);
    if (row.source_surface) summary.sources.add(row.source_surface);
    byUser.set(row.user_id, summary);
  }

  const normalizedByUser = new Map<string, ReturnType<typeof serializeBookingSummary>>();
  for (const [userId, summary] of byUser.entries()) {
    normalizedByUser.set(userId, serializeBookingSummary(summary));
  }

  const summaries = Array.from(normalizedByUser.values());

  return {
    byUser: normalizedByUser,
    travelersWithBookings: summaries.filter(summary => summary.total > 0).length,
    travelersWithBookingIssues: summaries.filter(summary => summary.issues > 0).length,
    recognizedRevenue: roundMoney(summaries.reduce((sum, summary) => sum + summary.recognizedRevenue, 0)),
    capturedPayments: roundMoney(summaries.reduce((sum, summary) => sum + summary.capturedPayments, 0)),
  };
}

function emptyBookingSummary() {
  return {
    total: 0,
    confirmed: 0,
    pending: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
    paymentPaid: 0,
    providerConfirmed: 0,
    providerPending: 0,
    providerFailed: 0,
    issues: 0,
    p0Issues: 0,
    recognizedRevenue: 0,
    capturedPayments: 0,
    tripIds: new Set<string>(),
    bookingTypes: new Set<string>(),
    providers: new Set<string>(),
    sources: new Set<string>(),
  };
}

function serializeBookingSummary(summary: ReturnType<typeof emptyBookingSummary>) {
  return {
    ...summary,
    recognizedRevenue: roundMoney(summary.recognizedRevenue),
    capturedPayments: roundMoney(summary.capturedPayments),
    tripCount: summary.tripIds.size,
    tripIds: Array.from(summary.tripIds).sort(),
    bookingTypes: Array.from(summary.bookingTypes).sort(),
    providers: Array.from(summary.providers).sort(),
    sources: Array.from(summary.sources).sort(),
  };
}

function emptySerializedBookingSummary() {
  return serializeBookingSummary(emptyBookingSummary());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
