import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/booking-detail?id={booking_id} — Phase 2 #18 + #19
// ═══════════════════════════════════════════════════════════════════════════
// Returns full detail for a single booking, including:
//   - The booking row itself (all columns)
//   - The linked trip (name, status, dates, islands)
//   - The trip owner (display_name, email, country)
//   - Audit log entries scoped to this booking (most recent first)
//   - Any cached supplier metadata if present in booking.metadata JSONB
//
// One endpoint, one page (/bookings/[id]). The page dispatches the type-
// specific Overview tab off booking.booking_type. This avoids three nearly-
// identical detail pages for flight/accommodation/activity.
//
// SUPPLIER ENRICHMENT (Phase 5 follow-up):
//   Real flight segments, passenger lists, hotel room types, etc. live at
//   Duffel/LiteAPI/Viator — not in our DB. Today the page shows whatever's
//   cached in booking.metadata; once Phase 5 wires real supplier APIs, the
//   /api/booking-detail endpoint can fan out to fetch live data with a
//   `?refresh=1` flag (which would also bump an audit log entry).
// ═══════════════════════════════════════════════════════════════════════════

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const url = new URL(request.url);
    const bookingId = url.searchParams.get('id');

    if (!bookingId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // ─── 1. Load the booking row ────────────────────────────────────────
    const bookingRes = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (bookingRes.error) {
      if (bookingRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      throw bookingRes.error;
    }
    const booking = bookingRes.data as any;

    // ─── 2. Load the linked trip + owner in parallel ────────────────────
    const [tripRes, auditRes] = await Promise.all([
      booking.trip_id
        ? supabase
            .from('trips')
            .select('id, name, status, date_start, date_end, islands, party_config, user_id, users(id, display_name, email, country, city)')
            .eq('id', booking.trip_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('admin_audit_log')
        .select('id, action, admin_email, before, after, metadata, ip_address, created_at')
        .eq('entity_type', 'booking')
        .eq('entity_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Trip may legitimately not be linked (e.g. orphaned booking after trip
    // delete). Don't fail the request — just return null trip.
    const trip = tripRes.error ? null : tripRes.data;
    const owner = (trip as any)?.users || null;

    // Audit log table might not exist yet in some deploys (migration #3
    // hasn't been run). Treat that as empty audit history.
    const auditLog = auditRes.error ? [] : (auditRes.data || []);

    return NextResponse.json({
      booking,
      trip,
      owner,
      auditLog,
    });
  } catch (err: any) {
    console.error('Booking detail error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
