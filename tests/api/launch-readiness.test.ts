import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
  logAudit: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

vi.mock('@/lib/audit-log', () => ({
  logAudit: (...args: unknown[]) => testState.logAudit(...args),
}));

import { GET, PATCH, POST } from '@/app/api/launch-readiness/route';

type QueryResult = { data: unknown; error: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function makeSingleQuery(result: QueryResult) {
  return {
    select: vi.fn(function select() { return this; }),
    eq: vi.fn(function eq() { return this; }),
    single: vi.fn(() => Promise.resolve(result)),
  };
}

function makeInsertQuery(result: QueryResult) {
  return {
    insert: vi.fn(function insert() { return this; }),
    select: vi.fn(function select() { return this; }),
    single: vi.fn(() => Promise.resolve(result)),
  };
}

function makeUpdateQuery(result: QueryResult) {
  return {
    update: vi.fn(function update() { return this; }),
    eq: vi.fn(function eq() { return this; }),
    select: vi.fn(function select() { return this; }),
    single: vi.fn(() => Promise.resolve(result)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/api/launch-readiness', () => {
  test('GET returns launch gate summary and workstreams', async () => {
    const rows = [
      task({ id: 'p0-open', priority: 'p0', status: 'todo', workstream: 'Security' }),
      task({ id: 'approval', priority: 'p1', status: 'needs_approval', workstream: 'Bookings' }),
      task({ id: 'approved', priority: 'p0', status: 'approved', workstream: 'Bookings' }),
      task({ id: 'blocked', priority: 'p1', status: 'blocked', workstream: 'AI / Places' }),
      task({ id: 'done', priority: 'p2', status: 'done', workstream: 'Voice' }),
    ];
    const query = makeQuery({ data: rows, error: null });
    testState.supabase.from.mockReturnValue(query);

    const response = await GET(new Request('http://localhost.test/api/launch-readiness?limit=50'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks).toHaveLength(5);
    expect(body.summary).toMatchObject({
      total: 5,
      openP0: 1,
      needsApproval: 1,
      approved: 2,
      blocked: 1,
      completionRate: 40,
    });
    expect(body.summary.byPriority).toMatchObject({ p0: 2, p1: 2, p2: 1, p3: 0 });
    expect(body.workstreams).toEqual(['AI / Places', 'Bookings', 'Security', 'Voice']);
    expect(query.limit).toHaveBeenCalledWith(50);
  });

  test('POST creates a launch task and writes audit log', async () => {
    const created = task({ id: 'new-task', title: 'Approve TestFlight checklist', priority: 'p1', status: 'todo' });
    const insertQuery = makeInsertQuery({ data: created, error: null });
    testState.supabase.from.mockReturnValue(insertQuery);

    const response = await POST(new Request('http://localhost.test/api/launch-readiness', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Approve TestFlight checklist',
        workstream: 'QA',
        priority: 'p1',
        owner: 'CPO',
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.task).toMatchObject({ id: 'new-task', title: 'Approve TestFlight checklist' });
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Approve TestFlight checklist',
      workstream: 'QA',
      priority: 'p1',
      owner: 'CPO',
      created_by: 'admin-1',
      updated_by: 'admin-1',
    }));
    expect(testState.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'launch_task_created',
      entityType: 'launch_readiness_task',
      entityId: 'new-task',
    }));
  });

  test('PATCH approves task with approver metadata and audit action', async () => {
    const before = task({ id: 'task-1', status: 'needs_approval', approved_at: null, approver_email: null });
    const after = task({
      id: 'task-1',
      status: 'approved',
      approved_at: '2026-06-19T10:00:00Z',
      approver_email: 'admin@example.com',
    });
    const fetchQuery = makeSingleQuery({ data: before, error: null });
    const updateQuery = makeUpdateQuery({ data: after, error: null });
    testState.supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery);

    const response = await PATCH(new Request('http://localhost.test/api/launch-readiness', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'task-1', status: 'approved', evidence_url: 'https://example.test/proof' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.task).toMatchObject({ id: 'task-1', status: 'approved', approver_email: 'admin@example.com' });
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      evidence_url: 'https://example.test/proof',
      approver_email: 'admin@example.com',
      updated_by: 'admin-1',
    }));
    expect(updateQuery.update.mock.calls[0][0].approved_at).toEqual(expect.any(String));
    expect(testState.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'launch_task_approved',
      entityType: 'launch_readiness_task',
      entityId: 'task-1',
      before,
      after,
    }));
  });

  test('PATCH rejects invalid status', async () => {
    const before = task({ id: 'task-1' });
    const fetchQuery = makeSingleQuery({ data: before, error: null });
    testState.supabase.from.mockReturnValue(fetchQuery);

    const response = await PATCH(new Request('http://localhost.test/api/launch-readiness', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'task-1', status: 'shipped' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid status');
    expect(testState.logAudit).not.toHaveBeenCalled();
  });
});

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task',
    source_key: null,
    title: 'Launch task',
    description: null,
    workstream: 'Operations',
    priority: 'p1',
    status: 'todo',
    owner: null,
    approver_email: null,
    approved_at: null,
    due_date: null,
    scenario_ref: null,
    source_doc_path: null,
    evidence_url: null,
    notes: null,
    sort_order: 0,
    created_by: null,
    updated_by: null,
    created_at: '2026-06-19T00:00:00Z',
    updated_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}
