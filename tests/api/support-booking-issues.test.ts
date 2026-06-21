import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

import { GET } from '@/app/api/support/route';

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

describe('GET /api/support canonical booking issues', () => {
  test('returns support tickets plus canonical booking recovery queue', async () => {
    const supportQuery = makeQuery({
      data: [
        {
          id: 'ticket-1',
          user_id: 'user-ticket',
          subject: 'Need help with my stay',
          status: 'open',
          created_at: '2026-06-20T10:00:00Z',
          users: { display_name: 'Traveler One', email: 'traveler@example.com' },
          support_messages: [{ id: 'message-1' }],
        },
      ],
    });
    const bookingsQuery = makeQuery({
      data: [
        booking({
          id: 'healthy-stay',
          stripe_payment_intent_id: 'pi_healthy_stay',
          financial_metadata: { source_surface: 'web' },
        }),
        booking({
          id: 'provider-failed',
          stripe_payment_intent_id: 'pi_provider_failed',
          financial_metadata: { source_surface: 'mobile', provider_status: 'failed' },
        }),
        booking({
          id: 'abandoned-checkout',
          status: 'pending',
          paid_at: null,
          stripe_payment_intent_id: null,
          amount: 0,
          financial_metadata: { source_surface: 'chat' },
        }),
        booking({
          id: 'provider-pending',
          booking_type: 'flight',
          stripe_payment_intent_id: 'pi_provider_pending',
          amount: 340,
          financial_metadata: { source_surface: 'web' },
        }),
        booking({
          id: 'refunded-stay',
          status: 'refunded',
          booking_reference: 'REF-1',
          stripe_payment_intent_id: 'pi_refunded',
          financial_metadata: { source_surface: 'concierge' },
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
      if (table === 'support_tickets') return supportQuery;
      if (table === 'bookings') return bookingsQuery;
      if (table === 'trip_accommodations') return accommodationsQuery;
      if (table === 'trip_flights') return flightsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(new Request('http://localhost.test/api/support'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tableCalls).toEqual(['support_tickets', 'bookings', 'trip_accommodations', 'trip_flights']);
    expect(body.tickets).toHaveLength(1);
    expect(body.summary).toMatchObject({
      tickets: 1,
      openTickets: 1,
      bookingIssues: 3,
      allBookingFailureStates: 4,
      p0BookingIssues: 1,
      paymentCapturedProviderFailed: 1,
      abandonedCheckout: 1,
      providerPending: 1,
      refunded: 1,
    });
    expect(body.bookingIssues.map((issue: any) => issue.id)).toEqual([
      'provider-failed',
      'abandoned-checkout',
      'provider-pending',
    ]);
    expect(byId(body.bookingIssues, 'provider-failed')).toMatchObject({
      payment_status: 'paid',
      provider_status: 'failed',
      source_surface: 'mobile',
      failure_state: 'payment_succeeded_provider_failed',
      recovery: {
        label: 'Payment captured, provider failed',
        priority: 'P0',
      },
    });
    expect(byId(body.bookingIssues, 'provider-pending')).toMatchObject({
      booking_type: 'flight',
      payment_status: 'paid',
      provider_status: 'pending',
      source_surface: 'web',
      failure_state: 'provider_pending',
      recovery: {
        label: 'Provider pending',
        priority: 'P1',
      },
    });
    expect(body.bookingIssues.find((issue: any) => issue.id === 'healthy-stay')).toBeUndefined();
    expect(body.bookingIssues.find((issue: any) => issue.id === 'refunded-stay')).toBeUndefined();
  });
});

function byId(rows: any[], id: string) {
  const row = rows.find((candidate) => candidate.id === id);
  expect(row).toBeTruthy();
  return row;
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
    updated_at: '2026-06-20T10:02:00Z',
    stripe_payment_intent_id: 'pi_test',
    booking_reference: null,
    external_reference: null,
    financial_metadata: { source_surface: 'web' },
    ...overrides,
  };
}
