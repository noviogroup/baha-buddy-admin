import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';
import { enrichBookingRows } from '@/lib/booking-reconciliation';
import { bookingRecoveryGuidance, needsBookingSupport } from '@/lib/booking-recovery';

export const dynamic = 'force-dynamic';

type SupportBookingRow = {
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
  updated_at?: string | null;
  stripe_payment_intent_id?: string | null;
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string | null;
  provider_status?: string | null;
  source_surface?: string | null;
  provider_reference?: string | null;
  failure_state?: string | null;
  trip_item_id?: string | null;
  trip_item_type?: string | null;
  trip_item_name?: string | null;
  reconciled?: boolean;
};

// ─── GET /api/support ────────────────────────────────────────────────────
// List support tickets. Read-only; requires admin role.
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('support_tickets')
      .select('*, users!inner(display_name, email), support_messages(id, content, sender_type, created_at)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    const bookingSupport = await loadBookingSupportQueue(supabase);

    if (error?.code === '42P01') {
      return NextResponse.json({
        tickets: [],
        ...bookingSupport,
        note: 'support_tickets table not yet created. Run the admin migration.',
      });
    }
    if (error) throw error;

    const tickets = data || [];
    const ticketSummary = summarizeTickets(tickets);

    return NextResponse.json({
      tickets,
      ...bookingSupport,
      summary: {
        ...ticketSummary,
        ...bookingSupport.summary,
      },
    });
  } catch (err: any) {
    console.error('Support API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

// ─── POST /api/support ───────────────────────────────────────────────────
// Send an admin reply to a support ticket, optionally transitioning the
// ticket status. Both the reply insert and the status change are audited.
//   { ticket_id: string; content: string; action?: 'resolve' | 'in_progress' }
export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const { ticket_id, content, action } = body as {
      ticket_id?: string;
      content?: string;
      action?: 'resolve' | 'in_progress';
    };

    if (!ticket_id || !content) {
      return NextResponse.json({ error: 'ticket_id and content required' }, { status: 400 });
    }

    // Insert reply
    const msgInsert = await supabase.from('support_messages').insert({
      ticket_id,
      content,
      sender_type: 'admin',
      sender_id: admin.id,
    } as never).select('*').single();
    if (msgInsert.error) throw msgInsert.error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'ticket_admin_reply',
      entityType: 'support_ticket',
      entityId: ticket_id,
      after: msgInsert.data,
      metadata: { message_id: (msgInsert.data as { id?: string })?.id },
    });

    // Optional status change
    if (action === 'resolve' || action === 'in_progress') {
      const newStatus = action === 'resolve' ? 'resolved' : 'in_progress';

      const beforeRes = await supabase.from('support_tickets').select('*').eq('id', ticket_id).single();
      if (beforeRes.error) throw beforeRes.error;

      const updateRes = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
        .eq('id', ticket_id)
        .select('*')
        .single();
      if (updateRes.error) throw updateRes.error;

      await logAudit({
        supabase,
        admin,
        request,
        action: 'ticket_status_changed',
        entityType: 'support_ticket',
        entityId: ticket_id,
        before: beforeRes.data,
        after: updateRes.data,
        metadata: { from: (beforeRes.data as { status?: string })?.status, to: newStatus },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Support reply error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

async function loadBookingSupportQueue(supabase: any) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, user_id, trip_id, booking_type, provider, amount, currency, status, paid_at, created_at, updated_at, stripe_payment_intent_id, booking_reference, external_reference, financial_metadata')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error?.code === '42P01') {
    return {
      bookingIssues: [],
      summary: emptyBookingSummary(),
      bookingIssueNote: 'bookings table not found; canonical booking recovery queue is unavailable.',
    };
  }
  if (error) throw error;

  const enriched = await enrichBookingRows(supabase, (data || []) as SupportBookingRow[]);
  const issueRows = enriched
    .filter((row: SupportBookingRow) => needsBookingSupport(row.failure_state))
    .slice(0, 25)
    .map(toBookingIssue);

  return {
    bookingIssues: issueRows,
    summary: summarizeBookings(enriched),
  };
}

function toBookingIssue(row: SupportBookingRow) {
  const recovery = bookingRecoveryGuidance(row.failure_state);

  return {
    id: row.id,
    user_id: row.user_id || null,
    trip_id: row.trip_id || null,
    booking_type: row.booking_type || null,
    provider: row.provider || null,
    amount: row.amount ?? 0,
    currency: row.currency || 'USD',
    status: row.status || null,
    payment_status: row.payment_status || null,
    provider_status: row.provider_status || null,
    source_surface: row.source_surface || 'unknown',
    provider_reference: row.provider_reference || null,
    stripe_payment_intent_id: row.stripe_payment_intent_id || null,
    trip_item_id: row.trip_item_id || null,
    trip_item_type: row.trip_item_type || null,
    trip_item_name: row.trip_item_name || null,
    failure_state: row.failure_state || 'none',
    reconciled: row.reconciled === true,
    paid_at: row.paid_at || null,
    created_at: row.created_at || null,
    recovery: {
      label: recovery.label,
      priority: recovery.priority,
      tone: recovery.tone,
      summary: recovery.summary,
      nextAction: recovery.nextAction,
      checklist: recovery.checklist,
    },
  };
}

function summarizeTickets(tickets: any[]) {
  return {
    tickets: tickets.length,
    openTickets: tickets.filter(ticket => ticket.status === 'open').length,
    inProgressTickets: tickets.filter(ticket => ticket.status === 'in_progress').length,
    resolvedTickets: tickets.filter(ticket => ticket.status === 'resolved').length,
  };
}

function summarizeBookings(bookings: SupportBookingRow[]) {
  const issues = bookings.filter(row => row.failure_state && row.failure_state !== 'none');
  const supportIssues = bookings.filter(row => needsBookingSupport(row.failure_state));
  const p0 = supportIssues.filter(row => bookingRecoveryGuidance(row.failure_state).priority === 'P0');

  return {
    canonicalBookingsReviewed: bookings.length,
    bookingIssues: supportIssues.length,
    allBookingFailureStates: issues.length,
    p0BookingIssues: p0.length,
    paymentCapturedProviderFailed: bookings.filter(row => row.failure_state === 'payment_succeeded_provider_failed').length,
    providerSucceededLocalFailed: bookings.filter(row => row.failure_state === 'provider_succeeded_local_failed').length,
    abandonedCheckout: bookings.filter(row => row.failure_state === 'abandoned_checkout').length,
    providerPending: bookings.filter(row => row.failure_state === 'provider_pending').length,
    cancelled: bookings.filter(row => row.failure_state === 'cancelled').length,
    refunded: bookings.filter(row => row.failure_state === 'refunded').length,
  };
}

function emptyBookingSummary() {
  return {
    canonicalBookingsReviewed: 0,
    bookingIssues: 0,
    allBookingFailureStates: 0,
    p0BookingIssues: 0,
    paymentCapturedProviderFailed: 0,
    providerSucceededLocalFailed: 0,
    abandonedCheckout: 0,
    providerPending: 0,
    cancelled: 0,
    refunded: 0,
  };
}
