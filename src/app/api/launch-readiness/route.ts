import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';
import type { LaunchReadinessPriority, LaunchReadinessStatus, LaunchReadinessTaskRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUSES: LaunchReadinessStatus[] = ['todo', 'in_progress', 'needs_approval', 'approved', 'blocked', 'done'];
const PRIORITIES: LaunchReadinessPriority[] = ['p0', 'p1', 'p2', 'p3'];

type TaskInput = {
  title?: unknown;
  description?: unknown;
  workstream?: unknown;
  priority?: unknown;
  status?: unknown;
  owner?: unknown;
  due_date?: unknown;
  scenario_ref?: unknown;
  source_doc_path?: unknown;
  evidence_url?: unknown;
  notes?: unknown;
};

export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const workstream = searchParams.get('workstream') || 'all';
    const limit = Math.min(Number(searchParams.get('limit') || 250), 500);

    let query = supabase
      .from('launch_readiness_tasks')
      .select('*')
      .order('priority', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (isStatus(status)) query = query.eq('status', status);
    if (isPriority(priority)) query = query.eq('priority', priority);
    if (workstream !== 'all') query = query.eq('workstream', workstream);

    const { data, error } = await query;

    if (error?.code === '42P01') {
      return NextResponse.json({
        tasks: [],
        summary: emptySummary(),
        workstreams: [],
        note: 'launch_readiness_tasks table not yet created. Run migration 20260619130000_launch_readiness_tasks.sql.',
      });
    }
    if (error) throw error;

    const tasks = (data || []) as LaunchReadinessTaskRow[];
    return NextResponse.json({
      tasks,
      summary: summarize(tasks),
      workstreams: Array.from(new Set(tasks.map(task => task.workstream).filter(Boolean))).sort(),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Launch readiness API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json() as TaskInput;
    const insert = normalizeTaskInput(body, { requireTitle: true });

    const { data, error } = await supabase
      .from('launch_readiness_tasks')
      .insert({
        ...insert,
        created_by: admin.id,
        updated_by: admin.id,
      } as never)
      .select('*')
      .single();

    if (error) throw error;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'launch_task_created',
      entityType: 'launch_readiness_task',
      entityId: (data as LaunchReadinessTaskRow).id,
      after: data,
    });

    return NextResponse.json({ success: true, task: data }, { status: 201, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    const status = err.statusCode || 500;
    console.error('Launch readiness create error:', err);
    return NextResponse.json({ error: err.message }, { status });
  }
}, { requireRole: 'admin' });

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json() as TaskInput & { id?: unknown };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 });

    const beforeRes: any = await supabase
      .from('launch_readiness_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (beforeRes.error || !beforeRes.data) {
      return NextResponse.json({ error: beforeRes.error?.message || 'Task not found' }, { status: 404 });
    }

    const before = beforeRes.data as LaunchReadinessTaskRow;
    const update = normalizeTaskInput(body, { requireTitle: false });
    update.updated_by = admin.id;

    if (update.status === 'approved') {
      update.approver_email = admin.email;
      update.approved_at = new Date().toISOString();
    } else if (update.status && update.status !== 'approved') {
      update.approver_email = null;
      update.approved_at = null;
    }

    if (Object.keys(update).length === 1 && update.updated_by) {
      return NextResponse.json({ error: 'No update fields supplied' }, { status: 400 });
    }

    const updateRes: any = await supabase
      .from('launch_readiness_tasks')
      .update(update as never)
      .eq('id', id)
      .select('*')
      .single();

    if (updateRes.error) throw updateRes.error;

    const after = updateRes.data as LaunchReadinessTaskRow;
    const action = update.status === 'approved'
      ? 'launch_task_approved'
      : update.status && update.status !== before.status
        ? 'launch_task_status_changed'
        : 'launch_task_updated';

    await logAudit({
      supabase,
      admin,
      request,
      action,
      entityType: 'launch_readiness_task',
      entityId: id,
      before,
      after,
      metadata: { updates: update },
    });

    return NextResponse.json({ success: true, task: after }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    const status = err.statusCode || 500;
    console.error('Launch readiness update error:', err);
    return NextResponse.json({ error: err.message }, { status });
  }
}, { requireRole: 'admin' });

function normalizeTaskInput(input: TaskInput, options: { requireTitle: boolean }) {
  const update: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const title = cleanString(input.title);
    if (!title) throw badRequest('Title is required');
    update.title = title;
  } else if (options.requireTitle) {
    throw badRequest('Title is required');
  }

  for (const key of ['description', 'workstream', 'owner', 'due_date', 'scenario_ref', 'source_doc_path', 'evidence_url', 'notes'] as const) {
    if (input[key] !== undefined) update[key] = cleanString(input[key]) || null;
  }

  if (update.workstream === null) update.workstream = 'Operations';

  if (input.priority !== undefined) {
    const priority = cleanString(input.priority).toLowerCase();
    if (!isPriority(priority)) throw badRequest('Invalid priority');
    update.priority = priority;
  }

  if (input.status !== undefined) {
    const status = cleanString(input.status).toLowerCase();
    if (!isStatus(status)) throw badRequest('Invalid status');
    update.status = status;
  }

  return update;
}

function summarize(tasks: LaunchReadinessTaskRow[]) {
  const summary = emptySummary();
  for (const task of tasks) {
    summary.total += 1;
    summary.byStatus[task.status] = (summary.byStatus[task.status] || 0) + 1;
    summary.byPriority[task.priority] = (summary.byPriority[task.priority] || 0) + 1;
    if (task.priority === 'p0' && task.status !== 'approved' && task.status !== 'done') summary.openP0 += 1;
    if (task.status === 'needs_approval') summary.needsApproval += 1;
    if (task.status === 'approved' || task.status === 'done') summary.approved += 1;
    if (task.status === 'blocked') summary.blocked += 1;
  }
  summary.completionRate = summary.total ? Math.round((summary.approved / summary.total) * 100) : 0;
  return summary;
}

function emptySummary() {
  return {
    total: 0,
    openP0: 0,
    needsApproval: 0,
    approved: 0,
    blocked: 0,
    completionRate: 0,
    byStatus: Object.fromEntries(STATUSES.map(status => [status, 0])),
    byPriority: Object.fromEntries(PRIORITIES.map(priority => [priority, 0])),
  };
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isStatus(value: unknown): value is LaunchReadinessStatus {
  return typeof value === 'string' && STATUSES.includes(value as LaunchReadinessStatus);
}

function isPriority(value: unknown): value is LaunchReadinessPriority {
  return typeof value === 'string' && PRIORITIES.includes(value as LaunchReadinessPriority);
}

function badRequest(message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  return error;
}
