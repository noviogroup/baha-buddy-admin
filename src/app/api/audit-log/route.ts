import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── GET /api/audit-log ──────────────────────────────────────────────────
// List admin_audit_log entries with filters. Any admin can read; the table
// itself is append-only at the database level (trigger tg_deny_mutation).
//
// Query params:
//   page         — 0-indexed page (default 0)
//   limit        — page size (default 50, max 100)
//   admin_email  — filter to a specific admin
//   action       — filter to a specific action (e.g. 'ugc_approved')
//   entity_type  — filter to a specific entity (e.g. 'support_ticket')
//   start_date   — ISO timestamp lower bound
//   end_date     — ISO timestamp upper bound
//
// Returns:
//   { entries, total, filters: { admins, actions, entityTypes } }
//   The `filters` field powers the dropdown options in the UI.
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const adminEmail = searchParams.get('admin_email') || '';
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entity_type') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';

    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (adminEmail) query = query.eq('admin_email', adminEmail);
    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, count, error } = await query;

    if (error?.code === '42P01') {
      // Table missing — migration hasn't been run.
      return NextResponse.json({
        entries: [],
        total: 0,
        filters: { admins: [], actions: [], entityTypes: [] },
        note: 'admin_audit_log table not yet created. Run migration 20260517_admin_audit_and_roles.sql.',
      });
    }
    if (error) throw error;

    // Distinct values for filter dropdowns. We pull from the
    // admin_action_summary view for admin_email + action (already grouped),
    // and a bounded sample for entity_type. Sub-second query at any scale we
    // care about; revisit only if audit volume exceeds ~100k rows.
    const [summaryRes, entityRes] = await Promise.all([
      supabase.from('admin_action_summary').select('admin_email, action').limit(500),
      supabase.from('admin_audit_log').select('entity_type').limit(2000),
    ]);

    const admins = Array.from(new Set((summaryRes.data || []).map((r: any) => r.admin_email).filter(Boolean))).sort();
    const actions = Array.from(new Set((summaryRes.data || []).map((r: any) => r.action).filter(Boolean))).sort();
    const entityTypes = Array.from(new Set((entityRes.data || []).map((r: any) => r.entity_type).filter(Boolean))).sort();

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      filters: { admins, actions, entityTypes },
    });
  } catch (err: any) {
    console.error('Audit log API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
