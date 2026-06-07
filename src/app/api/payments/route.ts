import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('payment_status') || 'all';
    const offerType = searchParams.get('offer_type') || 'all';
    const source = searchParams.get('source') || 'all';
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

    let query = supabase
      .from('concierge_orders')
      .select('id,user_id,offer_type,price_usd,status,payment_status,stripe_checkout_session_id,stripe_payment_intent_id,source,traveler_name,traveler_email,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (paymentStatus !== 'all') query = query.eq('payment_status', paymentStatus);
    if (offerType !== 'all') query = query.eq('offer_type', offerType);
    if (source !== 'all') query = query.eq('source', source);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const summary = rows.reduce((acc: Record<string, number>, row: any) => {
      const amount = num(row.price_usd);
      const paymentKey = row.payment_status || 'unknown';
      const statusKey = row.status || 'unknown';
      acc.total += 1;
      acc[paymentKey] = (acc[paymentKey] || 0) + 1;
      acc[`status_${statusKey}`] = (acc[`status_${statusKey}`] || 0) + 1;
      if (paymentKey === 'paid') acc.paidRevenue += amount;
      if (paymentKey === 'refunded') acc.refundedRevenue += amount;
      return acc;
    }, { total: 0, paidRevenue: 0, refundedRevenue: 0, paid: 0, unpaid: 0, failed: 0, refunded: 0 });

    const byOffer: Record<string, { count: number; revenue: number }> = {};
    const bySource: Record<string, { count: number; revenue: number }> = {};

    for (const row of rows as any[]) {
      const offer = row.offer_type || 'unknown';
      const src = row.source || 'unknown';
      const revenue = row.payment_status === 'paid' ? num(row.price_usd) : 0;
      byOffer[offer] = byOffer[offer] || { count: 0, revenue: 0 };
      bySource[src] = bySource[src] || { count: 0, revenue: 0 };
      byOffer[offer].count += 1; byOffer[offer].revenue += revenue;
      bySource[src].count += 1; bySource[src].revenue += revenue;
    }

    const toRows = (obj: Record<string, { count: number; revenue: number }>) => Object.entries(obj).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ payments: rows, summary, byOffer: toRows(byOffer), bySource: toRows(bySource) }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Payments API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
