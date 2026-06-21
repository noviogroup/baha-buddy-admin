export type BookingRecoveryState =
  | 'payment_succeeded_provider_failed'
  | 'provider_succeeded_local_failed'
  | 'abandoned_checkout'
  | 'provider_pending'
  | 'cancelled'
  | 'refunded'
  | 'none'
  | string;

export type BookingRecoveryTone = 'danger' | 'warning' | 'neutral' | 'success';

export interface BookingRecoveryGuidance {
  state: BookingRecoveryState;
  label: string;
  priority: 'P0' | 'P1' | 'P2' | 'Done';
  tone: BookingRecoveryTone;
  summary: string;
  nextAction: string;
  checklist: string[];
}

const NONE: BookingRecoveryGuidance = {
  state: 'none',
  label: 'No support action',
  priority: 'Done',
  tone: 'success',
  summary: 'Payment, provider, and local booking state do not show a support mismatch.',
  nextAction: 'Monitor normally.',
  checklist: ['No recovery action required unless the traveler reports an issue.'],
};

const GUIDANCE: Record<string, BookingRecoveryGuidance> = {
  payment_succeeded_provider_failed: {
    state: 'payment_succeeded_provider_failed',
    label: 'Payment captured, provider failed',
    priority: 'P0',
    tone: 'danger',
    summary: 'Traveler money appears captured while the provider booking failed or has no usable confirmation.',
    nextAction: 'Do not ask the traveler to book again. Verify Stripe, check provider state, then decide refund or manual recovery.',
    checklist: [
      'Confirm Stripe payment intent and amount.',
      'Check LiteAPI/provider booking state and any provider payload.',
      'If provider failed, refund or recover manually before changing local status.',
      'Message the traveler with the exact recovery path.',
    ],
  },
  provider_succeeded_local_failed: {
    state: 'provider_succeeded_local_failed',
    label: 'Provider confirmed, local save failed',
    priority: 'P0',
    tone: 'danger',
    summary: 'The provider has a confirmation reference but the local booking row is failed or unreconciled.',
    nextAction: 'Protect the provider reference and reconcile the local booking/trip item before changing customer-facing status.',
    checklist: [
      'Copy and preserve the provider reference.',
      'Confirm traveler, trip, and payment intent match the provider record.',
      'Repair the local booking and related trip item before marking confirmed.',
      'Audit-log the reconciliation notes.',
    ],
  },
  abandoned_checkout: {
    state: 'abandoned_checkout',
    label: 'Abandoned checkout',
    priority: 'P2',
    tone: 'neutral',
    summary: 'The checkout started but has no payment or provider confirmation to operate.',
    nextAction: 'Treat as an abandoned cart unless Stripe or provider evidence appears.',
    checklist: [
      'Verify there is no captured Stripe payment.',
      'Verify there is no provider reference.',
      'Use remarketing or traveler follow-up, not manual confirmation.',
    ],
  },
  provider_pending: {
    state: 'provider_pending',
    label: 'Provider pending',
    priority: 'P1',
    tone: 'warning',
    summary: 'Payment or local state exists while provider confirmation is still pending.',
    nextAction: 'Check provider status before retrying, refunding, or marking the booking confirmed.',
    checklist: [
      'Check the provider booking/prebook status.',
      'Avoid duplicate provider bookings.',
      'Update provider status separately from payment status.',
    ],
  },
  cancelled: {
    state: 'cancelled',
    label: 'Cancelled',
    priority: 'Done',
    tone: 'neutral',
    summary: 'The booking is cancelled. Support should verify refund and traveler communication if money moved.',
    nextAction: 'Confirm refund policy, cancellation timestamp, and traveler notice.',
    checklist: [
      'Check whether a refund is required or already issued.',
      'Verify provider cancellation reference if available.',
      'Keep cancellation and refund status separate.',
    ],
  },
  refunded: {
    state: 'refunded',
    label: 'Refunded',
    priority: 'Done',
    tone: 'neutral',
    summary: 'Refund is recorded. Support should keep the provider and payment trail visible.',
    nextAction: 'Confirm refunded amount, payment reference, and provider cancellation state.',
    checklist: [
      'Verify refund amount and Stripe/payment reference.',
      'Verify provider status is cancelled or no-show safe.',
      'Close support only after the traveler has the refund context.',
    ],
  },
};

export function bookingRecoveryGuidance(state: BookingRecoveryState | null | undefined): BookingRecoveryGuidance {
  const key = typeof state === 'string' && state.trim() ? state.trim() : 'none';
  return GUIDANCE[key] ?? NONE;
}

export function needsBookingSupport(state: BookingRecoveryState | null | undefined): boolean {
  const guidance = bookingRecoveryGuidance(state);
  return guidance.priority === 'P0' || guidance.priority === 'P1' || guidance.state === 'abandoned_checkout';
}

export function recoveryToneClass(tone: BookingRecoveryTone): string {
  if (tone === 'danger') return 'border-status-danger-bg bg-status-danger-bg/40 text-status-danger';
  if (tone === 'warning') return 'border-status-warning-bg bg-status-warning-bg/60 text-status-warning';
  if (tone === 'success') return 'border-status-success-bg bg-status-success-bg/50 text-status-success';
  return 'border-hairline bg-surface text-body';
}
