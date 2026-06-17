import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/trip-detail/route';

type QueryResult = { data: unknown; error: unknown };

function makeSingleQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
  };
  return query;
}

function makeListQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/trip-detail accommodation identity', () => {
  test('returns canonical mobile stay fields for admin trip detail', async () => {
    const tripQuery = makeSingleQuery({
      data: {
        id: 'trip-1',
        user_id: 'user-1',
        name: 'Nassau weekend',
        status: 'planned',
        budget_estimate: 1200,
        users: { display_name: 'Traveler', email: 'traveler@example.com' },
      },
      error: null,
    });
    const bookingsQuery = makeListQuery({ data: [], error: null });
    const threadsQuery = makeListQuery({ data: [], error: null });
    const collaboratorsQuery = makeListQuery({ data: [], error: null });
    const accommodationsQuery = makeListQuery({
      data: [
        {
          id: 'trip-accommodation-1',
          trip_id: 'trip-1',
          place_id: 'place-grand-hyatt-baha-mar',
          liteapi_hotel_id: 'lite-hotel-123',
          liteapi_rate_id: 'rate-456',
          liteapi_prebook_id: 'prebook-789',
          name: 'Grand Hyatt Baha Mar',
          check_in: '2026-07-10',
          check_out: '2026-07-13',
          price_per_night: 420,
          total_price: 1260,
          currency: 'USD',
          nights: 3,
          guests: 2,
          booking_reference: 'LITE-CONF-001',
          stripe_payment_intent_id: 'pi_mobile_hotel_123',
          status: 'confirmed',
        },
      ],
      error: null,
    });
    const flightsQuery = makeListQuery({ data: [], error: null });
    const activitiesQuery = makeListQuery({ data: [], error: null });

    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'trips') return tripQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'chat_threads') return threadsQuery;
      if (table === 'trip_collaborators') return collaboratorsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      if (table === 'trip_activities') return activitiesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/trip-detail?id=trip-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(accommodationsQuery.select).toHaveBeenCalledWith('*');
    expect(accommodationsQuery.eq).toHaveBeenCalledWith('trip_id', 'trip-1');
    expect(body.accommodations[0]).toMatchObject({
      id: 'trip-accommodation-1',
      place_id: 'place-grand-hyatt-baha-mar',
      liteapi_hotel_id: 'lite-hotel-123',
      liteapi_rate_id: 'rate-456',
      liteapi_prebook_id: 'prebook-789',
      booking_reference: 'LITE-CONF-001',
      stripe_payment_intent_id: 'pi_mobile_hotel_123',
      total_price: 1260,
      currency: 'USD',
      status: 'confirmed',
    });
    expect(body.tablesStatus.accommodations).toBe(true);
  });

  test('returns canonical activity identity for admin itinerary support', async () => {
    const tripQuery = makeSingleQuery({
      data: {
        id: 'trip-1',
        user_id: 'user-1',
        name: 'Exuma adventure',
        status: 'planned',
        budget_estimate: 900,
        users: { display_name: 'Traveler', email: 'traveler@example.com' },
      },
      error: null,
    });
    const bookingsQuery = makeListQuery({ data: [], error: null });
    const threadsQuery = makeListQuery({ data: [], error: null });
    const collaboratorsQuery = makeListQuery({ data: [], error: null });
    const accommodationsQuery = makeListQuery({ data: [], error: null });
    const flightsQuery = makeListQuery({ data: [], error: null });
    const activitiesQuery = makeListQuery({
      data: [
        {
          id: 'trip-activity-1',
          trip_id: 'trip-1',
          day_number: 2,
          time_slot: 'afternoon',
          activity_name: 'Exuma Cays snorkeling',
          activity_type: 'activity',
          place_id: 'google-place-1',
          source_type: 'viator',
          source_id: 'VTR-EXUMA-1',
          provider: 'viator',
          provider_activity_id: 'VTR-EXUMA-1',
          image_url: 'https://example.com/exuma.jpg',
          price: 149.5,
          currency: 'USD',
          metadata: { rating: 4.9 },
          notes: 'Bring reef-safe sunscreen',
          sort_order: 0,
        },
      ],
      error: null,
    });

    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'trips') return tripQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'chat_threads') return threadsQuery;
      if (table === 'trip_collaborators') return collaboratorsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      if (table === 'trip_activities') return activitiesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/trip-detail?id=trip-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(activitiesQuery.select).toHaveBeenCalledWith('*');
    expect(activitiesQuery.eq).toHaveBeenCalledWith('trip_id', 'trip-1');
    expect(body.activities[0]).toMatchObject({
      id: 'trip-activity-1',
      activity_name: 'Exuma Cays snorkeling',
      source_type: 'viator',
      source_id: 'VTR-EXUMA-1',
      provider: 'viator',
      provider_activity_id: 'VTR-EXUMA-1',
      image_url: 'https://example.com/exuma.jpg',
      price: 149.5,
      currency: 'USD',
    });
    expect(body.tablesStatus.activities).toBe(true);
  });
});
