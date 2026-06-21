import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows, isRecognizedRevenue, num } from '@/lib/booking-reconciliation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PaymentBookingRow = {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  booking_type: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at?: string | null;
  stripe_payment_intent_id: string | null;
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string | null;
  provider_status?: string | null;
  source_surface?: string | null;
  provider_reference?: string | null;
  failure_state?: string | null;
  reconciled?: boolean;
  trip_item_id?: string | null;
  trip_item_type?: string | null;
  trip_item_name?: string | null;
};

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = normalizedFilter(searchParams.get('payment_status'));
    const bookingType = normalizedFilter(searchParams.get('booking_type') || searchParams.get('offer_type'));
    const provider = normalizedFilter(searchParams.get('provider'));
    const providerStatus = normalizedFilter(searchParams.get('provider_status'));
    const source = normalizedFilter(searchParams.get('source'));
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);
    const fetchLimit = needsPostFilter(paymentStatus, providerStatus, source)
      ? Math.min(limit * 3, 500)
      : limit;

    let query = supabase
      .from('bookings')
      .select('id,user_id,trip_id,booking_type,provider,amount,currency,status,paid_at,created_at,updated_at,stripe_payment_intent_id,booking_reference,external_reference,financial_metadata')
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (bookingType !== 'all') query = query.eq('booking_type', bookingType);
    if (provider !== 'all') query = query.eq('provider', provider);

    const { data, error } = await query;
    if (error) throw error;

    const enriched = await enrichBookingRows(supabase, (data || []) as PaymentBookingRow[]);
    const rows = enriched
      .filter((row: PaymentBookingRow) => paymentStatus === 'all' || row.payment_status === paymentStatus)
      .filter((row: PaymentBookingRow) => providerStatus === 'all' || row.provider_status === providerStatus)
      .filter((row: PaymentBookingRow) => source === 'all' || row.source_surface === source)
      .slice(0, limit)
      .map(toPaymentRecord);

    const summary = rows.reduce((acc: Record<string, number>, row) => {
      const amount = num(row.amount);
      const paymentKey = row.payment_status || 'unknown';
      const providerKey = row.provider_status || 'unknown';
      acc.total += 1;
      acc[paymentKey] = (acc[paymentKey] || 0) + 1;
      acc[`provider_${providerKey}`] = (acc[`provider_${providerKey}`] || 0) + 1;
      if (paymentKey === 'paid') acc.capturedAmount += amount;
      if (paymentKey === 'refunded') acc.refundedRevenue += amount;
      if (row.failure_state && row.failure_state !== 'none') acc.issues += 1;
      if (row.reconciled) acc.reconciled += 1;
      if (isRecognizedRevenue(row)) acc.paidRevenue += amount;
      return acc;
    }, {
      total: 0,
      paidRevenue: 0,
      capturedAmount: 0,
      refundedRevenue: 0,
      paid: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
      provider_confirmed: 0,
      provider_pending: 0,
      provider_failed: 0,
      issues: 0,
      reconciled: 0,
    });

    const byOffer = groupRows(rows, row => row.booking_type || 'unknown');
    const bySource = groupRows(rows, row => row.source_surface || 'unknown');
    const byProviderStatus = groupRows(rows, row => row.provider_status || 'unknown');

    return NextResponse.json(
      { payments: rows, summary, byOffer, bySource, byProviderStatus },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err: any) {
    console.error('Payments API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

function normalizedFilter(value: string | null) {
  return value && value.trim() ? value.trim() : 'all';
}

function needsPostFilter(paymentStatus: string, providerStatus: string, source: string) {
  return paymentStatus !== 'all' || providerStatus !== 'all' || source !== 'all';
}

function toPaymentRecord(row: PaymentBookingRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    trip_id: row.trip_id,
    booking_type: row.booking_type,
    provider: row.provider,
    amount: row.amount,
    currency: row.currency || 'USD',
    status: row.status,
    payment_status: row.payment_status || 'pending',
    provider_status: row.provider_status || 'pending',
    source_surface: row.source_surface || 'unknown',
    provider_reference: row.provider_reference || null,
    failure_state: row.failure_state || 'none',
    reconciled: row.reconciled === true,
    stripe_payment_intent_id: row.stripe_payment_intent_id,
    booking_reference: row.booking_reference || null,
    external_reference: row.external_reference || null,
    trip_item_id: row.trip_item_id || null,
    trip_item_type: row.trip_item_type || null,
    trip_item_name: row.trip_item_name || null,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at || null,
    // Backward-compatible aliases for the existing UI and callers.
    offer_type: row.booking_type,
    price_usd: row.amount,
    source: row.source_surface || 'unknown',
    traveler_name: row.trip_item_name || null,
    traveler_email: null,
  };
}

function groupRows<T extends { amount: unknown; reconciled?: boolean }>(
  rows: T[],
  getLabel: (row: T) => string,
) {
  const grouped = new Map<string, { label: string; count: number; revenue: number; captured: number }>();

  for (const row of rows) {
    const label = getLabel(row);
    const current = grouped.get(label) || { label, count: 0, revenue: 0, captured: 0 };
    const amount = num(row.amount);
    current.count += 1;
    if (row.reconciled) current.revenue += amount;
    current.captured += amount;
    grouped.set(label, current);
  }

  return Array.from(grouped.values())
    .map(row => ({
      ...row,
      revenue: Math.round(row.revenue * 100) / 100,
      captured: Math.round(row.captured * 100) / 100,
    }))
    .sort((a, b) => b.captured - a.captured);
}
