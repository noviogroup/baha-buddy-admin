import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';
import { sendTransactionalEmail, webUrl } from '@/lib/transactional-email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_STATUSES = ['selected', 'checkout_started', 'paid', 'details_needed', 'in_review', 'needs_info', 'in_progress', 'itinerary_proposed', 'delivered', 'cancelled', 'refunded', 'payment_failed'];
const VALID_PAYMENT_STATUSES = ['paid', 'unpaid', 'failed', 'refunded'];

type ConciergeOrderRow = { id: string; status: string | null; payment_status: string | null; traveler_email?: string | null; traveler_name?: string | null; offer_type?: string | null; delivered_plan_url?: string | null; fulfillment_started_at: string | null; delivered_at: string | null; refunded_at: string | null; [key: string]: unknown };

function num(value: unknown) { const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0)); return Number.isFinite(n) ? n : 0; }
function pretty(value?: string | null) { return (value || 'concierge order').replace(/_/g, ' '); }

async function notifyDelivered(order: ConciergeOrderRow) {
  if (!order.traveler_email) return;
  const orderUrl = webUrl(`/dashboard/concierge/${order.id}`);
  const planLink = order.delivered_plan_url || orderUrl;
  await sendTransactionalEmail({
    to: order.traveler_email,
    subject: 'Your Baha Buddy Concierge plan is ready',
    html: `<p>Hi ${order.traveler_name || 'there'},</p><p>Your <strong>${pretty(order.offer_type)}</strong> plan is ready.</p><p><a href="${planLink}">Open your plan</a></p><p>You can also view your order in your Baha Buddy dashboard.</p>`,
    text: `Your Baha Buddy ${pretty(order.offer_type)} plan is ready: ${planLink}`,
  });
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('payment_status') || 'all';
    const offerType = searchParams.get('offer_type') || 'all';
    const source = searchParams.get('source') || 'all';
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

    let query = supabase.from('concierge_orders').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status !== 'all') query = query.eq('status', status);
    if (paymentStatus !== 'all') query = query.eq('payment_status', paymentStatus);
    if (offerType !== 'all') query = query.eq('offer_type', offerType);
    if (source !== 'all') query = query.eq('source', source);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const summary = rows.reduce((acc: Record<string, number>, row: any) => { const statusKey = row.status || 'unknown'; const paymentKey = row.payment_status || 'unknown'; const offerKey = `offer_${row.offer_type || 'unknown'}`; acc.total += 1; acc.revenue += row.payment_status === 'paid' ? num(row.price_usd) : 0; acc[statusKey] = (acc[statusKey] || 0) + 1; acc[`payment_${paymentKey}`] = (acc[`payment_${paymentKey}`] || 0) + 1; acc[offerKey] = (acc[offerKey] || 0) + 1; return acc; }, { total: 0, revenue: 0, selected: 0, checkout_started: 0, paid: 0, details_needed: 0, in_review: 0, needs_info: 0, in_progress: 0, itinerary_proposed: 0, delivered: 0, cancelled: 0, refunded: 0, payment_failed: 0 });
    const byOffer: Record<string, { count: number; revenue: number }> = {};
    const bySource: Record<string, { count: number; revenue: number }> = {};
    for (const row of rows as any[]) { const offer = row.offer_type || 'unknown'; const src = row.source || 'unknown'; const revenue = row.payment_status === 'paid' ? num(row.price_usd) : 0; byOffer[offer] = byOffer[offer] || { count: 0, revenue: 0 }; bySource[src] = bySource[src] || { count: 0, revenue: 0 }; byOffer[offer].count += 1; byOffer[offer].revenue += revenue; bySource[src].count += 1; bySource[src].revenue += revenue; }
    const toRows = (obj: Record<string, { count: number; revenue: number }>) => Object.entries(obj).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.revenue - a.revenue);
    return NextResponse.json({ orders: rows, summary, byOffer: toRows(byOffer), bySource: toRows(bySource) }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) { console.error('Concierge orders API error:', err); return NextResponse.json({ error: err.message }, { status: 500 }); }
});

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Concierge order id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase.from('concierge_orders').select('*').eq('id', id).single();
    if (fetchError || !existing) return NextResponse.json({ error: fetchError?.message ?? 'Concierge order not found' }, { status: 404 });
    const beforeRow = existing as ConciergeOrderRow;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.status === 'string' && VALID_STATUSES.includes(body.status)) { updates.status = body.status; if (body.status === 'in_progress' && !beforeRow.fulfillment_started_at) updates.fulfillment_started_at = new Date().toISOString(); if (body.status === 'delivered') updates.delivered_at = new Date().toISOString(); if (body.status === 'refunded') updates.refunded_at = new Date().toISOString(); }
    if (typeof body.payment_status === 'string' && VALID_PAYMENT_STATUSES.includes(body.payment_status)) updates.payment_status = body.payment_status;
    for (const field of ['assigned_team_member', 'internal_notes', 'final_itinerary', 'delivered_plan_url', 'travel_dates', 'destination_interests', 'party_size', 'budget_range', 'notes']) { if (typeof body[field] === 'string') updates[field] = body[field].trim() || null; }

    const { data, error } = await supabase.from('concierge_orders').update(updates as never).eq('id', id).select('*').single();
    if (error) throw error;
    const afterRow = data as ConciergeOrderRow;
    await logAudit({ supabase, admin, request, action: 'concierge_order_updated', entityType: 'concierge_order', entityId: id, before: beforeRow, after: afterRow, metadata: { updates } });
    if (beforeRow.status !== 'delivered' && afterRow.status === 'delivered') notifyDelivered(afterRow).catch(console.error);
    return NextResponse.json({ success: true, order: afterRow }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) { console.error('Concierge order update error:', err); return NextResponse.json({ error: err.message }, { status: 500 }); }
}, { requireRole: 'admin' });
