import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for /api/ugc — UGC moderation endpoint.
 *
 * V2 route shape:
 *   - Wrapped by withAdminAuth (validates admin session JWT + role).
 *   - Snapshots the UGC row before mutation (for audit log diff).
 *   - Performs the moderation_status update.
 *   - Calls logAudit() to write an immutable admin_audit_log row.
 *
 * Mocks:
 *   - createAdminClient → chainable Supabase stub. Every chainable method
 *     returns the SAME chain object, so any call sequence works
 *     (select.eq.single, select.eq.order.limit, update.eq.select.single).
 *     Configure terminal resolvers per test via mockResolvedValueOnce
 *     on chain.single or chain.limit.
 *   - withAdminAuth → bypass auth, inject a fake admin into the handler.
 *   - logAudit → spy we assert against; never touches the DB.
 */

const fakeAdmin = { id: 'admin-uuid', email: 'admin@example.com', role: 'admin' as const };
const beforeRow = { id: 'ugc-1', moderation_status: 'pending', caption: 'hello' };

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};
let chain: Chain;
let mockFrom: ReturnType<typeof vi.fn>;

vi.mock('@/lib/supabase', () => ({
  createAdminClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (req: Request) => handler(req, { supabase: { from: (...args: unknown[]) => mockFrom(...args) }, admin: fakeAdmin }),
}));

const mockLogAudit = vi.fn();
vi.mock('@/lib/audit-log', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

import { GET, POST } from '@/app/api/ugc/route';

beforeEach(() => {
  // Fresh chain per test. Each chainable method returns `chain` so any
  // method sequence resolves; terminal methods get configured per test.
  chain = {
    select: vi.fn(),
    eq:     vi.fn(),
    order:  vi.fn(),
    limit:  vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  // Terminal methods (single, limit) intentionally unset — each test
  // configures them via mockResolvedValueOnce.

  mockFrom = vi.fn(() => chain);

  mockLogAudit.mockReset();
  mockLogAudit.mockResolvedValue({ id: 'audit-1' });
});

// ─── POST input validation ──────────────────────────────────────────────

describe('POST /api/ugc — input validation', () => {
  test('rejects missing id with 400', async () => {
    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ action: 'approved' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/id and action required/i);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  test('rejects missing action with 400', async () => {
    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ id: 'ugc-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  test('rejects invalid action values (only approved/rejected allowed)', async () => {
    for (const bad of ['delete', 'spam', 'flag', '', 'APPROVED', ' approved ']) {
      const req = new Request('http://localhost/api/ugc', {
        method: 'POST',
        body: JSON.stringify({ id: 'ugc-1', action: bad }),
      });
      const res = await POST(req);
      expect(res.status, `bad value "${bad}" should be rejected`).toBe(400);
    }
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});

// ─── POST happy path ────────────────────────────────────────────────────

describe('POST /api/ugc — moderation actions write audit log', () => {
  test('approving sets moderation_status="approved" and logs ugc_approved', async () => {
    // First .single() = before-snapshot. Second = post-update.
    chain.single
      .mockResolvedValueOnce({ data: beforeRow, error: null })
      .mockResolvedValueOnce({ data: { ...beforeRow, moderation_status: 'approved' }, error: null });

    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ id: 'ugc-1', action: 'approved' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Update payload has the right shape
    expect(chain.update).toHaveBeenCalledTimes(1);
    const updatePayload = chain.update.mock.calls[0][0];
    expect(updatePayload.moderation_status).toBe('approved');
    expect(typeof updatePayload.updated_at).toBe('string');
    expect(() => new Date(updatePayload.updated_at).toISOString()).not.toThrow();

    // Audit log was written with the right action + entity + admin + diff
    expect(mockLogAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockLogAudit.mock.calls[0][0];
    expect(auditCall.action).toBe('ugc_approved');
    expect(auditCall.entityType).toBe('ugc_content');
    expect(auditCall.entityId).toBe('ugc-1');
    expect(auditCall.admin).toEqual(fakeAdmin);
    expect(auditCall.before).toEqual(beforeRow);
    expect(auditCall.after?.moderation_status).toBe('approved');
  });

  test('rejecting sets moderation_status="rejected" and logs ugc_rejected', async () => {
    chain.single
      .mockResolvedValueOnce({ data: beforeRow, error: null })
      .mockResolvedValueOnce({ data: { ...beforeRow, moderation_status: 'rejected' }, error: null });

    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ id: 'ugc-2', action: 'rejected' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(chain.update.mock.calls[0][0].moderation_status).toBe('rejected');
    expect(mockLogAudit.mock.calls[0][0].action).toBe('ugc_rejected');
  });

  test('optional reason is forwarded to audit log metadata', async () => {
    chain.single
      .mockResolvedValueOnce({ data: beforeRow, error: null })
      .mockResolvedValueOnce({ data: { ...beforeRow, moderation_status: 'rejected' }, error: null });

    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ id: 'ugc-3', action: 'rejected', reason: 'off-topic' }),
    });

    await POST(req);
    expect(mockLogAudit.mock.calls[0][0].metadata).toEqual({ reason: 'off-topic' });
  });

  test('returns 404 when the UGC row does not exist', async () => {
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'no rows returned' },
    });

    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ id: 'missing', action: 'approved' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    expect(chain.update).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  test('Supabase error during update surfaces as 500 and does not log audit', async () => {
    chain.single
      .mockResolvedValueOnce({ data: beforeRow, error: null })  // before-snapshot OK
      .mockResolvedValueOnce({ data: null, error: { message: 'row-level security violation' } });

    const req = new Request('http://localhost/api/ugc', {
      method: 'POST',
      body: JSON.stringify({ id: 'ugc-1', action: 'approved' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/row-level security violation/);
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});

// ─── GET behavior ───────────────────────────────────────────────────────

describe('GET /api/ugc — listing', () => {
  test('defaults to status=pending when query param missing', async () => {
    chain.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });

    const req = new Request('http://localhost/api/ugc');
    await GET(req);

    expect(chain.eq).toHaveBeenCalledWith('moderation_status', 'pending');
  });

  test('honors ?status=approved query param', async () => {
    chain.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });

    const req = new Request('http://localhost/api/ugc?status=approved');
    await GET(req);

    expect(chain.eq).toHaveBeenCalledWith('moderation_status', 'approved');
  });

  test('returns items + total count when data is present', async () => {
    const rows = [
      { id: 'u1', moderation_status: 'pending', users: { display_name: 'V' } },
      { id: 'u2', moderation_status: 'pending', users: { display_name: 'A' } },
    ];
    chain.limit.mockResolvedValueOnce({ data: rows, error: null, count: 2 });

    const res = await GET(new Request('http://localhost/api/ugc'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(2);
    expect(json.total).toBe(2);
  });

  test('returns friendly empty payload when ugc_content table is missing (42P01)', async () => {
    chain.limit.mockResolvedValueOnce({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
      count: null,
    });

    const res = await GET(new Request('http://localhost/api/ugc'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.note).toMatch(/no data yet/i);
  });

  test('unexpected DB error surfaces as 500', async () => {
    chain.limit.mockResolvedValueOnce({
      data: null,
      error: { code: '08P01', message: 'protocol violation' },
      count: null,
    });

    const res = await GET(new Request('http://localhost/api/ugc'));
    expect(res.status).toBe(500);
  });
});
