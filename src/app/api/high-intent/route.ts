import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows } from '@/lib/booking-reconciliation';

export const dynamic = 'force-dynamic';

type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  party_type: string | null;
  party_size: number | null;
  engagement_score: number | null;
  onboarding_completed: boolean | null;
  home_airport: string | null;
  created_at: string;
  updated_at: string;
};

type TripRow = {
  id: string;
  user_id: string;
  name: string | null;
  status: string | null;
  islands: string[] | null;
  party_type: string | null;
  party_size: number | null;
  budget_estimate: number | string | null;
  created_at: string;
  updated_at: string;
};

type ThreadRow = {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
};

type BookingRow = {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  booking_type: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string;
  paid_at?: string | null;
  stripe_payment_intent_id?: string | null;
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string;
  provider_status?: string;
  failure_state?: string;
  reconciled?: boolean;
};

type Lead = {
  user: UserRow;
  score: number;
  priority: 'hot' | 'warm' | 'watch';
  signals: string[];
  suggestedAction: string;
  stats: {
    trips: number;
    activeTrips: number;
    chatThreads: number;
    bookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    estimatedBudget: number;
    latestActivityAt: string;
  };
  latestTrip: TripRow | null;
};

function asMoney(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function latestDate(...dates: (string | null | undefined)[]) {
  return dates.filter(Boolean).sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] || null;
}

function priority(score: number): Lead['priority'] {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'watch';
}

function actionFor(signals: string[]) {
  if (signals.some(s => s.includes('pending booking'))) return 'Follow up on booking completion.';
  if (signals.some(s => s.includes('budget'))) return 'Offer concierge planning or booking assistance.';
  if (signals.some(s => s.includes('family') || s.includes('group'))) return 'Offer group/family itinerary support.';
  if (signals.some(s => s.includes('chat activity'))) return 'Review chat context and send a personalized follow-up.';
  return 'Monitor activity and wait for another intent signal.';
}

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString();

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id,display_name,email,country,city,party_type,party_size,engagement_score,onboarding_completed,home_airport,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(250);
    if (usersError) throw usersError;

    const userIds = (usersData || []).map((u: any) => u.id);

    const { data: tripsData } = await supabase
      .from('trips')
      .select('id,user_id,name,status,islands,party_type,party_size,budget_estimate,created_at,updated_at')
      .in('user_id', userIds)
      .gte('updated_at', since);

    const { data: threadsData } = await supabase
      .from('chat_threads')
      .select('id,user_id,trip_id,last_message_preview,created_at,updated_at')
      .in('user_id', userIds)
      .gte('updated_at', since);

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id,user_id,trip_id,booking_type,amount,status,created_at,paid_at,stripe_payment_intent_id,booking_reference,external_reference,financial_metadata')
      .in('user_id', userIds)
      .gte('created_at', since);

    const trips = (tripsData || []) as TripRow[];
    const threads = (threadsData || []) as ThreadRow[];
    const bookings = await enrichBookingRows(supabase, (bookingsData || []) as BookingRow[]);

    const leads: Lead[] = ((usersData || []) as UserRow[]).map(user => {
      const userTrips = trips.filter(t => t.user_id === user.id);
      const userThreads = threads.filter(t => t.user_id === user.id);
      const userBookings = bookings.filter(b => b.user_id === user.id);
      const confirmedBookings = userBookings.filter(b => b.reconciled === true);
      const pendingBookings = userBookings.filter(b => b.status === 'pending');
      const activeTrips = userTrips.filter(t => ['planned', 'booked', 'active', 'draft'].includes(t.status || ''));
      const latestTrip = userTrips.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] || null;
      const estimatedBudget = userTrips.reduce((sum, t) => sum + asMoney(t.budget_estimate), 0);
      const signals: string[] = [];
      let score = 0;

      if (user.onboarding_completed) { score += 8; signals.push('completed onboarding'); }
      if ((user.engagement_score || 0) > 0) { score += Math.min(15, user.engagement_score || 0); signals.push(`engagement score ${user.engagement_score}`); }
      if (user.home_airport) { score += 5; signals.push('home airport provided'); }
      if (userTrips.length > 0) { score += 15; signals.push(`${userTrips.length} saved trip${userTrips.length === 1 ? '' : 's'}`); }
      if (activeTrips.length > 0) { score += 10; signals.push(`${activeTrips.length} active/planned trip${activeTrips.length === 1 ? '' : 's'}`); }
      if (estimatedBudget > 0) { score += 15; signals.push(`budget estimate $${Math.round(estimatedBudget).toLocaleString()}`); }
      if (userThreads.length > 0) { score += Math.min(15, userThreads.length * 5); signals.push('recent chat activity'); }
      if (pendingBookings.length > 0) { score += 25; signals.push(`${pendingBookings.length} pending booking${pendingBookings.length === 1 ? '' : 's'}`); }
      if (confirmedBookings.length > 0) { score += 20; signals.push(`${confirmedBookings.length} confirmed booking${confirmedBookings.length === 1 ? '' : 's'}`); }
      if ((user.party_size || 0) >= 4 || ['family', 'friends'].includes(user.party_type || '')) { score += 10; signals.push('family/group travel signal'); }
      if (latestTrip?.islands?.length) { score += 5; signals.push(`interested in ${latestTrip.islands.slice(0, 2).join(', ')}`); }

      const latestActivityAt = latestDate(user.updated_at, latestTrip?.updated_at, userThreads[0]?.updated_at, userBookings[0]?.created_at) || user.updated_at;

      return {
        user,
        score,
        priority: priority(score),
        signals,
        suggestedAction: actionFor(signals),
        stats: {
          trips: userTrips.length,
          activeTrips: activeTrips.length,
          chatThreads: userThreads.length,
          bookings: userBookings.length,
          pendingBookings: pendingBookings.length,
          confirmedBookings: confirmedBookings.length,
          estimatedBudget: Math.round(estimatedBudget),
          latestActivityAt,
        },
        latestTrip,
      };
    })
      .filter(lead => lead.score >= 15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    const summary = {
      total: leads.length,
      hot: leads.filter(l => l.priority === 'hot').length,
      warm: leads.filter(l => l.priority === 'warm').length,
      watch: leads.filter(l => l.priority === 'watch').length,
      pendingBookings: leads.reduce((sum, l) => sum + l.stats.pendingBookings, 0),
      estimatedBudget: leads.reduce((sum, l) => sum + l.stats.estimatedBudget, 0),
    };

    return NextResponse.json({ leads, summary });
  } catch (err: any) {
    console.error('High-intent API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
