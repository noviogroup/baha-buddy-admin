import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/user-detail/route';

type QueryResult = { data?: unknown; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    in: vi.fn(() => query),
    single: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result.data ?? [], error: result.error ?? null }).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/user-detail revenue', () => {
  test('returns traveler revenue and booking rows from reconciled booking state', async () => {
    const userQuery = makeQuery({
      data: {
        id: 'user-1',
        display_name: 'Traveler',
        email: 'traveler@example.com',
      },
    });
    const tripsQuery = makeQuery({ data: [] });
    const bookingsQuery = makeQuery({
      data: [
        {
          id: 'good-stay',
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          amount: 1100,
          status: 'confirmed',
          paid_at: '2026-06-20T10:00:00Z',
          stripe_payment_intent_id: 'pi_good_stay',
          financial_metadata: { source_surface: 'mobile' },
        },
        {
          id: 'provider-failed-stay',
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          amount: 900,
          status: 'confirmed',
          paid_at: '2026-06-20T10:05:00Z',
          stripe_payment_intent_id: 'pi_failed_stay',
          financial_metadata: { source_surface: 'web', provider_status: 'failed' },
        },
        {
          id: 'refunded-stay',
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          amount: 500,
          status: 'confirmed',
          paid_at: '2026-06-20T10:10:00Z',
          stripe_payment_intent_id: 'pi_refunded_stay',
          financial_metadata: { source_surface: 'mobile' },
        },
      ],
    });
    const threadsQuery = makeQuery({ data: [] });
    const aiUsageQuery = makeQuery({
      data: [
        {
          model: 'claude-sonnet',
          input_tokens: 100,
          output_tokens: 50,
          estimated_cost_usd: 0.25,
          created_at: '2026-06-20T10:00:00Z',
        },
      ],
    });
    const accommodationsQuery = makeQuery({
      data: [
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
      ],
    });
    const flightsQuery = makeQuery({ data: [] });

    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'users') return userQuery;
      if (table === 'trips') return tripsQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'chat_threads') return threadsQuery;
      if (table === 'ai_usage_log') return aiUsageQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/user-detail?id=user-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.revenue).toBe(1100);
    expect(byId(body.bookings, 'good-stay')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'confirmed',
      provider_reference: 'LITE-GOOD-1',
      failure_state: 'none',
      reconciled: true,
    });
    expect(byId(body.bookings, 'provider-failed-stay')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'failed',
      failure_state: 'payment_succeeded_provider_failed',
      reconciled: false,
    });
    expect(byId(body.bookings, 'refunded-stay')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'cancelled',
      failure_state: 'refunded',
      reconciled: false,
    });
    expect(accommodationsQuery.in).toHaveBeenCalledWith('stripe_payment_intent_id', [
      'pi_good_stay',
      'pi_failed_stay',
      'pi_refunded_stay',
    ]);
  });
});

function byId(rows: Array<Record<string, unknown>>, id: string) {
  return rows.find((row) => row.id === id);
}
