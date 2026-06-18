import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';
import type { BookingRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

type CanonicalBookingExtra = {
  id: string;
  booking_reference?: string | null;
  external_reference?: string | null;
  stripe_payment_intent_id?: string | null;
  financial_metadata?: Record<string, unknown> | null;
};

type CanonicalTripItem = {
  id: string;
  booking_reference?: string | null;
  stripe_payment_intent_id?: string | null;
  status?: string | null;
  name?: string | null;
  place_id?: string | null;
  liteapi_hotel_id?: string | null;
};

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all').trim();
    const type = (searchParams.get('type') || 'all').trim();
    const provider = (searchParams.get('provider') || 'all').trim();
    const payoutStatus = (searchParams.get('payout_status') || 'all').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

    let query = supabase
      .from('v_booking_financials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') query = query.eq('status', status);
    if (type !== 'all') query = query.eq('booking_type', type);
    if (provider !== 'all') query = query.eq('provider', provider);
    if (payoutStatus !== 'all') query = query.eq('payout_status', payoutStatus);

    const { data, error } = await query;
    if (error) throw error;

    const rows = await enrichBookingRows(supabase, data || []);
    const summary = rows.reduce((acc: Record<string, number>, row: any) => {
      const gross = num(row.gross_booking_value);
      const net = num(row.net_revenue);
      const payout = num(row.partner_payout_amount);
      const margin = num(row.gross_margin_after_payout);
      const rowStatus = row.status || 'unknown';
      acc.total += 1;
      acc.grossBookingValue += gross;
      acc.netRevenue += net;
      acc.confirmedRevenue += rowStatus === 'confirmed' || row.paid_at ? net : 0;
      acc.partnerPayouts += payout;
      acc.marginAfterPayout += margin;
      acc[rowStatus] = (acc[rowStatus] || 0) + 1;
      if (row.payout_status === 'pending') acc.pendingPayouts += payout;
      if (row.payout_status === 'paid') acc.paidPayouts += payout;
      return acc;
    }, {
      total: 0,
      grossBookingValue: 0,
      netRevenue: 0,
      confirmedRevenue: 0,
      partnerPayouts: 0,
      marginAfterPayout: 0,
      pendingPayouts: 0,
      paidPayouts: 0,
      confirmed: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
    });

    return NextResponse.json({ bookings: rows, summary }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Bookings API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const status = typeof body.status === 'string' ? body.status : '';
    if (!id) return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });
    if (!['pending', 'confirmed', 'failed', 'cancelled', 'refunded'].includes(status)) return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: fetchError?.message ?? 'Booking not found' }, { status: 404 });
    }

    const beforeRow = existing as BookingRow;

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'confirmed' && !beforeRow.paid_at) updates.paid_at = new Date().toISOString();

    const { data, error } = await supabase.from('bookings').update(updates as never).eq('id', id).select('*').single();
    if (error) throw error;

    const afterRow = data as BookingRow;

    await logAudit({ supabase, admin, request, action: 'booking_status_updated', entityType: 'booking', entityId: id, before: beforeRow, after: afterRow, metadata: { updates } });

    return NextResponse.json({ success: true, booking: afterRow }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Booking update API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });

async function enrichBookingRows(supabase: any, rows: any[]) {
  if (!rows.length) return rows;
  const ids = rows.map(row => row.id).filter(Boolean);
  const { data } = await supabase
    .from('bookings')
    .select('id, booking_reference, external_reference, stripe_payment_intent_id, financial_metadata')
    .in('id', ids);
  const extras = new Map<string, CanonicalBookingExtra>(
    ((data || []) as CanonicalBookingExtra[]).map(row => [row.id, row] as [string, CanonicalBookingExtra]),
  );
  const tripItemsByIntent = await loadTripItemsByPaymentIntent(supabase, rows, extras);

  return rows.map(row => {
    const extra = extras.get(row.id) as CanonicalBookingExtra | undefined;
    const metadata = extra?.financial_metadata || {};
    const paymentIntentId = firstString(row.stripe_payment_intent_id, extra?.stripe_payment_intent_id);
    const tripItem = paymentIntentId ? tripItemsByIntent.get(paymentIntentId) : undefined;
    const tripItemStatus = normalizedStatus(tripItem?.status);
    const providerReference = tripItem?.booking_reference || row.external_reference || extra?.external_reference || extra?.booking_reference || row.reference_id || null;
    const paymentStatus = paymentStatusFor(row);
    const providerStatus = providerStatusFor(providerReference, metadata, row.status, tripItemStatus);

    return {
      ...row,
      provider_reference: providerReference,
      source_surface: sourceSurfaceFor(metadata),
      payment_status: paymentStatus,
      provider_status: providerStatus,
      trip_item_id: tripItem?.id ?? null,
      trip_item_status: tripItemStatus || null,
      trip_item_name: tripItem?.name ?? null,
      failure_state: failureStateFor(paymentStatus, providerStatus, row.status, providerReference, tripItemStatus),
    };
  });
}

async function loadTripItemsByPaymentIntent(
  supabase: any,
  rows: any[],
  extras: Map<string, CanonicalBookingExtra>,
) {
  const paymentIntentIds = Array.from(new Set(rows
    .map(row => firstString(row.stripe_payment_intent_id, extras.get(row.id)?.stripe_payment_intent_id))
    .filter(Boolean) as string[]));
  const result = new Map<string, CanonicalTripItem>();
  if (!paymentIntentIds.length) return result;

  const { data: accommodations } = await supabase
    .from('trip_accommodations')
    .select('id, name, place_id, liteapi_hotel_id, status, booking_reference, stripe_payment_intent_id')
    .in('stripe_payment_intent_id', paymentIntentIds);

  for (const item of (accommodations || []) as CanonicalTripItem[]) {
    const intent = firstString(item.stripe_payment_intent_id);
    if (intent) result.set(intent, item);
  }

  const { data: flights } = await supabase
    .from('trip_flights')
    .select('id, booking_reference, stripe_payment_intent_id')
    .in('stripe_payment_intent_id', paymentIntentIds);

  for (const item of (flights || []) as CanonicalTripItem[]) {
    const intent = firstString(item.stripe_payment_intent_id);
    if (intent && !result.has(intent)) result.set(intent, item);
  }

  return result;
}

function sourceSurfaceFor(metadata: Record<string, unknown>) {
  const source = metadata.source_surface ?? metadata.source ?? metadata.surface;
  return typeof source === 'string' && source.trim() ? source.trim() : 'unknown';
}

function paymentStatusFor(row: any) {
  const status = String(row.status || '').toLowerCase();
  if (row.paid_at || status === 'confirmed') return 'paid';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded') return 'refunded';
  return 'pending';
}

function providerStatusFor(providerReference: unknown, metadata: Record<string, unknown>, bookingStatus: unknown, tripItemStatus?: string) {
  const metadataStatus = String(metadata.provider_status || '').toLowerCase();
  const rowStatus = String(bookingStatus || '').toLowerCase();
  const status = tripItemStatus || metadataStatus || rowStatus;
  if (['failed', 'error'].includes(status)) return 'failed';
  if (['cancelled', 'canceled', 'refunded'].includes(status)) return status === 'refunded' ? 'cancelled' : status;
  if (['booked', 'confirmed', 'succeeded', 'paid'].includes(status)) return providerReference ? 'confirmed' : 'pending';
  if (providerReference && !['pending', 'started'].includes(status)) return 'confirmed';
  return providerReference ? 'confirmed' : 'pending';
}

function failureStateFor(paymentStatus: string, providerStatus: string, bookingStatus: unknown, providerReference: unknown, tripItemStatus?: string) {
  const status = String(bookingStatus || '').toLowerCase();
  if (tripItemStatus === 'refunded') return 'refunded';
  if (tripItemStatus === 'cancelled' || tripItemStatus === 'canceled') return 'cancelled';
  if (paymentStatus === 'paid' && providerStatus === 'failed') return 'payment_succeeded_provider_failed';
  if (paymentStatus === 'paid' && providerStatus === 'cancelled') return 'cancelled';
  if (providerStatus === 'confirmed' && status === 'failed') return 'provider_succeeded_local_failed';
  if (paymentStatus === 'pending' && !providerReference) return 'abandoned_checkout';
  if (providerStatus === 'pending') return 'provider_pending';
  if (status === 'cancelled' || status === 'refunded') return status;
  return 'none';
}

function normalizedStatus(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : '';
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
