import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/payments/route';

type QueryResult = { data: unknown; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
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

describe('GET /api/payments canonical booking source', () => {
  test('reads canonical bookings and enriches payment, provider, source, and failure state', async () => {
    const bookingRows = [
      booking({
        id: 'good-stay',
        booking_type: 'hotel',
        amount: 1000,
        stripe_payment_intent_id: 'pi_good_stay',
        financial_metadata: { source_surface: 'mobile' },
      }),
      booking({
        id: 'provider-failed',
        booking_type: 'hotel',
        amount: 700,
        stripe_payment_intent_id: 'pi_provider_failed',
        financial_metadata: { source_surface: 'web', provider_status: 'failed' },
      }),
      booking({
        id: 'good-flight',
        booking_type: 'flight',
        amount: 300,
        stripe_payment_intent_id: 'pi_good_flight',
        financial_metadata: { source_surface: 'web' },
      }),
      booking({
        id: 'abandoned',
        booking_type: 'hotel',
        amount: 0,
        status: 'pending',
        paid_at: null,
        stripe_payment_intent_id: null,
        financial_metadata: { source_surface: 'chat' },
      }),
      booking({
        id: 'refunded',
        booking_type: 'hotel',
        amount: 500,
        status: 'refunded',
        booking_reference: 'REF-1',
        stripe_payment_intent_id: 'pi_refund',
        financial_metadata: { source_surface: 'concierge' },
      }),
    ];
    const bookingsQuery = makeQuery({ data: bookingRows });
    const accommodationsQuery = makeQuery({
      data: [
        {
          id: 'trip-accommodation-good',
          name: 'Ocean Club',
          status: 'booked',
          booking_reference: 'LITE-STAY-1',
          stripe_payment_intent_id: 'pi_good_stay',
        },
        {
          id: 'trip-accommodation-refund',
          name: 'Refunded Stay',
          status: 'refunded',
          booking_reference: 'REF-1',
          stripe_payment_intent_id: 'pi_refund',
        },
      ],
    });
    const flightsQuery = makeQuery({
      data: [
        {
          id: 'trip-flight-good',
          booking_reference: 'LITE-FLIGHT-1',
          stripe_payment_intent_id: 'pi_good_flight',
        },
      ],
    });

    const tableCalls: string[] = [];
    testState.supabase.from.mockImplementation((table: string) => {
      tableCalls.push(table);
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/payments?limit=50'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tableCalls).toEqual(['bookings', 'trip_accommodations', 'trip_flights']);
    expect(tableCalls).not.toContain('concierge_orders');
    expect(body.payments).toHaveLength(5);
    expect(byId(body.payments, 'good-stay')).toMatchObject({
      booking_type: 'hotel',
      payment_status: 'paid',
      provider_status: 'confirmed',
      source_surface: 'mobile',
      provider_reference: 'LITE-STAY-1',
      failure_state: 'none',
      reconciled: true,
      trip_item_name: 'Ocean Club',
    });
    expect(byId(body.payments, 'provider-failed')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'failed',
      source_surface: 'web',
      failure_state: 'payment_succeeded_provider_failed',
      reconciled: false,
    });
    expect(byId(body.payments, 'good-flight')).toMatchObject({
      booking_type: 'flight',
      payment_status: 'paid',
      provider_status: 'confirmed',
      source_surface: 'web',
      provider_reference: 'LITE-FLIGHT-1',
      reconciled: true,
    });
    expect(byId(body.payments, 'abandoned')).toMatchObject({
      payment_status: 'pending',
      provider_status: 'pending',
      source_surface: 'chat',
      failure_state: 'abandoned_checkout',
    });
    expect(byId(body.payments, 'refunded')).toMatchObject({
      payment_status: 'refunded',
      provider_status: 'cancelled',
      source_surface: 'concierge',
      failure_state: 'refunded',
    });
    expect(body.summary).toMatchObject({
      total: 5,
      paidRevenue: 1300,
      capturedAmount: 2000,
      refundedRevenue: 500,
      paid: 3,
      pending: 1,
      refunded: 1,
      provider_confirmed: 2,
      provider_failed: 1,
      issues: 3,
      reconciled: 2,
    });
    expect(body.bySource).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'web', count: 2, revenue: 300, captured: 1000 }),
      expect.objectContaining({ label: 'mobile', count: 1, revenue: 1000, captured: 1000 }),
    ]));
  });

  test('keeps existing offer_type filter compatible while filtering derived source and payment state', async () => {
    const bookingsQuery = makeQuery({
      data: [
        booking({
          id: 'web-hotel-paid',
          booking_type: 'hotel',
          amount: 800,
          stripe_payment_intent_id: 'pi_web_hotel',
          financial_metadata: { source_surface: 'web' },
        }),
        booking({
          id: 'mobile-hotel-paid',
          booking_type: 'hotel',
          amount: 900,
          stripe_payment_intent_id: 'pi_mobile_hotel',
          financial_metadata: { source_surface: 'mobile' },
        }),
      ],
    });
    const accommodationsQuery = makeQuery({ data: [] });
    const flightsQuery = makeQuery({ data: [] });
    testState.supabase.from.mockImplementation((table: string) => {
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/payments?payment_status=paid&source=web&offer_type=hotel&limit=10'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(bookingsQuery.eq).toHaveBeenCalledWith('booking_type', 'hotel');
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({
      id: 'web-hotel-paid',
      booking_type: 'hotel',
      source_surface: 'web',
      payment_status: 'paid',
    });
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
    updated_at: '2026-06-20T10:02:00Z',
    stripe_payment_intent_id: 'pi_test',
    booking_reference: null,
    external_reference: null,
    financial_metadata: { source_surface: 'web' },
    ...overrides,
  };
}

function byId(rows: Array<Record<string, unknown>>, id: string) {
  const row = rows.find(item => item.id === id);
  expect(row).toBeTruthy();
  return row;
}
