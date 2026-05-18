import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// ─── GET /api/ugc ─────────────────────────────────────────────────────────
// List UGC content for moderation. Read-only; requires admin role.
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const { data, error, count } = await supabase
      .from('ugc_content')
      .select('*, users!inner(display_name, email)', { count: 'exact' })
      .eq('moderation_status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error?.code === '42P01') {
      return NextResponse.json({ items: [], total: 0, note: 'ugc_content table exists but no data yet.' });
    }
    if (error) throw error;

    return NextResponse.json({ items: data || [], total: count || 0 });
  } catch (err: any) {
    console.error('UGC API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

// ─── POST /api/ugc ────────────────────────────────────────────────────────
// Approve or reject a UGC item. Audited.
//   { id: string; action: 'approved' | 'rejected'; reason?: string }
export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const { id, action, reason } = body as { id?: string; action?: string; reason?: string };

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    }
    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'action must be approved or rejected' }, { status: 400 });
    }

    // Snapshot before-state for audit log.
    const beforeRes = await supabase.from('ugc_content').select('*').eq('id', id).single();
    if (beforeRes.error) {
      return NextResponse.json({ error: `UGC item not found: ${beforeRes.error.message}` }, { status: 404 });
    }

    // Apply mutation.
    const updateRes = await supabase
      .from('ugc_content')
      .update({ moderation_status: action, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
      .select('*')
      .single();
    if (updateRes.error) throw updateRes.error;

    // Write audit log.
    await logAudit({
      supabase,
      admin,
      request,
      action: action === 'approved' ? 'ugc_approved' : 'ugc_rejected',
      entityType: 'ugc_content',
      entityId: id,
      before: beforeRes.data,
      after: updateRes.data,
      metadata: reason ? { reason } : {},
    });

    return NextResponse.json({ success: true, after: updateRes.data });
  } catch (err: any) {
    console.error('UGC moderation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
