import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

const ROLES = ['super_admin', 'admin', 'viewer'] as const;

type AdminRole = typeof ROLES[number];

function isRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ROLES.includes(value as AdminRole);
}

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id,email,display_name,role,active,last_seen_at,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const admins = data || [];
    const summary = admins.reduce((acc: Record<string, number>, row: any) => {
      const role = row.role || 'unknown';
      acc.total += 1;
      acc[role] = (acc[role] || 0) + 1;
      if (row.active) acc.active += 1;
      return acc;
    }, { total: 0, active: 0, super_admin: 0, admin: 0, viewer: 0 });

    return NextResponse.json({ admins, summary });
  } catch (err: any) {
    console.error('Admin users API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'super_admin' });

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const nextRole = body.role;
    const nextActive = body.active;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (nextRole !== undefined && !isRole(nextRole)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    if (id === admin.id && nextActive === false) return NextResponse.json({ error: 'Cannot change your own active status' }, { status: 400 });
    if (id === admin.id && nextRole && nextRole !== 'super_admin') return NextResponse.json({ error: 'Cannot change your own super admin role' }, { status: 400 });

    const before = await supabase.from('admin_users').select('*').eq('id', id).single();
    if (before.error) return NextResponse.json({ error: before.error.message }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nextRole !== undefined) updates.role = nextRole;
    if (nextActive !== undefined) updates.active = Boolean(nextActive);

    const after = await supabase
      .from('admin_users')
      .update(updates as never)
      .eq('id', id)
      .select('*')
      .single();

    if (after.error) throw after.error;

    await logAudit({
      supabase,
      admin,
      request,
      action: nextRole !== undefined ? 'admin_role_changed' : 'admin_removed',
      entityType: 'admin_user',
      entityId: id,
      before: before.data,
      after: after.data,
      metadata: { updates },
    });

    return NextResponse.json({ success: true, admin: after.data });
  } catch (err: any) {
    console.error('Admin users update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'super_admin' });
