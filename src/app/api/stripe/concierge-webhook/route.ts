import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase';
import { getAdminEmailList, sendTransactionalEmail, webUrl } from '@/lib/transactional-email';

export const dynamic = 'force-dynamic';

const OFFER_PRICES: Record<string, number> = { quick_review: 49, concierge_trip_plan: 149, full_planning_support: 299 };

function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, part) => { const [key, value] = part.split('='); if (!key || !value) return acc; acc[key] = acc[key] || []; acc[key].push(value); return acc; }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some(sig => { const a = Buffer.from(expected, 'hex'); const b = Buffer.from(sig, 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); });
}

function customerName(session: any) { return session.customer_details?.name || session.custom_fields?.find?.((f: any) => f.key === 'name')?.text?.value || null; }
function customerEmail(session: any) { return session.customer_details?.email || session.customer_email || null; }
function priceFor(session: any) { const offerId = session.metadata?.offer_id || 'concierge_trip_plan'; const metadataPrice = Number(session.metadata?.price_usd || 0); const stripeAmount = Number(session.amount_total || 0) / 100; return metadataPrice || OFFER_PRICES[offerId] || stripeAmount || 0; }
function pretty(value: string) { return value.replace(/_/g, ' '); }

async function recordEvent(supabase: any, event: any, processedFor: string) {
  await supabase.from('stripe_webhook_events').insert({ stripe_event_id: event.id, event_type: event.type, processed_for: processedFor, payload: event } as never);
}

async function sendPaymentEmails(orderId: string, offerId: string, amount: number, email: string | null, name: string | null) {
  const receipt = webUrl(`/dashboard/receipts/${orderId}`);
  const order = webUrl(`/dashboard/concierge/${orderId}`);
  const adminEmails = getAdminEmailList();

  if (email) {
    await sendTransactionalEmail({
      to: email,
      subject: 'Your Baha Buddy Concierge payment is confirmed',
      html: `<p>Hi ${name || 'there'},</p><p>Your payment for <strong>${pretty(offerId)}</strong> was received.</p><p>Amount: <strong>$${amount.toFixed(2)}</strong></p><p><a href="${order}">View your order</a> or <a href="${receipt}">view your receipt</a>.</p>`,
      text: `Your Baha Buddy payment for ${pretty(offerId)} was received. Amount: $${amount.toFixed(2)}. Order: ${order}`,
    });
  }

  if (adminEmails.length > 0) {
    await sendTransactionalEmail({
      to: adminEmails,
      subject: `New paid Concierge order — ${pretty(offerId)}`,
      html: `<p>A new paid Concierge order was received.</p><p><strong>Offer:</strong> ${pretty(offerId)}<br/><strong>Amount:</strong> $${amount.toFixed(2)}<br/><strong>Customer:</strong> ${name || 'Unnamed'} ${email ? `(${email})` : ''}</p><p>Order ID: ${orderId}</p>`,
      text: `New paid Concierge order. Offer: ${pretty(offerId)}. Amount: $${amount.toFixed(2)}. Customer: ${name || 'Unnamed'} ${email || ''}. Order ID: ${orderId}`,
    });
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_CONCIERGE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: 'Missing STRIPE_CONCIERGE_WEBHOOK_SECRET' }, { status: 500 });
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), webhookSecret)) return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }); }
  const supabase = createAdminClient();
  const existingEvent = await supabase.from('stripe_webhook_events').select('id').eq('stripe_event_id', event.id).maybeSingle();
  if (existingEvent.data) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const metadata = session.metadata || {};
      const product = metadata.product || 'concierge_trip_plan';
      const offerId = metadata.offer_id || 'concierge_trip_plan';
      const source = metadata.source || 'unknown';
      const orderId = typeof metadata.order_id === 'string' && metadata.order_id ? metadata.order_id : null;
      const userId = typeof metadata.user_id === 'string' && metadata.user_id ? metadata.user_id : null;
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
      const checkoutSessionId = session.id;
      const amount = priceFor(session);
      const email = customerEmail(session);
      const name = customerName(session);

      if (orderId) {
        const { data: updated, error } = await supabase.from('concierge_orders').update({ user_id: userId, offer_type: offerId, price_usd: amount, status: 'paid', payment_status: 'paid', stripe_checkout_session_id: checkoutSessionId, stripe_payment_intent_id: paymentIntent, source, traveler_email: email, traveler_name: name, notes: `Stripe Checkout completed for ${product}.`, stripe_metadata: metadata, updated_at: new Date().toISOString() } as never).eq('id', orderId).select('id').maybeSingle();
        if (error) throw error;
        if (updated?.id) { await recordEvent(supabase, event, 'concierge_orders'); sendPaymentEmails(updated.id, offerId, amount, email, name).catch(console.error); return NextResponse.json({ received: true, order_created: false, order_updated: true, order_id: updated.id }); }
      }

      const existingOrder = await supabase.from('concierge_orders').select('id').eq('stripe_checkout_session_id', checkoutSessionId).maybeSingle();
      if (!existingOrder.data) {
        const { data: created, error } = await supabase.from('concierge_orders').insert({ user_id: userId, offer_type: offerId, price_usd: amount, status: 'paid', payment_status: 'paid', stripe_checkout_session_id: checkoutSessionId, stripe_payment_intent_id: paymentIntent, source, traveler_email: email, traveler_name: name, notes: `Stripe Checkout completed for ${product}.`, stripe_metadata: metadata } as never).select('id').single();
        if (error) throw error;
        await recordEvent(supabase, event, 'concierge_orders');
        if (created?.id) sendPaymentEmails(created.id, offerId, amount, email, name).catch(console.error);
        return NextResponse.json({ received: true, order_created: true, order_id: created?.id });
      }

      await recordEvent(supabase, event, 'concierge_orders');
      return NextResponse.json({ received: true, order_created: false, order_id: existingOrder.data.id });
    }

    if (event.type === 'payment_intent.payment_failed') { const paymentIntent = event.data?.object?.id; if (paymentIntent) await supabase.from('concierge_orders').update({ payment_status: 'failed', status: 'payment_failed', updated_at: new Date().toISOString() } as never).eq('stripe_payment_intent_id', paymentIntent); await recordEvent(supabase, event, 'concierge_orders'); return NextResponse.json({ received: true }); }
    if (event.type === 'charge.refunded') { const paymentIntent = event.data?.object?.payment_intent; if (paymentIntent) await supabase.from('concierge_orders').update({ payment_status: 'refunded', status: 'refunded', refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never).eq('stripe_payment_intent_id', paymentIntent); await recordEvent(supabase, event, 'concierge_orders'); return NextResponse.json({ received: true }); }

    await recordEvent(supabase, event, 'ignored');
    return NextResponse.json({ received: true, ignored: true });
  } catch (err: any) { console.error('Concierge Stripe webhook error:', err); return NextResponse.json({ error: err.message }, { status: 500 }); }
}
