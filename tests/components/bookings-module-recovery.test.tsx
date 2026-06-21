import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const testState = vi.hoisted(() => ({
  reload: vi.fn(),
  useApi: vi.fn(),
  apiFetch: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => testState.apiFetch(...args),
}));

import { BookingDetailPanel } from '@/components/booking-detail-panel';
import { BookingsModule } from '@/components/bookings-module';

beforeEach(() => {
  vi.clearAllMocks();
  testState.reload.mockResolvedValue(undefined);
  testState.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  testState.useApi.mockReturnValue({
    data: {
      bookings: [
        booking({
          id: 'paid-provider-failed',
          failure_state: 'payment_succeeded_provider_failed',
          payment_status: 'paid',
          provider_status: 'failed',
          source_surface: 'mobile',
          provider_reference: null,
        }),
        booking({
          id: 'provider-local-failed',
          booking_type: 'flight',
          failure_state: 'provider_succeeded_local_failed',
          payment_status: 'failed',
          provider_status: 'confirmed',
          source_surface: 'web',
          provider_reference: 'LITE-PNR-1',
        }),
        booking({
          id: 'healthy-booking',
          failure_state: 'none',
          payment_status: 'paid',
          provider_status: 'confirmed',
          source_surface: 'web',
          provider_reference: 'LITE-OK-1',
          status: 'confirmed',
        }),
      ],
      summary: {
        total: 3,
        pending: 0,
        confirmed: 2,
        failed: 1,
        grossBookingValue: 2500,
        netRevenue: 310,
        partnerPayouts: 40,
        marginAfterPayout: 270,
      },
    },
    loading: false,
    error: null,
    reload: testState.reload,
  });
});

describe('<BookingsModule /> recovery queue', () => {
  test('surfaces provider/payment support issues above the booking table', () => {
    render(<BookingsModule />);

    const queue = screen.getByLabelText('Booking recovery queue');
    expect(screen.getByRole('heading', { name: /provider and payment recovery queue/i })).toBeInTheDocument();
    expect(within(queue).getByText('2')).toBeInTheDocument();
    expect(within(queue).getByText('2 P0')).toBeInTheDocument();
    expect(within(queue).getByText('Payment captured, provider failed')).toBeInTheDocument();
    expect(within(queue).getByText('Provider confirmed, local save failed')).toBeInTheDocument();
    expect(screen.queryByText(/Do not ask the traveler to book again/i)).not.toBeInTheDocument();
    expect(within(queue).getByText(/mobile/i)).toBeInTheDocument();
    expect(within(queue).getByText(/LITE-PNR-1/i)).toBeInTheDocument();
    expect(screen.getByText('Booking list')).toBeInTheDocument();
  });

  test('opens booking detail with recovery checklist from a support queue item', async () => {
    const user = userEvent.setup();
    render(<BookingsModule />);

    await user.click(within(screen.getByLabelText('Booking recovery queue')).getByText('Payment captured, provider failed'));

    expect(screen.getByRole('heading', { name: /hotel · \$1,200\.00/i })).toBeInTheDocument();
    const checklist = screen.getByLabelText('Booking recovery checklist');
    expect(within(checklist).getByText('Recovery checklist')).toBeInTheDocument();
    expect(within(checklist).getByText('Payment captured, provider failed')).toBeInTheDocument();
    expect(within(checklist).getByText(/Do not ask the traveler to book again/i)).toBeInTheDocument();
    expect(within(checklist).getByText('Confirm Stripe payment intent and amount.')).toBeInTheDocument();
    expect(within(checklist).getByText('Check LiteAPI/provider booking state and any provider payload.')).toBeInTheDocument();
  });
});

describe('<BookingDetailPanel /> recovery controls', () => {
  test('status updates keep existing PATCH behavior and reload after success', async () => {
    const user = userEvent.setup();
    render(
      <BookingDetailPanel
        booking={booking({ id: 'provider-pending', failure_state: 'provider_pending', provider_status: 'pending' })}
        onClose={vi.fn()}
        onChanged={testState.reload}
      />,
    );

    const checklist = screen.getByLabelText('Booking recovery checklist');
    expect(within(checklist).getByText('Provider pending')).toBeInTheDocument();
    expect(within(checklist).getByText(/Check provider status before retrying/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirmed/i }));

    await waitFor(() => {
      expect(testState.apiFetch).toHaveBeenCalledWith('/api/bookings', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'provider-pending', status: 'confirmed' }),
      });
    });
    expect(testState.reload).toHaveBeenCalled();
  });
});

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    booking_type: 'hotel',
    provider: 'liteapi',
    amount: 1200,
    gross_booking_value: 1200,
    net_revenue: 150,
    partner_payout_amount: 40,
    gross_margin_after_payout: 110,
    payout_status: 'pending',
    partner_name: null,
    currency: 'USD',
    status: 'confirmed',
    created_at: '2026-06-19T00:00:00Z',
    updated_at: '2026-06-19T00:00:00Z',
    stripe_payment_intent_id: 'pi_test_123',
    reference_id: 'ref-123',
    paid_at: '2026-06-19T00:01:00Z',
    provider_reference: null,
    source_surface: 'web',
    payment_status: 'paid',
    provider_status: 'confirmed',
    failure_state: 'none',
    ...overrides,
  };
}
