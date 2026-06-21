import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const testState = vi.hoisted(() => ({
  useApi: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Bar: () => null,
}));

import { RevenueModule } from '@/components/revenue-module';

beforeEach(() => {
  vi.clearAllMocks();
  testState.useApi.mockReturnValue({
    data: {
      summary: {
        revenueToday: 350,
        revenueThisMonth: 350,
        grossBookingValue: 1550,
        capturedPayments: 1550,
        estimatedNetRevenue: 300,
        aiCostToday: 10,
        aiCostMonth: 50,
        apiCostMonth: 0,
        revenuePerUser: 350,
        totalBookings: 2,
        confirmedBookings: 2,
        pendingBookings: 0,
        failedBookings: 0,
        cancelledBookings: 0,
        refundedBookings: 0,
        paymentPaid: 2,
        paymentPending: 0,
        paymentRefunded: 0,
        providerConfirmed: 1,
        providerPending: 0,
        providerFailed: 1,
        bookingIssues: 1,
        p0BookingIssues: 1,
        paidUsers: 1,
        revenueSource: 'canonical_bookings',
      },
      breakdowns: {
        byCategory: [
          { label: 'flight', count: 1, gross: 350, captured: 350, paid: 350, issues: 0 },
          { label: 'hotel', count: 1, gross: 1200, captured: 1200, paid: 0, issues: 1 },
        ],
        byProvider: [
          { label: 'liteapi', count: 2, gross: 1550, captured: 1550, paid: 350, issues: 1 },
        ],
        byStatus: [
          { label: 'confirmed', count: 2, gross: 1550, captured: 1550, paid: 350, issues: 1 },
        ],
        byPaymentStatus: [
          { label: 'paid', count: 2, gross: 1550, captured: 1550, paid: 350, issues: 1 },
        ],
        byProviderStatus: [
          { label: 'confirmed', count: 1, gross: 350, captured: 350, paid: 350, issues: 0 },
          { label: 'failed', count: 1, gross: 1200, captured: 1200, paid: 0, issues: 1 },
        ],
        bySource: [
          { label: 'web', count: 1, gross: 350, captured: 350, paid: 350, issues: 0 },
          { label: 'mobile', count: 1, gross: 1200, captured: 1200, paid: 0, issues: 1 },
        ],
        byRecoveryState: [
          { label: 'none', count: 1, gross: 350, captured: 350, paid: 350, issues: 0 },
          { label: 'payment_succeeded_provider_failed', count: 1, gross: 1200, captured: 1200, paid: 0, issues: 1 },
        ],
      },
      notes: [
        'Revenue is recognized only from canonical booking rows where payment, provider, local booking, and trip item state reconcile.',
      ],
    },
    loading: false,
    error: null,
  });
});

describe('<RevenueModule /> canonical booking revenue', () => {
  test('renders canonical payment, provider, source, and recovery revenue context', () => {
    render(<RevenueModule />);

    expect(screen.getByRole('heading', { name: 'Revenue Command Center' })).toBeInTheDocument();
    expect(screen.getByText(/canonical booking revenue/i)).toBeInTheDocument();
    expect(screen.getByText('Captured Payments')).toBeInTheDocument();
    expect(screen.getAllByText('$1,550.00').length).toBeGreaterThan(0);
    expect(screen.getByText('2 paid payment rows')).toBeInTheDocument();
    expect(screen.getByText('Provider Status')).toBeInTheDocument();
    expect(screen.getByText('0 pending, 1 failed')).toBeInTheDocument();
    expect(screen.getByText('Booking Issues')).toBeInTheDocument();
    expect(screen.getByText('1 P0, 0 cancels/refunds')).toBeInTheDocument();
    expect(screen.getByText(/Revenue source:/)).toBeInTheDocument();
    expect(screen.getByText(/canonical bookings/i)).toBeInTheDocument();
    expect(screen.getByText(/Revenue is recognized only from canonical booking rows/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'By Source' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By Provider Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By Payment Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By Recovery State' })).toBeInTheDocument();

    const recoveryTable = screen.getByRole('heading', { name: 'By Recovery State' }).closest('div')?.parentElement;
    expect(recoveryTable).toBeTruthy();
    expect(within(recoveryTable as HTMLElement).getByText('payment succeeded provider failed')).toBeInTheDocument();
    expect(within(recoveryTable as HTMLElement).getAllByText('$1,200.00').length).toBeGreaterThan(0);
  });
});
