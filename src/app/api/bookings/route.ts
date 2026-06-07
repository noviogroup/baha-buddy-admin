import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all').trim();
    const type = (searchParams.get('type') || 'all').trim();
    const provider = (searchParams.get('provider') || 'all').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

    let query = supabase
      .from('bookings')
      .select('id,user_id,trip_id,booking_type,reference_id,provider,amount,currency,status,created_at,updated_at,stripe_payment_intent_id,paid_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') query = query.eq('status', status);
    if (type !== 'all') query = query.eq('booking_type', type);
    if (provider !== 'all') query = query.eq('provider', provider);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const summary = rows.reduce((acc: Record<string, number>, row: any) => {
      const amount = money(row.amount);
      const rowStatus = row.status || 'unknown';
      acc.total += 1;
      acc.grossBookingValue += amount;
      acc[rowStatus] = (acc[rowStatus] || 0) + 1;
      if (rowStatus === 'confirmed' || row.paid_at) acc.confirmedRevenue += amount;
      return acc;
    }, { total: 0, grossBookingValue: 0, confirmedRevenue: 0, confirmed: 0, pending: 0, failed: 0, cancelled: 0, refunded: 0 });

    const byType: Record<string, { count: number; gross: number }> = {};
    const byProvider: Record<string, { count: number; gross: number }> = {};
    const byStatus: Record<string, { count: number; gross: number }> = {};

    for (const row of rows as any[]) {
      const amount = money(row.amount);
      const rowType = row.booking_type || 'unknown';
      const rowProvider = row.provider || 'unknown';
      const rowStatus = row.status || 'unknown';
      byType[rowType] = byType[rowType] || { count: 0, gross: 0 };
      byProvider[rowProvider] = byProvider[rowProvider] || { count: 0, gross: 0 };
      byStatus[rowStatus] = byStatus[rowStatus] || { count: 0, gross: 0 };
      byType[rowType].count += 1; byType[rowType].gross += amount;
      byProvider[rowProvider].count += 1; byProvider[rowProvider].gross += amount;
      byStatus[rowStatus].count += 1; byStatus[rowStatus].gross += amount;
    }

    const toRows = (obj: Record<string, { count: number; gross: number }>) => Object.entries(obj).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.gross - a.gross);

    return NextResponse.json({ bookings: rows, summary, byType: toRows(byType), byProvider: toRows(byProvider), byStatus: toRows(byStatus) }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
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

    const before = await supabase.from('bookings').select('*').eq('id', id).single();
    if (before.error) return NextResponse.json({ error: before.error.message }, { status: 404 });

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'confirmed' && !before.data.paid_at) updates.paid_at = new Date().toISOString();

    const { data, error } = await supabase.from('bookings').update(updates as never).eq('id', id).select('*').single();
    if (error) throw error;

    await logAudit({ supabase, admin, request, action: 'booking_status_updated', entityType: 'booking', entityId: id, before: before.data, after: data, metadata: { updates } });

    return NextResponse.json({ success: true, booking: data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Booking update API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });
