import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// ─── GET /api/billing ────────────────────────────────────────────────────
// Returns credit status for all API services + combined daily costs.
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. Credit status for all services
    const { data: credits, error: credErr } = await supabase
      .from('api_credit_status')
      .select('*')
      .order('service');

    // If table doesn't exist yet, return seed instruction
    if (credErr?.code === '42P01') {
      return NextResponse.json({
        credits: [],
        needsMigration: true,
        note: 'Run migrations/20260308_api_cost_tracking.sql to create api_credit_status + api_usage_log tables.',
      });
    }
    if (credErr) throw credErr;

    // 2. AI costs (from ai_usage_log — already exists)
    const { data: aiDaily } = await supabase
      .from('ai_daily_costs')
      .select('*')
      .order('date', { ascending: false })
      .limit(90); // ~30 days × 3 models

    // 3. API costs (from api_usage_log — new table)
    let apiDaily: any[] = [];
    try {
      const { data } = await supabase
        .from('api_daily_usage')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);
      apiDaily = data || [];
    } catch { /* table may not exist yet */ }

    // 4. Combined costs (from all_daily_costs view)
    let allDailyCosts: any[] = [];
    try {
      const { data } = await supabase
        .from('all_daily_costs')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);
      allDailyCosts = data || [];
    } catch { /* view may not exist yet */ }

    // 5. AI costs aggregated for current month
    const aiMonthTotal = (aiDaily || [])
      .filter((r: any) => r.date >= monthStart.slice(0, 10))
      .reduce((sum: number, r: any) => sum + (parseFloat(r.total_cost_usd) || 0), 0);

    const aiTodayTotal = (aiDaily || [])
      .filter((r: any) => r.date >= todayStart.slice(0, 10))
      .reduce((sum: number, r: any) => sum + (parseFloat(r.total_cost_usd) || 0), 0);

    // 6. API costs aggregated for current month
    const apiMonthTotal = apiDaily
      .filter((r: any) => r.date >= monthStart.slice(0, 10))
      .reduce((sum: number, r: any) => sum + (parseFloat(r.total_cost_usd) || 0), 0);

    // 7. Stripe revenue this month
    let stripeRevenue: any[] = [];
    try {
      const { data } = await supabase
        .from('stripe_revenue_summary')
        .select('*')
        .limit(60);
      stripeRevenue = data || [];
    } catch { /* view may not exist yet */ }

    const revenueMonth = stripeRevenue
      .filter((r: any) => r.date >= monthStart.slice(0, 10))
      .reduce((sum: number, r: any) => sum + (parseFloat(r.revenue) || 0), 0);

    // 8. Bookings summary
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, amount')
      .gte('created_at', monthStart);

    const bookingSummary = {
      total: bookings?.length || 0,
      confirmed: bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
      pending: bookings?.filter((b: any) => b.status === 'pending').length || 0,
      failed: bookings?.filter((b: any) => b.status === 'failed').length || 0,
      cancelled: bookings?.filter((b: any) => b.status === 'cancelled').length || 0,
      refunded: bookings?.filter((b: any) => b.status === 'refunded').length || 0,
    };

    return NextResponse.json({
      credits: credits || [],
      aiDaily: aiDaily || [],
      apiDaily,
      allDailyCosts,
      stripeRevenue,
      summary: {
        aiCostToday: Math.round(aiTodayTotal * 100) / 100,
        aiCostMonth: Math.round(aiMonthTotal * 100) / 100,
        apiCostMonth: Math.round(apiMonthTotal * 100) / 100,
        totalCostMonth: Math.round((aiMonthTotal + apiMonthTotal) * 100) / 100,
        revenueMonth: Math.round(revenueMonth * 100) / 100,
        bookings: bookingSummary,
      },
    });
  } catch (err: any) {
    console.error('Billing API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

// ─── POST /api/billing ───────────────────────────────────────────────────
// Update credit status for a service. Audited.
//   { service: string; credit_balance?, monthly_limit?, current_month_usage?,
//     api_key_status?, plan_tier?, notes? }
export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const { service, credit_balance, monthly_limit, current_month_usage, api_key_status, plan_tier, notes } = body;

    if (!service) {
      return NextResponse.json({ error: 'service is required' }, { status: 400 });
    }

    // Snapshot before-state for the audit log diff.
    const beforeRes = await supabase.from('api_credit_status').select('*').eq('service', service).single();
    if (beforeRes.error) {
      return NextResponse.json({ error: `service not found: ${beforeRes.error.message}` }, { status: 404 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (credit_balance !== undefined) updates.credit_balance = credit_balance;
    if (monthly_limit !== undefined) updates.monthly_limit = monthly_limit;
    if (current_month_usage !== undefined) updates.current_month_usage = current_month_usage;
    if (api_key_status) updates.api_key_status = api_key_status;
    if (plan_tier) updates.plan_tier = plan_tier;
    if (notes) updates.notes = notes;

    const updateRes = await supabase
      .from('api_credit_status')
      .update(updates as never)
      .eq('service', service)
      .select('*')
      .single();
    if (updateRes.error) throw updateRes.error;

    await logAudit({
      supabase, admin, request,
      action: 'billing_credit_updated',
      entityType: 'api_credit_status',
      entityId: service,
      before: beforeRes.data,
      after: updateRes.data,
    });

    return NextResponse.json({ success: true, after: updateRes.data });
  } catch (err: any) {
    console.error('Billing update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
