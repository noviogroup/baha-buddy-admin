import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const testState = vi.hoisted(() => ({
  reload: vi.fn(),
  useApi: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

import { SupportModule } from '@/components/admin-core-modules';

beforeEach(() => {
  vi.clearAllMocks();
  testState.reload.mockResolvedValue(undefined);
  testState.useApi.mockReturnValue({
    data: {
      tickets: [
        {
          id: 'ticket-1',
          user_id: 'user-ticket',
          subject: 'Need help with my stay',
          status: 'open',
          created_at: '2026-06-20T10:00:00Z',
          users: { display_name: 'Traveler One', email: 'traveler@example.com' },
          support_messages: [{ id: 'message-1' }, { id: 'message-2' }],
        },
      ],
      bookingIssues: [
        bookingIssue({
          id: 'paid-provider-failed',
          trip_item_name: 'Ocean Club',
          amount: 1200,
          payment_status: 'paid',
          provider_status: 'failed',
          source_surface: 'mobile',
          failure_state: 'payment_succeeded_provider_failed',
          recovery: {
            label: 'Payment captured, provider failed',
            priority: 'P0',
            tone: 'danger',
            summary: 'Traveler money appears captured while the provider booking failed or has no usable confirmation.',
            nextAction: 'Do not ask the traveler to book again. Verify Stripe, check provider state, then decide refund or manual recovery.',
            checklist: [],
          },
        }),
      ],
      summary: {
        tickets: 1,
        openTickets: 1,
        inProgressTickets: 0,
        resolvedTickets: 0,
        canonicalBookingsReviewed: 5,
        bookingIssues: 1,
        p0BookingIssues: 1,
        paymentCapturedProviderFailed: 1,
      },
    },
    loading: false,
    error: null,
    reload: testState.reload,
  });
});

describe('<SupportModule /> canonical booking issues', () => {
  test('renders booking recovery issues before support tickets', () => {
    render(<SupportModule />);

    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByText('Booking issues')).toBeInTheDocument();
    expect(screen.getByText('P0 booking issues')).toBeInTheDocument();
    expect(screen.getByText('5 canonical rows reviewed')).toBeInTheDocument();

    const recoveryQueue = screen.getByLabelText('Support booking recovery queue');
    expect(within(recoveryQueue).getByRole('heading', { name: 'Provider and payment issues' })).toBeInTheDocument();
    expect(within(recoveryQueue).getByText('Ocean Club')).toBeInTheDocument();
    expect(within(recoveryQueue).getByText('Payment: paid')).toBeInTheDocument();
    expect(within(recoveryQueue).getByText('Provider: failed')).toBeInTheDocument();
    expect(within(recoveryQueue).getByText('Payment captured, provider failed')).toBeInTheDocument();
    expect(within(recoveryQueue).getByText(/Do not ask the traveler to book again/i)).toBeInTheDocument();
    expect(within(recoveryQueue).getByText(/liteapi · mobile · \$1,200\.00/i)).toBeInTheDocument();

    expect(screen.getByText('Need help with my stay')).toBeInTheDocument();
    expect(screen.getByText('Traveler One')).toBeInTheDocument();
  });
});

function bookingIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    booking_type: 'hotel',
    provider: 'liteapi',
    amount: 1000,
    currency: 'USD',
    status: 'confirmed',
    payment_status: 'paid',
    provider_status: 'confirmed',
    source_surface: 'web',
    provider_reference: 'LITE-OK-1',
    stripe_payment_intent_id: 'pi_test_123',
    trip_item_id: 'trip-item-1',
    trip_item_type: 'accommodation',
    trip_item_name: 'Booking item',
    failure_state: 'none',
    reconciled: false,
    recovery: {
      label: 'No support action',
      priority: 'Done',
      tone: 'success',
      summary: 'No issue.',
      nextAction: 'Monitor normally.',
      checklist: [],
    },
    created_at: '2026-06-20T10:00:00Z',
    ...overrides,
  };
}
