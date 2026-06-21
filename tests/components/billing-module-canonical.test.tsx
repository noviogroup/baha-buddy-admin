import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const testState = vi.hoisted(() => ({
  reload: vi.fn(),
  useApi: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

import { BillingModule } from '@/components/admin-core-modules';

beforeEach(() => {
  vi.clearAllMocks();
  testState.reload.mockResolvedValue(undefined);
  testState.useApi.mockReturnValue({
    data: {
      credits: [
        {
          service: 'LiteAPI',
          api_key_status: 'active',
          credit_balance: 100,
          current_month_usage: 7,
          plan_tier: 'production',
        },
      ],
      summary: {
        aiCostToday: 3.25,
        aiCostMonth: 15,
        apiCostMonth: 20,
        totalCostMonth: 35,
        revenueMonth: 1000,
        grossBookingValueMonth: 2000,
        capturedPaymentsMonth: 1700,
        revenueSource: 'canonical_bookings',
        bookings: {
          total: 3,
          paymentPaid: 2,
          providerFailed: 1,
          providerPending: 1,
          issues: 2,
        },
      },
    },
    loading: false,
    error: null,
    reload: testState.reload,
  });
});

describe('<BillingModule /> canonical revenue cards', () => {
  test('shows cost and canonical booking revenue context', () => {
    render(<BillingModule />);

    expect(screen.getByRole('heading', { name: 'Billing & APIs' })).toBeInTheDocument();
    expect(screen.getByText(/canonical booking revenue context/i)).toBeInTheDocument();
    expect(screen.getByText('AI cost today')).toBeInTheDocument();
    expect(screen.getByText('$3.25')).toBeInTheDocument();
    expect(screen.getByText('Recognized revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Canonical bookings only')).toBeInTheDocument();
    expect(screen.getByText('Gross booking value')).toBeInTheDocument();
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
    expect(screen.getByText('3 monthly bookings')).toBeInTheDocument();
    expect(screen.getByText('Captured payments')).toBeInTheDocument();
    expect(screen.getByText('$1,700.00')).toBeInTheDocument();
    expect(screen.getByText('2 paid payment rows')).toBeInTheDocument();
    expect(screen.getByText('Booking issues')).toBeInTheDocument();
    expect(screen.getByText('1 provider failed, 1 pending')).toBeInTheDocument();
    expect(screen.getByText(/Legacy Stripe summary views are not used/i)).toBeInTheDocument();
    expect(screen.getByText('LiteAPI')).toBeInTheDocument();
  });
});
