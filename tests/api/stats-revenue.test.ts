import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/stats/route';

type QueryResult = { data?: unknown; error?: unknown; count?: number };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result.data ?? [], error: result.error ?? null, count: result.count }).then(resolve, reject),
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

describe('GET /api/stats revenue', () => {
  test('uses reconciled booking state for dashboard revenue totals', async () => {
    const bookings = [
      {
        id: 'good-stay',
        amount: 1000,
        status: 'confirmed',
        paid_at: '2026-06-20T10:00:00Z',
        stripe_payment_intent_id: 'pi_good_stay',
        booking_type: 'hotel',
        financial_metadata: { source_surface: 'mobile' },
      },
      {
        id: 'provider-failed-stay',
        amount: 700,
        status: 'confirmed',
        paid_at: '2026-06-20T10:05:00Z',
        stripe_payment_intent_id: 'pi_provider_failed',
        booking_type: 'hotel',
        financial_metadata: { source_surface: 'web', provider_status: 'failed' },
      },
      {
        id: 'refunded-stay',
        amount: 500,
        status: 'confirmed',
        paid_at: '2026-06-20T10:10:00Z',
        stripe_payment_intent_id: 'pi_refunded_stay',
        booking_type: 'hotel',
        financial_metadata: { source_surface: 'mobile' },
      },
    ];
    const accommodationRows = [
      {
        id: 'trip-accommodation-good',
        status: 'booked',
        booking_reference: 'LITE-GOOD-1',
        stripe_payment_intent_id: 'pi_good_stay',
      },
      {
        id: 'trip-accommodation-refunded',
        status: 'refunded',
        booking_reference: 'LITE-REFUND-1',
        stripe_payment_intent_id: 'pi_refunded_stay',
      },
    ];

    let usersCalls = 0;
    let bookingsCalls = 0;
    let aiCalls = 0;
    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCalls += 1;
        return makeQuery({ count: usersCalls === 1 ? 5 : usersCalls === 2 ? 1 : 3 });
      }
      if (table === 'trips') {
        return makeQuery({ data: [{ id: 'trip-1', status: 'booked', islands: ['Nassau'] }] });
      }
      if (table === 'bookings') {
        bookingsCalls += 1;
        return makeQuery({ data: bookings });
      }
      if (table === 'chat_messages') {
        return makeQuery({ count: 20 });
      }
      if (table === 'ai_usage_log') {
        aiCalls += 1;
        return makeQuery({ data: [{ estimated_cost_usd: aiCalls === 1 ? 1.25 : 12.5 }] });
      }
      if (table === 'trip_accommodations') {
        return makeQuery({ data: accommodationRows });
      }
      if (table === 'trip_flights') {
        return makeQuery({ data: [] });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/stats'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      totalUsers: 5,
      newUsersToday: 1,
      newUsersWeek: 3,
      totalBookings: 3,
      totalRevenue: 1000,
      revenueThisMonth: 1000,
      aiCostToday: 1.25,
      aiCostMonth: 12.5,
      totalMessages: 20,
    });
    expect(bookingsCalls).toBe(2);
  });
});
