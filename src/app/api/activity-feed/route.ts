import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/activity-feed — recent activity across the platform
// Returns last 30 events: new users, trips created, bookings, chat messages
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // last 24h

    const [usersRes, tripsRes, bookingsRes, messagesRes] = await Promise.all([
      supabase.from('users')
        .select('id, display_name, email, country, city, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('trips')
        .select('id, name, status, islands, created_at, users!inner(display_name)')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('bookings')
        .select('id, booking_type, status, amount, currency, created_at, users!inner(display_name), trips(name)')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('chat_messages')
        .select('id, role, content, created_at, thread_id')
        .eq('role', 'user')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Combine into a unified feed
    const feed: any[] = [];

    (usersRes.data || []).forEach((u: any) => {
      feed.push({
        type: 'user_signup',
        timestamp: u.created_at,
        title: `${u.display_name} signed up`,
        subtitle: u.city ? `${u.city}, ${u.country}` : u.country || 'Unknown location',
        icon: 'user',
        data: u,
      });
    });

    (tripsRes.data || []).forEach((t: any) => {
      feed.push({
        type: 'trip_created',
        timestamp: t.created_at,
        title: `${t.users?.display_name} created "${t.name}"`,
        subtitle: (t.islands || []).join(', ') || 'No islands yet',
        icon: 'compass',
        data: t,
      });
    });

    (bookingsRes.data || []).forEach((b: any) => {
      feed.push({
        type: 'booking',
        timestamp: b.created_at,
        title: `${b.users?.display_name} \u2014 ${b.booking_type} booking`,
        subtitle: `$${parseFloat(b.amount).toLocaleString()} \u00b7 ${b.status} \u00b7 ${b.trips?.name || ''}`,
        icon: 'dollar',
        data: b,
      });
    });

    (messagesRes.data || []).forEach((m: any) => {
      feed.push({
        type: 'chat_message',
        timestamp: m.created_at,
        title: 'User message',
        subtitle: m.content.substring(0, 80) + (m.content.length > 80 ? '...' : ''),
        icon: 'message',
        data: m,
      });
    });

    // Sort by timestamp descending
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ feed: feed.slice(0, 30) });
  } catch (err: any) {
    console.error('Activity feed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
