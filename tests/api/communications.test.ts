import { beforeEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  admin: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
  logAudit: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({
  withAdminAuth: (handler: any) =>
    (request: Request) => handler(request, { supabase: testState.supabase, admin: testState.admin }),
}));

vi.mock('@/lib/audit-log', () => ({
  logAudit: (...args: unknown[]) => testState.logAudit(...args),
}));

import { GET, POST } from '@/app/api/communications/route';

type QueryResult = { data: unknown; error: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    contains: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.INTERNAL_API_SECRET = 'internal-secret';
});

describe('/api/communications', () => {
  test('GET returns events with delivery summary and resend eligibility', async () => {
    const events = [
      communicationEvent({ id: 'event-1', type: 'booking_confirmed', status: 'failed' }),
      communicationEvent({ id: 'event-2', type: 'buddy_message', status: 'sent' }),
    ];
    const deliveries = [
      communicationDelivery({ id: 'delivery-1', event_id: 'event-1', channel: 'email', status: 'failed' }),
      communicationDelivery({ id: 'delivery-2', event_id: 'event-1', channel: 'push', status: 'sent' }),
      communicationDelivery({ id: 'delivery-3', event_id: 'event-2', channel: 'in_app', status: 'sent' }),
    ];
    const users = [{ id: 'user-1', display_name: 'Traveler One', email: 'traveler@example.com' }];

    const eventQuery = makeQuery({ data: events, error: null });
    const deliveryQuery = makeQuery({ data: deliveries, error: null });
    const usersQuery = makeQuery({ data: users, error: null });
    testState.supabase.from
      .mockReturnValueOnce(eventQuery)
      .mockReturnValueOnce(deliveryQuery)
      .mockReturnValueOnce(usersQuery);

    const response = await GET(new Request('http://localhost.test/api/communications?limit=25'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(eventQuery.limit).toHaveBeenCalledWith(25);
    expect(body.summary).toMatchObject({
      total: 2,
      sent: 1,
      failed: 1,
      emailFailures: 1,
    });
    expect(body.events[0]).toMatchObject({
      id: 'event-1',
      can_resend_email: true,
      user: { display_name: 'Traveler One' },
    });
    expect(body.events[1]).toMatchObject({
      id: 'event-2',
      can_resend_email: false,
    });
  });

  test('POST resends safe failed transactional emails through internal function and audits it', async () => {
    const event = communicationEvent({ id: 'event-1', type: 'booking_confirmed', status: 'failed' });
    const deliveries = [
      communicationDelivery({ id: 'delivery-1', event_id: 'event-1', channel: 'email', status: 'failed' }),
    ];

    const eventQuery = makeQuery({ data: event, error: null });
    const deliveryQuery = makeQuery({ data: deliveries, error: null });
    testState.supabase.from
      .mockReturnValueOnce(eventQuery)
      .mockReturnValueOnce(deliveryQuery);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ event_id: 'resent-event-1', status: 'sent' }), { status: 200 }),
    );
    testState.logAudit.mockResolvedValue({ id: 'audit-1' });

    const response = await POST(new Request('http://localhost.test/api/communications', {
      method: 'POST',
      body: JSON.stringify({ event_id: 'event-1' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/send-communication',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'service-role',
          Authorization: 'Bearer service-role',
          'x-internal-secret': 'internal-secret',
        }),
      }),
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({
      user_id: 'user-1',
      type: 'booking_confirmed',
      channels: ['email'],
    });
    expect(testState.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'email_resent',
      entityType: 'communication_event',
      entityId: 'event-1',
      metadata: expect.objectContaining({
        original_event_id: 'event-1',
        resent_event_id: 'resent-event-1',
        channels: ['email'],
      }),
    }));

    fetchSpy.mockRestore();
  });
});

function communicationEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    user_id: 'user-1',
    type: 'booking_confirmed',
    category: 'booking_updates',
    title: 'Booking confirmed',
    body: 'Your booking is confirmed.',
    route: '/profile/bookings',
    payload: { booking_id: 'booking-1' },
    idempotency_key: 'booking_confirmed:pi_123',
    status: 'sent',
    created_at: '2026-06-21T08:00:00Z',
    updated_at: '2026-06-21T08:00:00Z',
    ...overrides,
  };
}

function communicationDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'delivery-1',
    event_id: 'event-1',
    user_id: 'user-1',
    channel: 'email',
    status: 'sent',
    provider: 'resend',
    provider_message_id: 'email-1',
    target: 'traveler@example.com',
    error: null,
    attempted_at: '2026-06-21T08:00:00Z',
    created_at: '2026-06-21T08:00:00Z',
    ...overrides,
  };
}
