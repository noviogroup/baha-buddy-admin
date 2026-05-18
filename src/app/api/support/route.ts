import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// ─── GET /api/support ────────────────────────────────────────────────────
// List support tickets. Read-only; requires admin role.
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('support_tickets')
      .select('*, users!inner(display_name, email), support_messages(id, content, sender_type, created_at)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error?.code === '42P01') {
      return NextResponse.json({
        tickets: [],
        note: 'support_tickets table not yet created. Run the admin migration.',
      });
    }
    if (error) throw error;

    return NextResponse.json({ tickets: data || [] });
  } catch (err: any) {
    console.error('Support API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

// ─── POST /api/support ───────────────────────────────────────────────────
// Send an admin reply to a support ticket, optionally transitioning the
// ticket status. Both the reply insert and the status change are audited.
//   { ticket_id: string; content: string; action?: 'resolve' | 'in_progress' }
export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const { ticket_id, content, action } = body as {
      ticket_id?: string;
      content?: string;
      action?: 'resolve' | 'in_progress';
    };

    if (!ticket_id || !content) {
      return NextResponse.json({ error: 'ticket_id and content required' }, { status: 400 });
    }

    // Insert reply
    const msgInsert = await supabase.from('support_messages').insert({
      ticket_id,
      content,
      sender_type: 'admin',
      sender_id: admin.id,
    } as never).select('*').single();
    if (msgInsert.error) throw msgInsert.error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'ticket_admin_reply',
      entityType: 'support_ticket',
      entityId: ticket_id,
      after: msgInsert.data,
      metadata: { message_id: (msgInsert.data as { id?: string })?.id },
    });

    // Optional status change
    if (action === 'resolve' || action === 'in_progress') {
      const newStatus = action === 'resolve' ? 'resolved' : 'in_progress';

      const beforeRes = await supabase.from('support_tickets').select('*').eq('id', ticket_id).single();
      if (beforeRes.error) throw beforeRes.error;

      const updateRes = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
        .eq('id', ticket_id)
        .select('*')
        .single();
      if (updateRes.error) throw updateRes.error;

      await logAudit({
        supabase,
        admin,
        request,
        action: 'ticket_status_changed',
        entityType: 'support_ticket',
        entityId: ticket_id,
        before: beforeRes.data,
        after: updateRes.data,
        metadata: { from: (beforeRes.data as { status?: string })?.status, to: newStatus },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Support reply error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
