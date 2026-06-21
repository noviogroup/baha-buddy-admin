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
          island: 'Nassau / Paradise Island',
          photo_url: 'https://example.com/grand-hyatt.jpg',
          address: 'One Baha Mar Boulevard, Nassau',
          description: 'Large Cable Beach resort with pools, restaurants, casino access, and family-friendly amenities.',
          property_type: 'Resort',
          gallery_images: [
            'https://example.com/grand-hyatt.jpg',
            'https://example.com/grand-hyatt-pool.jpg',
          ],
          amenities: ['Beachfront', 'Pool', 'Spa', 'Casino'],
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
      island: 'Nassau / Paradise Island',
      photo_url: 'https://example.com/grand-hyatt.jpg',
      address: 'One Baha Mar Boulevard, Nassau',
      description: 'Large Cable Beach resort with pools, restaurants, casino access, and family-friendly amenities.',
      property_type: 'Resort',
      gallery_images: [
        'https://example.com/grand-hyatt.jpg',
        'https://example.com/grand-hyatt-pool.jpg',
      ],
      amenities: ['Beachfront', 'Pool', 'Spa', 'Casino'],
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

  test('uses reconciled booking state for trip-detail budget and recovery fields', async () => {
    const tripQuery = makeSingleQuery({
      data: {
        id: 'trip-1',
        user_id: 'user-1',
        name: 'Booked Bahamas trip',
        status: 'booked',
        budget_estimate: 1400,
        users: { display_name: 'Traveler', email: 'traveler@example.com' },
      },
      error: null,
    });
    const bookingsQuery = makeListQuery({
      data: [
        {
          id: 'good-stay',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          provider: 'liteapi',
          status: 'confirmed',
          amount: 1200,
          currency: 'USD',
          paid_at: '2026-06-17T10:00:00Z',
          stripe_payment_intent_id: 'pi_good_stay',
          financial_metadata: { source_surface: 'mobile' },
        },
        {
          id: 'good-flight',
          trip_id: 'trip-1',
          booking_type: 'flight',
          provider: 'liteapi',
          status: 'confirmed',
          amount: 350,
          currency: 'USD',
          paid_at: '2026-06-17T10:10:00Z',
          stripe_payment_intent_id: 'pi_good_flight',
          financial_metadata: { source_surface: 'web' },
        },
        {
          id: 'stale-refunded-stay',
          trip_id: 'trip-1',
          booking_type: 'hotel',
          provider: 'liteapi',
          status: 'confirmed',
          amount: 900,
          currency: 'USD',
          paid_at: '2026-06-17T10:20:00Z',
          stripe_payment_intent_id: 'pi_refunded_stay',
          financial_metadata: { source_surface: 'mobile' },
        },
        {
          id: 'provider-pending-flight',
          trip_id: 'trip-1',
          booking_type: 'flight',
          provider: 'liteapi',
          status: 'confirmed',
          amount: 500,
          currency: 'USD',
          paid_at: '2026-06-17T10:30:00Z',
          stripe_payment_intent_id: 'pi_pending_flight',
          financial_metadata: { source_surface: 'web' },
        },
        {
          id: 'local-failed-flight',
          trip_id: 'trip-1',
          booking_type: 'flight',
          provider: 'liteapi',
          status: 'failed',
          amount: 280,
          currency: 'USD',
          stripe_payment_intent_id: 'pi_local_failed_flight',
          financial_metadata: { source_surface: 'web' },
        },
      ],
      error: null,
    });
    const threadsQuery = makeListQuery({ data: [], error: null });
    const collaboratorsQuery = makeListQuery({ data: [], error: null });
    const accommodationsQuery = makeListQuery({
      data: [
        {
          id: 'trip-accommodation-good',
          trip_id: 'trip-1',
          name: 'Grand Hyatt Baha Mar',
          status: 'booked',
          booking_reference: 'LITE-STAY-CONF-1',
          stripe_payment_intent_id: 'pi_good_stay',
        },
        {
          id: 'trip-accommodation-refunded',
          trip_id: 'trip-1',
          name: 'Goldwynn Resort',
          status: 'refunded',
          booking_reference: 'LITE-STAY-REFUND-1',
          stripe_payment_intent_id: 'pi_refunded_stay',
        },
      ],
      error: null,
    });
    const flightsQuery = makeListQuery({
      data: [
        {
          id: 'trip-flight-good',
          trip_id: 'trip-1',
          booking_reference: 'LITE-FLIGHT-CONF-1',
          stripe_payment_intent_id: 'pi_good_flight',
        },
        {
          id: 'trip-flight-pending',
          trip_id: 'trip-1',
          booking_reference: null,
          stripe_payment_intent_id: 'pi_pending_flight',
        },
        {
          id: 'trip-flight-local-failed',
          trip_id: 'trip-1',
          booking_reference: 'LITE-FLIGHT-CONF-2',
          stripe_payment_intent_id: 'pi_local_failed_flight',
        },
      ],
      error: null,
    });
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
    expect(body.budget).toMatchObject({
      byCategory: {
        accommodation: 1200,
        flight: 350,
        activity: 0,
        other: 0,
      },
      totalSpent: 1550,
      estimate: 1400,
      delta: 150,
    });
    expect(byId(body.bookings, 'good-stay')).toMatchObject({
      source_surface: 'mobile',
      payment_status: 'paid',
      provider_status: 'confirmed',
      provider_reference: 'LITE-STAY-CONF-1',
      trip_item_id: 'trip-accommodation-good',
      trip_item_type: 'accommodation',
      trip_item_status: 'booked',
      failure_state: 'none',
      reconciled: true,
    });
    expect(byId(body.bookings, 'good-flight')).toMatchObject({
      source_surface: 'web',
      payment_status: 'paid',
      provider_status: 'confirmed',
      provider_reference: 'LITE-FLIGHT-CONF-1',
      trip_item_id: 'trip-flight-good',
      trip_item_type: 'flight',
      trip_item_status: null,
      failure_state: 'none',
      reconciled: true,
    });
    expect(byId(body.bookings, 'stale-refunded-stay')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'cancelled',
      provider_reference: 'LITE-STAY-REFUND-1',
      trip_item_id: 'trip-accommodation-refunded',
      trip_item_status: 'refunded',
      failure_state: 'refunded',
      reconciled: false,
    });
    expect(byId(body.bookings, 'provider-pending-flight')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'pending',
      provider_reference: null,
      trip_item_id: 'trip-flight-pending',
      failure_state: 'provider_pending',
      reconciled: false,
    });
    expect(byId(body.bookings, 'local-failed-flight')).toMatchObject({
      payment_status: 'failed',
      provider_status: 'confirmed',
      provider_reference: 'LITE-FLIGHT-CONF-2',
      trip_item_id: 'trip-flight-local-failed',
      failure_state: 'provider_succeeded_local_failed',
      reconciled: false,
    });
  });
});

function byId(rows: Array<Record<string, unknown>>, id: string) {
  return rows.find((row) => row.id === id);
}
