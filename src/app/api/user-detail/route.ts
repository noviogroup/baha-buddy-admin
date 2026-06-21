import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { enrichBookingRows, isRecognizedRevenue, num } from '@/lib/booking-reconciliation';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  amount?: number | string | null;
  status?: string | null;
  paid_at?: string | null;
  stripe_payment_intent_id?: string | null;
  booking_type?: string | null;
  booking_reference?: string | null;
  external_reference?: string | null;
  financial_metadata?: Record<string, unknown> | null;
  payment_status?: string;
  provider_status?: string;
  failure_state?: string;
  reconciled?: boolean;
};

// GET /api/user-detail?id=xxx — full user profile + trips + bookings + chat threads
//
// Note: this exposes PII (email, full name, location). Audit-level logging of
// every read is intentionally skipped here to avoid noise — pii_access_log
// captures explicit "reveal" actions (passport/payment), which this endpoint
// does NOT touch. Phase 3 may add a "View Full PII" button that prompts for a
// reason and writes to pii_access_log via logPiiReveal().
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }

    // Parallel queries for the full user picture
    const [userRes, tripsRes, bookingsRes, threadsRes, aiUsageRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('trips').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('chat_threads').select('id, trip_id, last_message_preview, created_at, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('ai_usage_log').select('model, input_tokens, output_tokens, estimated_cost_usd, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    ]);

    if (userRes.error) {
      // Distinguish "no rows" from other errors so the UI can render an empty state cleanly.
      if (userRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw userRes.error;
    }

    // Calculate user's total AI spend
    const totalAiCost = (aiUsageRes.data || []).reduce(
      (sum: number, r: any) => sum + (parseFloat(r.estimated_cost_usd) || 0), 0
    );
    const totalTokens = (aiUsageRes.data || []).reduce(
      (sum: number, r: any) => sum + (r.input_tokens || 0) + (r.output_tokens || 0), 0
    );

    const bookings = await enrichBookingRows(supabase, (bookingsRes.data || []) as BookingRow[]);
    const userRevenue = bookings.filter(isRecognizedRevenue).reduce(
      (sum: number, b: BookingRow) => sum + num(b.amount), 0
    );

    return NextResponse.json({
      user: userRes.data,
      trips: tripsRes.data || [],
      bookings,
      threads: threadsRes.data || [],
      aiUsage: {
        recentLogs: aiUsageRes.data || [],
        totalCost: Math.round(totalAiCost * 10000) / 10000,
        totalTokens,
        requestCount: (aiUsageRes.data || []).length,
      },
      revenue: Math.round(userRevenue * 100) / 100,
    });
  } catch (err: any) {
    console.error('User detail API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
