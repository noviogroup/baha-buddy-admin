import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/booking-cancel — Phase 2 #20
// ═══════════════════════════════════════════════════════════════════════════
// Cancels a single booking. The flow is:
//
//   1. Validate admin via withAdminAuth (admin role minimum).
//   2. Load the booking row (404 if missing, 409 if already cancelled).
//   3. If cancel_at_supplier is true (default), call the supplier API to
//      cancel the underlying reservation. SUPPLIER CALLS ARE CURRENTLY
//      STUBBED — see cancelAtSupplier() below. Real Duffel / LiteAPI /
//      Viator integration ships in Phase 5 monitoring (#33) when the Edge
//      Function endpoints are health-monitored.
//   4. Update the booking row: status=cancelled, cancelled_at, plus the
//      cancellation_reason and admin_id captured for forensics.
//   5. Write an admin_audit_log entry with full before/after state and
//      supplier response in metadata.
//
// Request body:
//   {
//     booking_id: string,           // required, UUID of the booking
//     reason: string,               // required, min 3 chars
//     cancel_at_supplier?: boolean, // default true; false = DB-only force-cancel
//   }
//
// Response:
//   { success: true, booking: <updated row>, supplier: { ok, reference?, error? } }
//
// Errors:
//   400 — missing booking_id or reason
//   404 — booking not found
//   409 — booking already in a terminal state (cancelled, refunded)
//   502 — supplier API call failed (when cancel_at_supplier=true)
//
// Force-cancel pattern: set cancel_at_supplier=false when the supplier
// already processed the cancellation but Baha Buddy's DB row is stale —
// e.g. customer called the airline directly, Duffel sent a webhook we
// missed. Audit metadata flags `forced: true` for posterity.
// ═══════════════════════════════════════════════════════════════════════════

interface SupplierCancelResult {
  ok: boolean;
  reference?: string;
  error?: string;
  raw?: unknown;
}

/**
 * Dispatch to the right supplier API based on booking_type.
 *
 * STUB: real supplier calls are scheduled for Phase 5 #33 (Edge Function
 * health monitoring) when we have the observability infrastructure to
 * track supplier API latency and failure rates. For now, this returns a
 * mock success so the end-to-end admin flow (UI → API → DB → audit) can
 * be exercised. The audit metadata explicitly records `supplier_stubbed:
 * true` so any cancellation logged today is recognizable as a soft cancel
 * that may need supplier-side reconciliation.
 */
async function cancelAtSupplier(booking: any, reason: string): Promise<SupplierCancelResult> {
  switch (booking.booking_type) {
    case 'flight':
      // TODO Phase 5: Duffel /air/orders/:id/cancel
      // Reference: https://duffel.com/docs/api/v2/order-cancellations
      console.warn(`[booking-cancel] STUB: Duffel cancel for booking ${booking.id} (supplier_ref=${booking.supplier_ref})`);
      return { ok: true, reference: `STUB_DUFFEL_${Date.now()}` };
    case 'accommodation':
      // TODO Phase 5: LiteAPI POST /vouchers/{voucherId}/cancel
      console.warn(`[booking-cancel] STUB: LiteAPI cancel for booking ${booking.id} (supplier_ref=${booking.supplier_ref})`);
      return { ok: true, reference: `STUB_LITEAPI_${Date.now()}` };
    case 'activity':
      // TODO Phase 5: Viator /products/cancellation/{bookingRef}
      console.warn(`[booking-cancel] STUB: Viator cancel for booking ${booking.id} (supplier_ref=${booking.supplier_ref})`);
      return { ok: true, reference: `STUB_VIATOR_${Date.now()}` };
    default:
      return { ok: false, error: `Unknown booking_type: ${booking.booking_type}` };
  }
}

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const { booking_id, reason, cancel_at_supplier = true } = body as {
      booking_id?: string;
      reason?: string;
      cancel_at_supplier?: boolean;
    };

    // ─── 1. Input validation ────────────────────────────────────────────
    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }
    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: 'reason required (minimum 3 characters)' }, { status: 400 });
    }

    // ─── 2. Snapshot the booking ────────────────────────────────────────
    const beforeRes = await supabase.from('bookings').select('*').eq('id', booking_id).single();
    if (beforeRes.error) {
      if (beforeRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      throw beforeRes.error;
    }
    const before = beforeRes.data as any;

    // Reject if already in a terminal state.
    if (['cancelled', 'refunded'].includes(before.status)) {
      return NextResponse.json({
        error: `Booking already ${before.status}; cannot cancel`,
        booking: before,
      }, { status: 409 });
    }

    // ─── 3. Supplier API call (or skip if forcing) ──────────────────────
    let supplierResult: SupplierCancelResult = { ok: true, reference: 'skipped' };
    if (cancel_at_supplier) {
      supplierResult = await cancelAtSupplier(before, reason);
      if (!supplierResult.ok) {
        return NextResponse.json({
          error: `Supplier cancellation failed: ${supplierResult.error}`,
          supplier: supplierResult,
        }, { status: 502 });
      }
    }

    // ─── 4. Update the booking row ──────────────────────────────────────
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      status: 'cancelled',
      cancelled_at: now,
      cancellation_reason: reason.trim(),
      cancelled_by_admin_id: admin.id,
      updated_at: now,
    };

    const updateRes = await supabase
      .from('bookings')
      .update(updates as never)
      .eq('id', booking_id)
      .select('*')
      .single();
    if (updateRes.error) throw updateRes.error;

    // ─── 5. Write audit log entry ───────────────────────────────────────
    await logAudit({
      supabase, admin, request,
      action: 'booking_cancelled',
      entityType: 'booking',
      entityId: booking_id,
      before,
      after: updateRes.data,
      metadata: {
        reason: reason.trim(),
        cancel_at_supplier,
        supplier_reference: supplierResult.reference,
        supplier_stubbed: true, // remove once Phase 5 wires real supplier calls
        forced: !cancel_at_supplier,
        booking_type: before.booking_type,
        amount: before.amount,
        currency: before.currency,
      },
    });

    return NextResponse.json({
      success: true,
      booking: updateRes.data,
      supplier: supplierResult,
    });
  } catch (err: any) {
    console.error('Booking cancel error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
