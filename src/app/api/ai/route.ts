import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14');

    // Daily costs from the view
    const { data: dailyCosts, error: dailyErr } = await supabase
      .from('ai_daily_costs')
      .select('*')
      .order('date', { ascending: false })
      .limit(days * 3); // up to 3 models per day

    if (dailyErr) throw dailyErr;

    // Top users by cost (30d)
    const { data: userCosts, error: userErr } = await supabase
      .from('ai_user_costs_30d')
      .select('*')
      .limit(20);

    if (userErr) throw userErr;

    // Recent usage log entries for session-level data
    const { data: recentLogs, error: logErr } = await supabase
      .from('ai_usage_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logErr) throw logErr;

    return NextResponse.json({
      dailyCosts: dailyCosts || [],
      userCosts: userCosts || [],
      recentLogs: recentLogs || [],
    });
  } catch (err: any) {
    console.error('AI costs API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
