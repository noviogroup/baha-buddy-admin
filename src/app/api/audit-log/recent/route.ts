import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── GET /api/audit-log/recent ──────────────────────────────────────────
// Lightweight endpoint for the header notifications popover. Returns only
// the 10 most recent audit entries with the minimum fields needed to render
// a compact list. No before/after JSON (those can be heavy).
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('id, admin_email, action, entity_type, entity_id, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error?.code === '42P01') {
      return NextResponse.json({ entries: [] });
    }
    if (error) throw error;

    return NextResponse.json({ entries: data || [] });
  } catch (err: any) {
    console.error('Recent audit log error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
