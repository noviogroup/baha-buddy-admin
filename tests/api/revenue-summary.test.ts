import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/revenue/summary/route';

type QueryResult = { data: unknown; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ ...result, error: result.error ?? null }).then(resolve, reject),
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

describe('GET /api/revenue/summary', () => {
  test('recognizes revenue only from reconciled booking, provider, payment, and trip item state', async () => {
    const bookingsQuery = makeQuery({
      data: [
        {
          id: 'good-stay',
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          provider: 'liteapi',
          amount: 1200,
          currency: 'USD',
          status: 'confirmed',
          created_at: '2026-06-20T10:00:00Z',
          paid_at: '2026-06-20T10:01:00Z',
          stripe_payment_intent_id: 'pi_good_stay',
          financial_metadata: { source_surface: 'mobile' },
        },
        {
          id: 'good-flight',
          user_id: 'user-2',
          trip_id: 'trip-1',
          booking_type: 'flight',
          provider: 'liteapi',
          amount: 350,
          currency: 'USD',
          status: 'confirmed',
          created_at: '2026-06-20T10:05:00Z',
          paid_at: '2026-06-20T10:06:00Z',
          stripe_payment_intent_id: 'pi_good_flight',
          financial_metadata: { source_surface: 'web' },
        },
        {
          id: 'provider-failed',
          user_id: 'user-3',
          trip_id: 'trip-2',
          booking_type: 'hotel',
          provider: 'liteapi',
          amount: 900,
          currency: 'USD',
          status: 'confirmed',
          created_at: '2026-06-20T10:10:00Z',
          paid_at: '2026-06-20T10:11:00Z',
          stripe_payment_intent_id: 'pi_provider_failed',
          financial_metadata: { source_surface: 'web', provider_status: 'failed' },
        },
        {
          id: 'refunded-stay',
          user_id: 'user-4',
          trip_id: 'trip-3',
          booking_type: 'hotel',
          provider: 'liteapi',
          amount: 800,
          currency: 'USD',
          status: 'confirmed',
          created_at: '2026-06-20T10:20:00Z',
          paid_at: '2026-06-20T10:21:00Z',
          stripe_payment_intent_id: 'pi_refunded_stay',
          financial_metadata: { source_surface: 'mobile' },
        },
        {
          id: 'provider-pending-flight',
          user_id: 'user-5',
          trip_id: 'trip-4',
          booking_type: 'flight',
          provider: 'liteapi',
          amount: 400,
          currency: 'USD',
          status: 'confirmed',
          created_at: '2026-06-20T10:30:00Z',
          paid_at: '2026-06-20T10:31:00Z',
          stripe_payment_intent_id: 'pi_pending_flight',
          financial_metadata: { source_surface: 'web' },
        },
      ],
    });
    const accommodationsQuery = makeQuery({
      data: [
        {
          id: 'trip-accommodation-good',
          status: 'booked',
          booking_reference: 'LITE-STAY-CONF-1',
          stripe_payment_intent_id: 'pi_good_stay',
        },
        {
          id: 'trip-accommodation-refunded',
          status: 'refunded',
          booking_reference: 'LITE-STAY-REFUND-1',
          stripe_payment_intent_id: 'pi_refunded_stay',
        },
      ],
    });
    const flightsQuery = makeQuery({
      data: [
        {
          id: 'trip-flight-good',
          booking_reference: 'LITE-FLIGHT-CONF-1',
          stripe_payment_intent_id: 'pi_good_flight',
        },
        {
          id: 'trip-flight-pending',
          booking_reference: null,
          stripe_payment_intent_id: 'pi_pending_flight',
        },
      ],
    });
    const aiQuery = makeQuery({
      data: [
        {
          id: 'usage-1',
          user_id: 'user-1',
          thread_id: 'thread-1',
          model: 'claude-sonnet',
          estimated_cost_usd: 50,
          created_at: '2026-06-20T12:00:00Z',
        },
      ],
    });

    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      if (table === 'ai_usage_log') return aiQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/revenue/summary'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      revenueToday: 1550,
      revenueThisMonth: 1550,
      grossBookingValue: 3650,
      capturedPayments: 3650,
      estimatedNetRevenue: 1500,
      aiCostToday: 50,
      aiCostMonth: 50,
      revenuePerUser: 775,
      totalBookings: 5,
      confirmedBookings: 5,
      paymentPaid: 5,
      providerConfirmed: 2,
      providerPending: 1,
      providerFailed: 1,
      bookingIssues: 3,
      p0BookingIssues: 1,
      paidUsers: 2,
      revenueSource: 'canonical_bookings',
    });
    expect(body.breakdowns.byCategory).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'hotel', count: 3, gross: 2900, captured: 2900, paid: 1200, issues: 2 }),
      expect.objectContaining({ label: 'flight', count: 2, gross: 750, captured: 750, paid: 350, issues: 1 }),
    ]));
    expect(body.breakdowns.byProvider).toEqual([
      expect.objectContaining({ label: 'liteapi', count: 5, gross: 3650, captured: 3650, paid: 1550, issues: 3 }),
    ]);
    expect(body.breakdowns.bySource).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'web', count: 3, gross: 1650, captured: 1650, paid: 350, issues: 2 }),
      expect.objectContaining({ label: 'mobile', count: 2, gross: 2000, captured: 2000, paid: 1200, issues: 1 }),
    ]));
    expect(body.breakdowns.byProviderStatus).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'confirmed', count: 2, gross: 1550, paid: 1550, issues: 0 }),
      expect.objectContaining({ label: 'failed', count: 1, gross: 900, paid: 0, issues: 1 }),
      expect.objectContaining({ label: 'pending', count: 1, gross: 400, paid: 0, issues: 1 }),
    ]));
    expect(body.breakdowns.byRecoveryState).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'none', count: 2, gross: 1550, paid: 1550, issues: 0 }),
      expect.objectContaining({ label: 'payment_succeeded_provider_failed', count: 1, gross: 900, paid: 0, issues: 1 }),
      expect.objectContaining({ label: 'refunded', count: 1, gross: 800, paid: 0, issues: 1 }),
      expect.objectContaining({ label: 'provider_pending', count: 1, gross: 400, paid: 0, issues: 1 }),
    ]));
    expect(body.statusCounts).toMatchObject({
      payment: { paid: 5 },
      provider: { confirmed: 2, failed: 1, pending: 1, cancelled: 1 },
      recovery: {
        none: 2,
        payment_succeeded_provider_failed: 1,
        refunded: 1,
        provider_pending: 1,
      },
    });
    expect(body.notes).toContain('Revenue is recognized only from canonical booking rows where payment, provider, local booking, and trip item state reconcile.');
    expect(accommodationsQuery.in).toHaveBeenCalledWith('stripe_payment_intent_id', [
      'pi_good_stay',
      'pi_good_flight',
      'pi_provider_failed',
      'pi_refunded_stay',
      'pi_pending_flight',
    ]);
    expect(flightsQuery.in).toHaveBeenCalledWith('stripe_payment_intent_id', [
      'pi_good_stay',
      'pi_good_flight',
      'pi_provider_failed',
      'pi_refunded_stay',
      'pi_pending_flight',
    ]);
  });
});
