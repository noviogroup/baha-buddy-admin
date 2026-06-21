import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';
import type { CommunicationDeliveryRow, CommunicationEventRow, CommunicationStatus, CommunicationType, UserRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SAFE_RESEND_TYPES = new Set<CommunicationType>([
  'trip_invite',
  'booking_confirmed',
  'booking_failed',
  'payment_failed',
  'trip_reminder',
  'support_update',
  'admin_alert',
]);

const RESENDABLE_EMAIL_STATUSES = new Set<CommunicationStatus>(['failed', 'skipped']);

function canResendEmail(event: CommunicationEventRow, deliveries: CommunicationDeliveryRow[]) {
  if (!SAFE_RESEND_TYPES.has(event.type)) return false;
  return deliveries.some((delivery) => (
    delivery.channel === 'email' && RESENDABLE_EMAIL_STATUSES.has(delivery.status)
  ));
}

function summarize(events: CommunicationEventRow[], deliveries: CommunicationDeliveryRow[]) {
  return events.reduce((acc: Record<string, number>, event) => {
    acc.total += 1;
    acc[event.status] = (acc[event.status] || 0) + 1;
    return acc;
  }, {
    total: 0,
    sent: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    emailFailures: deliveries.filter((delivery) => (
      delivery.channel === 'email' && RESENDABLE_EMAIL_STATUSES.has(delivery.status)
    )).length,
  });
}

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') || 100)));
    const userId = searchParams.get('user_id') || '';
    const tripId = searchParams.get('trip_id') || '';
    const bookingId = searchParams.get('booking_id') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('communication_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (tripId) query = query.contains('payload', { trip_id: tripId });
    if (bookingId) query = query.contains('payload', { booking_id: bookingId });

    const { data: eventRows, error: eventError } = await query;
    if (eventError?.code === '42P01') {
      return NextResponse.json({
        events: [],
        summary: summarize([], []),
        note: 'Transactional communication tables are not available yet. Run the transactional communications migration.',
      });
    }
    if (eventError) throw eventError;

    const events = (eventRows || []) as CommunicationEventRow[];
    const eventIds = events.map((event) => event.id);
    const userIds = Array.from(new Set(events.map((event) => event.user_id).filter(Boolean)));

    const [deliveriesRes, usersRes] = await Promise.all([
      eventIds.length
        ? supabase.from('communication_deliveries').select('*').in('event_id', eventIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabase.from('users').select('id, display_name, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (deliveriesRes.error) throw deliveriesRes.error;
    if (usersRes.error) throw usersRes.error;

    const deliveries = (deliveriesRes.data || []) as CommunicationDeliveryRow[];
    const users = new Map((usersRes.data || []).map((user) => [(user as Pick<UserRow, 'id'>).id, user]));
    const deliveriesByEvent = deliveries.reduce<Record<string, CommunicationDeliveryRow[]>>((acc, delivery) => {
      acc[delivery.event_id] = acc[delivery.event_id] || [];
      acc[delivery.event_id].push(delivery);
      return acc;
    }, {});

    return NextResponse.json({
      events: events.map((event) => {
        const eventDeliveries = deliveriesByEvent[event.id] || [];
        return {
          ...event,
          deliveries: eventDeliveries,
          user: users.get(event.user_id) || null,
          can_resend_email: canResendEmail(event, eventDeliveries),
        };
      }),
      summary: summarize(events, deliveries),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Communications API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const eventId = typeof body.event_id === 'string' ? body.event_id : '';
    if (!eventId) return NextResponse.json({ error: 'event_id is required' }, { status: 400 });

    const { data: eventRow, error: eventError } = await supabase
      .from('communication_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !eventRow) {
      return NextResponse.json({ error: eventError?.message || 'Communication event not found' }, { status: 404 });
    }

    const event = eventRow as CommunicationEventRow;
    const { data: deliveryRows, error: deliveryError } = await supabase
      .from('communication_deliveries')
      .select('*')
      .eq('event_id', eventId);

    if (deliveryError) throw deliveryError;

    const deliveries = (deliveryRows || []) as CommunicationDeliveryRow[];
    if (!canResendEmail(event, deliveries)) {
      return NextResponse.json({ error: 'Only failed or skipped safe transactional email deliveries can be resent.' }, { status: 409 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (!supabaseUrl || !serviceRoleKey || !internalSecret) {
      return NextResponse.json({ error: 'Communication resend is not configured.' }, { status: 503 });
    }

    const resendPayload = {
      user_id: event.user_id,
      type: event.type,
      title: event.title,
      body: event.body,
      route: event.route,
      payload: event.payload,
      channels: ['email'],
      idempotency_key: `admin_resend:${event.id}:${Date.now()}`,
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/send-communication`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify(resendPayload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `send-communication returned ${response.status}`);
    }

    await logAudit({
      supabase,
      admin,
      request,
      action: 'email_resent',
      entityType: 'communication_event',
      entityId: event.id,
      before: event,
      after: result,
      metadata: {
        original_event_id: event.id,
        resent_event_id: result.event_id || null,
        channels: ['email'],
      },
    });

    return NextResponse.json({ success: true, result }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Communication resend API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });
