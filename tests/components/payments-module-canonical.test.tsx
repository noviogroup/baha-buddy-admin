import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const testState = vi.hoisted(() => ({
  reload: vi.fn(),
  useApi: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

import { PaymentsModule } from '@/components/payments-module';

beforeEach(() => {
  vi.clearAllMocks();
  testState.reload.mockResolvedValue(undefined);
  testState.useApi.mockReturnValue({
    data: {
      payments: [
        payment({
          id: 'paid-provider-failed',
          booking_type: 'hotel',
          amount: 1200,
          payment_status: 'paid',
          provider_status: 'failed',
          source_surface: 'mobile',
          provider_reference: null,
          failure_state: 'payment_succeeded_provider_failed',
          reconciled: false,
          trip_item_name: 'Ocean Club',
        }),
        payment({
          id: 'healthy-flight',
          booking_type: 'flight',
          amount: 350,
          payment_status: 'paid',
          provider_status: 'confirmed',
          source_surface: 'web',
          provider_reference: 'LITE-FLIGHT-1',
          failure_state: 'none',
          reconciled: true,
          trip_item_name: 'NAS to MIA',
        }),
      ],
      summary: {
        total: 2,
        paidRevenue: 350,
        capturedAmount: 1550,
        refundedRevenue: 0,
        paid: 2,
        reconciled: 1,
        provider_confirmed: 1,
        provider_failed: 1,
        issues: 1,
      },
      byOffer: [
        { label: 'hotel', count: 1, revenue: 0, captured: 1200 },
        { label: 'flight', count: 1, revenue: 350, captured: 350 },
      ],
      bySource: [
        { label: 'mobile', count: 1, revenue: 0, captured: 1200 },
        { label: 'web', count: 1, revenue: 350, captured: 350 },
      ],
      byProviderStatus: [
        { label: 'failed', count: 1, revenue: 0, captured: 1200 },
        { label: 'confirmed', count: 1, revenue: 350, captured: 350 },
      ],
    },
    loading: false,
    error: null,
    reload: testState.reload,
  });
});

describe('<PaymentsModule /> canonical booking payments', () => {
  test('renders payment, provider, source, and recovery state from canonical bookings', () => {
    render(<PaymentsModule />);

    expect(screen.getByRole('heading', { name: 'Payments & Receipts' })).toBeInTheDocument();
    expect(screen.getByText(/Reconcile canonical bookings across flights, stays, activities, and concierge/i)).toBeInTheDocument();
    expect(screen.getByText('Recognized Revenue')).toBeInTheDocument();
    expect(screen.getByText('Captured Payments')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Refunds and Issues')).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Payment status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Booking type' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Provider status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Source surface' })).toBeInTheDocument();
    expect(screen.getByText('All provider states')).toBeInTheDocument();
    expect(screen.getByText('Canonical payment records')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Payment')).toBeInTheDocument();
    expect(within(table).getByText('Provider')).toBeInTheDocument();
    expect(within(table).getByText('Source')).toBeInTheDocument();
    expect(within(table).getByText('Recovery')).toBeInTheDocument();
    expect(within(table).getByText('Ocean Club')).toBeInTheDocument();
    expect(within(table).getAllByText('payment: paid')).toHaveLength(2);
    expect(within(table).getByText('provider: failed')).toBeInTheDocument();
    expect(within(table).getByText('payment succeeded provider failed')).toBeInTheDocument();
    expect(within(table).getByText('NAS to MIA')).toBeInTheDocument();
  });

  test('opens detail panel with separate payment and provider status', async () => {
    const user = userEvent.setup();
    render(<PaymentsModule />);

    await user.click(screen.getAllByRole('button', { name: 'Detail' })[0]);

    expect(screen.getByText('Canonical payment reconciliation')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hotel · \$1,200\.00/i })).toBeInTheDocument();
    expect(screen.getAllByText('payment: paid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('provider: failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('payment succeeded provider failed').length).toBeGreaterThan(0);
    expect(screen.getByText(/Reconciled:/)).toBeInTheDocument();
    expect(screen.getByText('no')).toBeInTheDocument();
  });
});

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    booking_type: 'hotel',
    provider: 'liteapi',
    amount: 1200,
    currency: 'USD',
    status: 'confirmed',
    payment_status: 'paid',
    provider_status: 'confirmed',
    source_surface: 'web',
    provider_reference: 'LITE-OK-1',
    failure_state: 'none',
    reconciled: true,
    stripe_payment_intent_id: 'pi_test_123',
    booking_reference: null,
    external_reference: null,
    trip_item_id: 'trip-item-1',
    trip_item_type: 'accommodation',
    trip_item_name: 'Booking item',
    paid_at: '2026-06-19T00:01:00Z',
    created_at: '2026-06-19T00:00:00Z',
    updated_at: '2026-06-19T00:02:00Z',
    ...overrides,
  };
}
