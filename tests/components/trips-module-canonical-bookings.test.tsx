import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const testState = vi.hoisted(() => ({
  reload: vi.fn(),
  useApi: vi.fn(),
}));

vi.mock('@/lib/use-api', () => ({
  useApi: (...args: unknown[]) => testState.useApi(...args),
}));

import { TripsModule } from '@/components/admin-core-modules';

beforeEach(() => {
  vi.clearAllMocks();
  testState.reload.mockResolvedValue(undefined);
  testState.useApi.mockReturnValue({
    data: {
      total: 2,
      summary: {
        trips: 2,
        loaded: 2,
        tripsWithBookings: 2,
        tripsWithBookingIssues: 1,
        recognizedRevenue: 800,
        capturedPayments: 2400,
      },
      trips: [
        trip({
          id: 'trip-healthy',
          name: 'Nassau weekend',
          booking_summary: {
            total: 1,
            issues: 0,
            p0Issues: 0,
            paymentPaid: 1,
            providerConfirmed: 1,
            providerPending: 0,
            providerFailed: 0,
            recognizedRevenue: 800,
            capturedPayments: 800,
            bookingTypes: ['hotel'],
            providers: ['liteapi'],
            sources: ['web'],
          },
        }),
        trip({
          id: 'trip-issue',
          name: 'Exuma booking issue',
          booking_summary: {
            total: 2,
            issues: 2,
            p0Issues: 1,
            paymentPaid: 2,
            providerConfirmed: 0,
            providerPending: 1,
            providerFailed: 1,
            recognizedRevenue: 0,
            capturedPayments: 1600,
            bookingTypes: ['flight', 'hotel'],
            providers: ['liteapi'],
            sources: ['mobile', 'web'],
          },
        }),
      ],
    },
    loading: false,
    error: null,
    reload: testState.reload,
  });
});

describe('<TripsModule /> canonical booking summaries', () => {
  test('renders booking health and revenue context for trips', () => {
    render(<TripsModule />);

    expect(screen.getByRole('heading', { name: 'Trips' })).toBeInTheDocument();
    expect(screen.getByText('Trips with bookings')).toBeInTheDocument();
    expect(screen.getByText('Booking issues')).toBeInTheDocument();
    expect(screen.getByText('$2,400.00 captured')).toBeInTheDocument();
    expect(screen.getByText('$800.00 recognized')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Nassau weekend')).toBeInTheDocument();
    expect(within(table).getByText('1 bookings')).toBeInTheDocument();
    expect(within(table).getByText('No booking issues')).toBeInTheDocument();
    expect(within(table).getByText('$800.00 recognized · $800.00 captured')).toBeInTheDocument();
    expect(within(table).getByText('liteapi · web')).toBeInTheDocument();

    expect(within(table).getByText('Exuma booking issue')).toBeInTheDocument();
    expect(within(table).getByText('2 bookings')).toBeInTheDocument();
    expect(within(table).getByText('2 issues')).toBeInTheDocument();
    expect(within(table).getByText('1 P0 recovery issue')).toBeInTheDocument();
    expect(within(table).getByText('$0.00 recognized · $1,600.00 captured')).toBeInTheDocument();
    expect(within(table).getByText('liteapi · mobile, web')).toBeInTheDocument();
  });
});

function trip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    name: 'Bahamas trip',
    status: 'planned',
    islands: ['Nassau'],
    created_at: '2026-06-20T10:00:00Z',
    users: { display_name: 'Traveler One', email: 'traveler@example.com' },
    booking_summary: {
      total: 0,
      issues: 0,
      p0Issues: 0,
      paymentPaid: 0,
      providerConfirmed: 0,
      providerPending: 0,
      providerFailed: 0,
      recognizedRevenue: 0,
      capturedPayments: 0,
      bookingTypes: [],
      providers: [],
      sources: [],
    },
    ...overrides,
  };
}
