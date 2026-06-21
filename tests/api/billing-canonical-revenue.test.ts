import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/billing/route';

type QueryResult = { data?: unknown; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result.data ?? [], error: result.error ?? null }).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-20T14:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/billing canonical revenue', () => {
  test('uses reconciled bookings for revenue and does not read legacy Stripe summary view', async () => {
    const creditsQuery = makeQuery({
      data: [{ service: 'LiteAPI', api_key_status: 'active', credit_balance: 100, current_month_usage: 7, plan_tier: 'production' }],
    });
    const aiDailyQuery = makeQuery({
      data: [
        { date: '2026-06-20', total_cost_usd: 3.25 },
        { date: '2026-06-10', total_cost_usd: 11.75 },
        { date: '2026-05-31', total_cost_usd: 99 },
      ],
    });
    const apiDailyQuery = makeQuery({
      data: [
        { date: '2026-06-20', total_cost_usd: 5 },
        { date: '2026-06-02', total_cost_usd: 15 },
        { date: '2026-05-31', total_cost_usd: 80 },
      ],
    });
    const allDailyQuery = makeQuery({ data: [] });
    const bookingsQuery = makeQuery({
      data: [
        booking({
          id: 'good-stay',
          amount: 1000,
          stripe_payment_intent_id: 'pi_good_stay',
          financial_metadata: { source_surface: 'mobile' },
        }),
        booking({
          id: 'provider-failed',
          amount: 700,
          stripe_payment_intent_id: 'pi_provider_failed',
          financial_metadata: { source_surface: 'web', provider_status: 'failed' },
        }),
        booking({
          id: 'abandoned',
          amount: 300,
          status: 'pending',
          paid_at: null,
          stripe_payment_intent_id: null,
          financial_metadata: { source_surface: 'chat' },
        }),
      ],
    });
    const accommodationsQuery = makeQuery({
      data: [
        {
          id: 'trip-accommodation-good',
          status: 'booked',
          booking_reference: 'LITE-STAY-1',
          stripe_payment_intent_id: 'pi_good_stay',
        },
      ],
    });
    const flightsQuery = makeQuery({ data: [] });

    const tableCalls: string[] = [];
    testState.supabase.from.mockImplementation((table: string) => {
      tableCalls.push(table);
      if (table === 'api_credit_status') return creditsQuery;
      if (table === 'ai_daily_costs') return aiDailyQuery;
      if (table === 'api_daily_usage') return apiDailyQuery;
      if (table === 'all_daily_costs') return allDailyQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/billing'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tableCalls).not.toContain('stripe_revenue_summary');
    expect(body.summary).toMatchObject({
      aiCostToday: 3.25,
      aiCostMonth: 15,
      apiCostMonth: 20,
      totalCostMonth: 35,
      revenueMonth: 1000,
      grossBookingValueMonth: 2000,
      capturedPaymentsMonth: 1700,
      revenueSource: 'canonical_bookings',
    });
    expect(body.summary.bookings).toMatchObject({
      total: 3,
      confirmed: 2,
      pending: 1,
      paymentPaid: 2,
      paymentPending: 1,
      providerConfirmed: 1,
      providerPending: 1,
      providerFailed: 1,
      issues: 2,
      reconciled: 1,
    });
    expect(body.bookingRevenue).toHaveLength(3);
    expect(body.stripeRevenue).toEqual([]);
    expect(accommodationsQuery.in).toHaveBeenCalledWith('stripe_payment_intent_id', [
      'pi_good_stay',
      'pi_provider_failed',
    ]);
  });
});

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    booking_type: 'hotel',
    provider: 'liteapi',
    amount: 1000,
    currency: 'USD',
    status: 'confirmed',
    paid_at: '2026-06-20T10:01:00Z',
    created_at: '2026-06-20T10:00:00Z',
    stripe_payment_intent_id: 'pi_test',
    booking_reference: null,
    external_reference: null,
    financial_metadata: { source_surface: 'web' },
    ...overrides,
  };
}
