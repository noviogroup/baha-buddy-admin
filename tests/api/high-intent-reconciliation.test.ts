import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/high-intent/route';

type QueryResult = { data?: unknown; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result.data ?? [], error: result.error ?? null }).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/high-intent booking signals', () => {
  test('counts only reconciled bookings as confirmed conversion signals', async () => {
    const usersQuery = makeQuery({
      data: [
        {
          id: 'user-1',
          display_name: 'Traveler',
          email: 'traveler@example.com',
          country: 'US',
          city: 'Miami',
          party_type: 'solo',
          party_size: 1,
          engagement_score: 0,
          onboarding_completed: false,
          home_airport: null,
          created_at: '2026-06-01T10:00:00Z',
          updated_at: '2026-06-20T10:00:00Z',
        },
      ],
    });
    const tripsQuery = makeQuery({ data: [] });
    const threadsQuery = makeQuery({ data: [] });
    const bookingsQuery = makeQuery({
      data: [
        {
          id: 'good-stay',
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          amount: 1000,
          status: 'confirmed',
          paid_at: '2026-06-20T10:00:00Z',
          stripe_payment_intent_id: 'pi_good_stay',
          financial_metadata: { source_surface: 'mobile' },
          created_at: '2026-06-20T10:00:00Z',
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
          created_at: '2026-06-20T10:05:00Z',
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
      ],
    });
    const flightsQuery = makeQuery({ data: [] });

    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'users') return usersQuery;
      if (table === 'trips') return tripsQuery;
      if (table === 'chat_threads') return threadsQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/high-intent'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.total).toBe(1);
    expect(body.leads[0].stats.confirmedBookings).toBe(1);
    expect(body.leads[0].signals).toContain('1 confirmed booking');
    expect(body.leads[0].signals).not.toContain('2 confirmed bookings');
    expect(body.leads[0].score).toBe(20);
    expect(accommodationsQuery.in).toHaveBeenCalledWith('stripe_payment_intent_id', [
      'pi_good_stay',
      'pi_failed_stay',
    ]);
  });
});
