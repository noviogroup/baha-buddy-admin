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

import { GET } from '@/app/api/bookings/route';

type QueryResult = { data: unknown; error: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/bookings status model', () => {
  test('enriches canonical bookings with source, payment, provider, and failure states', async () => {
    const financialRows = [
      {
        id: 'paid-provider-failed',
        booking_type: 'hotel',
        provider: 'liteapi',
        status: 'confirmed',
        paid_at: '2026-06-17T10:00:00Z',
        gross_booking_value: 1200,
        net_revenue: 150,
        partner_payout_amount: 40,
        gross_margin_after_payout: 110,
      },
      {
        id: 'provider-local-failed',
        booking_type: 'flight',
        provider: 'liteapi',
        status: 'failed',
        gross_booking_value: 500,
        net_revenue: 50,
        partner_payout_amount: 0,
        gross_margin_after_payout: 50,
      },
      {
        id: 'abandoned',
        booking_type: 'hotel',
        provider: 'liteapi',
        status: 'pending',
        gross_booking_value: 0,
        net_revenue: 0,
        partner_payout_amount: 0,
        gross_margin_after_payout: 0,
      },
      {
        id: 'provider-pending',
        booking_type: 'flight',
        provider: 'liteapi',
        status: 'confirmed',
        gross_booking_value: 600,
        net_revenue: 60,
        partner_payout_amount: 0,
        gross_margin_after_payout: 60,
      },
      {
        id: 'cancelled',
        booking_type: 'hotel',
        provider: 'liteapi',
        status: 'cancelled',
        gross_booking_value: 300,
        net_revenue: 0,
        partner_payout_amount: 0,
        gross_margin_after_payout: 0,
      },
      {
        id: 'refunded',
        booking_type: 'hotel',
        provider: 'liteapi',
        status: 'refunded',
        gross_booking_value: 700,
        net_revenue: 0,
        partner_payout_amount: 0,
        gross_margin_after_payout: 0,
      },
    ];
    const canonicalRows = [
      {
        id: 'paid-provider-failed',
        financial_metadata: { source_surface: 'mobile', provider_status: 'failed' },
      },
      {
        id: 'provider-local-failed',
        booking_reference: 'LITE-PNR-1',
        financial_metadata: { source_surface: 'web', provider_status: 'confirmed' },
      },
      {
        id: 'abandoned',
        financial_metadata: { source_surface: 'chat' },
      },
      {
        id: 'provider-pending',
        financial_metadata: { source_surface: 'web' },
      },
      {
        id: 'cancelled',
        booking_reference: 'CANCEL-1',
        financial_metadata: { source_surface: 'admin' },
      },
      {
        id: 'refunded',
        booking_reference: 'REFUND-1',
        financial_metadata: { source_surface: 'concierge' },
      },
    ];

    const financialQuery = makeQuery({ data: financialRows, error: null });
    const canonicalQuery = makeQuery({ data: canonicalRows, error: null });
    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'v_booking_financials') return financialQuery;
      if (table === 'bookings') return canonicalQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/bookings?limit=6'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bookings).toHaveLength(6);
    expect(byId(body.bookings, 'paid-provider-failed')).toMatchObject({
      source_surface: 'mobile',
      payment_status: 'paid',
      provider_status: 'failed',
      failure_state: 'payment_succeeded_provider_failed',
    });
    expect(byId(body.bookings, 'provider-local-failed')).toMatchObject({
      source_surface: 'web',
      provider_reference: 'LITE-PNR-1',
      payment_status: 'failed',
      provider_status: 'confirmed',
      failure_state: 'provider_succeeded_local_failed',
    });
    expect(byId(body.bookings, 'abandoned')).toMatchObject({
      source_surface: 'chat',
      payment_status: 'pending',
      provider_status: 'pending',
      failure_state: 'abandoned_checkout',
    });
    expect(byId(body.bookings, 'provider-pending')).toMatchObject({
      source_surface: 'web',
      payment_status: 'paid',
      provider_status: 'pending',
      failure_state: 'provider_pending',
    });
    expect(byId(body.bookings, 'cancelled')).toMatchObject({
      source_surface: 'admin',
      payment_status: 'cancelled',
      provider_status: 'cancelled',
      failure_state: 'cancelled',
    });
    expect(byId(body.bookings, 'refunded')).toMatchObject({
      source_surface: 'concierge',
      payment_status: 'refunded',
      provider_status: 'cancelled',
      failure_state: 'refunded',
    });
    expect(body.summary).toMatchObject({
      total: 6,
      confirmed: 2,
      pending: 1,
      failed: 1,
      cancelled: 1,
      refunded: 1,
      grossBookingValue: 3300,
      netRevenue: 260,
    });
    expect(financialQuery.limit).toHaveBeenCalledWith(6);
    expect(canonicalQuery.in).toHaveBeenCalledWith('id', financialRows.map((row) => row.id));
  });
});

function byId(rows: Array<Record<string, unknown>>, id: string) {
  return rows.find((row) => row.id === id);
}
