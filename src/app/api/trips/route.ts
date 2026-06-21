import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows, isRecognizedRevenue, num } from '@/lib/booking-reconciliation';
import { bookingRecoveryGuidance } from '@/lib/booking-recovery';

export const dynamic = 'force-dynamic';

type TripBookingRow = {
  id: string;
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
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('trips')
      .select('*, users!inner(display_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const trips = data || [];
    const bookingContext = await loadBookingContextForTrips(supabase, trips.map((trip: any) => trip.id).filter(Boolean));

    return NextResponse.json({
      trips: trips.map((trip: any) => ({
        ...trip,
        booking_summary: bookingContext.byTrip.get(trip.id) || emptySerializedBookingSummary(),
      })),
      total: count || 0,
      summary: {
        trips: count || trips.length,
        loaded: trips.length,
        tripsWithBookings: bookingContext.tripsWithBookings,
        tripsWithBookingIssues: bookingContext.tripsWithBookingIssues,
        recognizedRevenue: bookingContext.recognizedRevenue,
        capturedPayments: bookingContext.capturedPayments,
      },
      ...(bookingContext.note ? { bookingNote: bookingContext.note } : {}),
    });
  } catch (err: any) {
    console.error('Trips API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

async function loadBookingContextForTrips(supabase: any, tripIds: string[]) {
  if (!tripIds.length) {
    return {
      byTrip: new Map<string, ReturnType<typeof emptyBookingSummary>>(),
      tripsWithBookings: 0,
      tripsWithBookingIssues: 0,
      recognizedRevenue: 0,
      capturedPayments: 0,
    };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('id, trip_id, booking_type, provider, amount, currency, status, paid_at, created_at, stripe_payment_intent_id, booking_reference, external_reference, financial_metadata')
    .in('trip_id', tripIds);

  if (error?.code === '42P01') {
    return {
      byTrip: new Map<string, ReturnType<typeof emptyBookingSummary>>(),
      tripsWithBookings: 0,
      tripsWithBookingIssues: 0,
      recognizedRevenue: 0,
      capturedPayments: 0,
      note: 'bookings table not found; trip booking summaries are unavailable.',
    };
  }
  if (error) throw error;

  const enriched = await enrichBookingRows(supabase, (data || []) as TripBookingRow[]);
  const byTrip = new Map<string, ReturnType<typeof emptyBookingSummary>>();

  for (const id of tripIds) {
    byTrip.set(id, emptyBookingSummary());
  }

  for (const row of enriched as TripBookingRow[]) {
    if (!row.trip_id) continue;
    const summary = byTrip.get(row.trip_id) || emptyBookingSummary();
    const amount = num(row.amount);
    const failureState = row.failure_state || 'none';
    const recovery = bookingRecoveryGuidance(failureState);

    summary.total += 1;
    if (row.status === 'confirmed' || row.status === 'booked' || row.status === 'succeeded' || row.status === 'paid') summary.confirmed += 1;
    if (row.status === 'pending') summary.pending += 1;
    if (row.status === 'failed') summary.failed += 1;
    if (row.status === 'cancelled' || row.status === 'canceled') summary.cancelled += 1;
    if (row.status === 'refunded') summary.refunded += 1;
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
    if (row.booking_type) summary.bookingTypes.add(row.booking_type);
    if (row.provider) summary.providers.add(row.provider);
    if (row.source_surface) summary.sources.add(row.source_surface);
    byTrip.set(row.trip_id, summary);
  }

  const normalizedByTrip = new Map<string, ReturnType<typeof serializeBookingSummary>>();
  for (const [tripId, summary] of byTrip.entries()) {
    normalizedByTrip.set(tripId, serializeBookingSummary(summary));
  }

  const summaries = Array.from(normalizedByTrip.values());

  return {
    byTrip: normalizedByTrip,
    tripsWithBookings: summaries.filter(summary => summary.total > 0).length,
    tripsWithBookingIssues: summaries.filter(summary => summary.issues > 0).length,
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
