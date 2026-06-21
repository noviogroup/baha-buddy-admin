import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRowsWithLoadedTripItems, isRecognizedRevenue, normalizedStatus, num } from '@/lib/booking-reconciliation';

export const dynamic = 'force-dynamic';

// ─── GET /api/trip-detail?id=xxx ─────────────────────────────────────────
// Returns the full trip object plus every related entity in parallel:
//   - users (owner)            via the trips.user_id join
//   - bookings                  for the budget + bookings tab
//   - chat_threads + messages   for the chat tab
//   - trip_collaborators        for the collaborators tab
//   - trip_accommodations       for the itinerary tab (per-day hotel rows)
//   - trip_flights              for the itinerary tab (in/out segments)
//   - trip_activities           for the itinerary tab (day_number-ordered)
//
// Each related-entity query handles 42P01 (table missing) gracefully and
// defaults to []. This means the page renders cleanly even before all
// migrations have run.
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('id');
    if (!tripId) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }

    const safeQuery = async (fn: () => PromiseLike<any>) => {
      try {
        const res = await fn();
        if (res.error?.code === '42P01') return { data: [], missing: true };
        if (res.error) return { data: [], error: res.error.message };
        return { data: res.data ?? [] };
      } catch (err: any) {
        return { data: [], error: err.message };
      }
    };

    const [tripRes, bookingsRes, threadsRes, collabRes, accomRes, flightsRes, activitiesRes] = await Promise.all([
      supabase.from('trips').select('*, users!inner(display_name, email, country, city)').eq('id', tripId).single(),
      safeQuery(() => supabase.from('bookings').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })),
      safeQuery(() => supabase.from('chat_threads').select('id, last_message_preview, created_at, updated_at, users!inner(display_name)').eq('trip_id', tripId).order('updated_at', { ascending: false })),
      safeQuery(() => supabase.from('trip_collaborators').select('*, users!inner(display_name, email)').eq('trip_id', tripId)),
      safeQuery(() => supabase.from('trip_accommodations').select('*').eq('trip_id', tripId).order('check_in', { ascending: true })),
      safeQuery(() => supabase.from('trip_flights').select('*').eq('trip_id', tripId).order('departure', { ascending: true })),
      safeQuery(() => supabase.from('trip_activities').select('*').eq('trip_id', tripId).order('day_number', { ascending: true })),
    ]);

    if (tripRes.error) {
      if (tripRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
      }
      throw tripRes.error;
    }

    const accommodations = (accomRes.data || []) as any[];
    const flights = (flightsRes.data || []) as any[];
    const activities = (activitiesRes.data || []) as any[];
    const tripItems = [
      ...accommodations.map(item => ({ ...item, kind: 'accommodation' as const })),
      ...flights.map(item => ({ ...item, kind: 'flight' as const })),
      ...activities.map(item => ({ ...item, kind: 'activity' as const })),
    ];
    const bookings = enrichBookingRowsWithLoadedTripItems(
      (bookingsRes.data || []) as any[],
      tripItems,
    );
    const budgetByCategory: Record<string, number> = {
      accommodation: 0, flight: 0, activity: 0, other: 0,
    };
    bookings.filter(isRecognizedRevenue).forEach((booking: any) => {
      const cat = bookingCategory(booking.booking_type);
      budgetByCategory[cat] += num(booking.amount);
    });
    const totalSpent = Object.values(budgetByCategory).reduce((a, b) => a + b, 0);
    const budgetEstimate = num((tripRes.data as any)?.budget_estimate);

    return NextResponse.json({
      trip: tripRes.data,
      bookings,
      threads: threadsRes.data || [],
      collaborators: collabRes.data || [],
      accommodations,
      flights,
      activities,
      budget: {
        byCategory: budgetByCategory,
        totalSpent: Math.round(totalSpent * 100) / 100,
        estimate: budgetEstimate,
        delta: Math.round((totalSpent - budgetEstimate) * 100) / 100,
      },
      tablesStatus: {
        bookings: !bookingsRes.missing,
        threads: !threadsRes.missing,
        collaborators: !collabRes.missing,
        accommodations: !accomRes.missing,
        flights: !flightsRes.missing,
        activities: !activitiesRes.missing,
      },
    });
  } catch (err: any) {
    console.error('Trip detail API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

function bookingCategory(value: unknown): 'accommodation' | 'flight' | 'activity' | 'other' {
  const bookingType = normalizedStatus(value);
  if (['accommodation', 'hotel', 'stay', 'stays', 'resort', 'villa', 'home', 'house'].includes(bookingType)) return 'accommodation';
  if (bookingType.includes('flight')) return 'flight';
  if (['activity', 'activities', 'tour', 'tours', 'experience'].includes(bookingType)) return 'activity';
  return 'other';
}
