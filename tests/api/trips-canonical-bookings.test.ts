import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/trips/route';

type QueryResult = { data: unknown; count?: number | null; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ ...result, error: result.error ?? null }).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/trips canonical booking summaries', () => {
  test('adds canonical booking health summaries to trip rows', async () => {
    const tripsQuery = makeQuery({
      count: 3,
      data: [
        trip({ id: 'trip-healthy', name: 'Nassau weekend' }),
        trip({ id: 'trip-issue', name: 'Exuma booking issue' }),
        trip({ id: 'trip-empty', name: 'Draft Harbour Island' }),
      ],
    });
    const bookingsQuery = makeQuery({
      data: [
        booking({
          id: 'healthy-stay',
          trip_id: 'trip-healthy',
          booking_type: 'hotel',
          amount: 800,
          stripe_payment_intent_id: 'pi_healthy_stay',
          financial_metadata: { source_surface: 'web' },
        }),
        booking({
          id: 'provider-failed',
          trip_id: 'trip-issue',
          booking_type: 'hotel',
          amount: 1200,
          stripe_payment_intent_id: 'pi_provider_failed',
          financial_metadata: { source_surface: 'mobile', provider_status: 'failed' },
        }),
        booking({
          id: 'provider-pending-flight',
          trip_id: 'trip-issue',
          booking_type: 'flight',
          amount: 400,
          stripe_payment_intent_id: 'pi_provider_pending',
          financial_metadata: { source_surface: 'web' },
        }),
      ],
    });
    const accommodationsQuery = makeQuery({
      data: [
        {
          id: 'trip-accommodation-healthy',
          name: 'Ocean Club',
          status: 'booked',
          booking_reference: 'LITE-STAY-1',
          stripe_payment_intent_id: 'pi_healthy_stay',
        },
      ],
    });
    const flightsQuery = makeQuery({ data: [] });

    const tableCalls: string[] = [];
    testState.supabase.from.mockImplementation((table: string) => {
      tableCalls.push(table);
      if (table === 'trips') return tripsQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/trips?limit=25'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tableCalls).toEqual(['trips', 'bookings', 'trip_accommodations', 'trip_flights']);
    expect(tripsQuery.range).toHaveBeenCalledWith(0, 24);
    expect(bookingsQuery.in).toHaveBeenCalledWith('trip_id', ['trip-healthy', 'trip-issue', 'trip-empty']);
    expect(body.summary).toMatchObject({
      trips: 3,
      loaded: 3,
      tripsWithBookings: 2,
      tripsWithBookingIssues: 1,
      recognizedRevenue: 800,
      capturedPayments: 2400,
    });
    expect(byId(body.trips, 'trip-healthy').booking_summary).toMatchObject({
      total: 1,
      issues: 0,
      p0Issues: 0,
      paymentPaid: 1,
      providerConfirmed: 1,
      providerPending: 0,
      recognizedRevenue: 800,
      capturedPayments: 800,
      bookingTypes: ['hotel'],
      providers: ['liteapi'],
      sources: ['web'],
    });
    expect(byId(body.trips, 'trip-issue').booking_summary).toMatchObject({
      total: 2,
      issues: 2,
      p0Issues: 1,
      paymentPaid: 2,
      providerConfirmed: 0,
      providerPending: 1,
      providerFailed: 1,
      recognizedRevenue: 0,
      capturedPayments: 1600,
      bookingTypes: ['flight', 'hotel'],
      sources: ['mobile', 'web'],
    });
    expect(byId(body.trips, 'trip-empty').booking_summary).toMatchObject({
      total: 0,
      issues: 0,
      recognizedRevenue: 0,
      capturedPayments: 0,
      bookingTypes: [],
      sources: [],
    });
  });
});

function byId(rows: any[], id: string) {
  const row = rows.find((candidate) => candidate.id === id);
  expect(row).toBeTruthy();
  return row;
}

function trip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    name: 'Bahamas trip',
    status: 'planned',
    islands: ['Nassau'],
    created_at: '2026-06-20T10:00:00Z',
    users: { display_name: 'Traveler One', email: 'traveler@example.com' },
    ...overrides,
  };
}

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
