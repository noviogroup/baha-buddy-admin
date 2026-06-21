export type BookingTripItemKind = 'accommodation' | 'flight' | 'activity';

export type BookingTripItem = {
  id?: string | null;
  kind?: BookingTripItemKind | null;
  name?: string | null;
  activity_name?: string | null;
  booking_reference?: string | null;
  stripe_payment_intent_id?: string | null;
  status?: string | null;
  place_id?: string | null;
  liteapi_hotel_id?: string | null;
};

export type BookingExtra = {
  id: string;
  booking_reference?: string | null;
  external_reference?: string | null;
  stripe_payment_intent_id?: string | null;
  financial_metadata?: Record<string, unknown> | null;
};

export type BookingReconciliationOptions = {
  loadCanonicalExtras?: boolean;
};

export function num(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export async function enrichBookingRows(
  supabase: any,
  rows: any[],
  options: BookingReconciliationOptions = {},
) {
  if (!rows.length) return rows;
  const extras = options.loadCanonicalExtras ? await loadBookingExtras(supabase, rows) : new Map<string, BookingExtra>();
  const tripItemsByIntent = await loadTripItemsByPaymentIntent(supabase, rows, extras);

  return enrichRowsWithTripItems(rows, {
    extras,
    findTripItem: row => {
      const extra = extras.get(row.id);
      const paymentIntentId = firstString(row.stripe_payment_intent_id, extra?.stripe_payment_intent_id);
      return paymentIntentId ? tripItemsByIntent.get(paymentIntentId) : undefined;
    },
  });
}

export function enrichBookingRowsWithLoadedTripItems(
  rows: any[],
  tripItems: BookingTripItem[],
) {
  return enrichRowsWithTripItems(rows, {
    extras: new Map<string, BookingExtra>(),
    findTripItem: row => findLoadedTripItemForBooking(row, tripItems),
  });
}

export function isRecognizedRevenue(row: any) {
  return row.reconciled === true
    && row.payment_status === 'paid'
    && row.provider_status === 'confirmed'
    && row.failure_state === 'none';
}

export function sourceSurfaceFor(metadata: Record<string, unknown>) {
  const source = metadata.source_surface ?? metadata.source ?? metadata.surface;
  return typeof source === 'string' && source.trim() ? source.trim() : 'unknown';
}

export function normalizedStatus(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : '';
}

export function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

async function loadBookingExtras(supabase: any, rows: any[]) {
  const ids = rows.map(row => row.id).filter(Boolean);
  if (!ids.length) return new Map<string, BookingExtra>();

  const { data } = await supabase
    .from('bookings')
    .select('id, booking_reference, external_reference, stripe_payment_intent_id, financial_metadata')
    .in('id', ids);

  return new Map<string, BookingExtra>(
    ((data || []) as BookingExtra[]).map(row => [row.id, row] as [string, BookingExtra]),
  );
}

async function loadTripItemsByPaymentIntent(
  supabase: any,
  rows: any[],
  extras: Map<string, BookingExtra>,
) {
  const paymentIntentIds = Array.from(new Set(rows
    .map(row => firstString(row.stripe_payment_intent_id, extras.get(row.id)?.stripe_payment_intent_id))
    .filter(Boolean) as string[]));
  const result = new Map<string, BookingTripItem>();
  if (!paymentIntentIds.length) return result;

  const { data: accommodations } = await supabase
    .from('trip_accommodations')
    .select('id, name, place_id, liteapi_hotel_id, status, booking_reference, stripe_payment_intent_id')
    .in('stripe_payment_intent_id', paymentIntentIds);

  for (const item of (accommodations || []) as BookingTripItem[]) {
    const intent = firstString(item.stripe_payment_intent_id);
    if (intent) result.set(intent, { ...item, kind: 'accommodation' });
  }

  const { data: flights } = await supabase
    .from('trip_flights')
    .select('id, booking_reference, stripe_payment_intent_id')
    .in('stripe_payment_intent_id', paymentIntentIds);

  for (const item of (flights || []) as BookingTripItem[]) {
    const intent = firstString(item.stripe_payment_intent_id);
    if (intent && !result.has(intent)) result.set(intent, { ...item, kind: 'flight' });
  }

  return result;
}

function enrichRowsWithTripItems(
  rows: any[],
  context: {
    extras: Map<string, BookingExtra>;
    findTripItem: (row: any) => BookingTripItem | undefined;
  },
) {
  return rows.map(row => {
    const extra = context.extras.get(row.id);
    const metadata = asMetadata(extra?.financial_metadata || row.financial_metadata);
    const tripItem = context.findTripItem(row);
    const tripItemStatus = normalizedStatus(tripItem?.status);
    const providerReference = firstString(
      tripItem?.booking_reference,
      row.provider_reference,
      row.external_reference,
      extra?.external_reference,
      row.booking_reference,
      extra?.booking_reference,
      row.reference_id,
    );
    const paymentStatus = paymentStatusFor(row);
    const providerStatus = providerStatusFor(providerReference, metadata, row.status, tripItemStatus);
    const failureState = failureStateFor(paymentStatus, providerStatus, row.status, providerReference, tripItemStatus);

    return {
      ...row,
      provider_reference: providerReference,
      source_surface: sourceSurfaceFor(metadata),
      payment_status: paymentStatus,
      provider_status: providerStatus,
      trip_item_id: tripItem?.id ?? null,
      trip_item_type: tripItem?.kind ?? null,
      trip_item_status: tripItemStatus || null,
      trip_item_name: tripItemName(tripItem),
      failure_state: failureState,
      reconciled: isRevenueReconciled(row, paymentStatus, providerStatus, failureState, tripItem, providerReference),
    };
  });
}

function findLoadedTripItemForBooking(row: any, tripItems: BookingTripItem[]) {
  const paymentIntentId = firstString(row.stripe_payment_intent_id);
  if (paymentIntentId) {
    const matchedByPayment = tripItems.find(item => firstString(item.stripe_payment_intent_id) === paymentIntentId);
    if (matchedByPayment) return matchedByPayment;
  }

  const providerReference = firstString(
    row.provider_reference,
    row.external_reference,
    row.booking_reference,
    row.reference_id,
  );
  if (providerReference) {
    return tripItems.find(item => firstString(item.booking_reference) === providerReference);
  }

  return undefined;
}

function tripItemName(item?: BookingTripItem) {
  if (!item) return null;
  return firstString(item.name, item.activity_name);
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function paymentStatusFor(row: any) {
  const status = normalizedStatus(row.status);
  if (status === 'refunded') return 'refunded';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  if (status === 'failed' || status === 'error') return 'failed';
  if (row.paid_at || ['confirmed', 'booked', 'succeeded', 'paid'].includes(status)) return 'paid';
  return 'pending';
}

function providerStatusFor(
  providerReference: unknown,
  metadata: Record<string, unknown>,
  bookingStatus: unknown,
  tripItemStatus?: string,
) {
  const metadataStatus = normalizedStatus(metadata.provider_status);
  const bookingRowStatus = normalizedStatus(bookingStatus);
  const status = tripItemStatus || metadataStatus || bookingRowStatus;
  if (['failed', 'error'].includes(tripItemStatus || metadataStatus)) return 'failed';
  if (['failed', 'error'].includes(bookingRowStatus)) return providerReference ? 'confirmed' : 'failed';
  if (['failed', 'error'].includes(status)) return 'failed';
  if (['cancelled', 'canceled', 'refunded'].includes(status)) return status === 'refunded' ? 'cancelled' : status;
  if (['booked', 'confirmed', 'succeeded', 'paid'].includes(status)) return providerReference ? 'confirmed' : 'pending';
  if (providerReference && !['pending', 'started'].includes(status)) return 'confirmed';
  return providerReference ? 'confirmed' : 'pending';
}

function failureStateFor(
  paymentStatus: string,
  providerStatus: string,
  bookingStatus: unknown,
  providerReference: unknown,
  tripItemStatus?: string,
) {
  const status = normalizedStatus(bookingStatus);
  if (tripItemStatus === 'refunded') return 'refunded';
  if (tripItemStatus === 'cancelled' || tripItemStatus === 'canceled') return 'cancelled';
  if (paymentStatus === 'paid' && providerStatus === 'failed') return 'payment_succeeded_provider_failed';
  if (paymentStatus === 'paid' && providerStatus === 'cancelled') return 'cancelled';
  if (providerStatus === 'confirmed' && status === 'failed') return 'provider_succeeded_local_failed';
  if (paymentStatus === 'pending' && !providerReference) return 'abandoned_checkout';
  if (providerStatus === 'pending') return 'provider_pending';
  if (status === 'cancelled' || status === 'refunded') return status;
  return 'none';
}

function isRevenueReconciled(
  row: any,
  paymentStatus: string,
  providerStatus: string,
  failureState: string,
  tripItem: BookingTripItem | undefined,
  providerReference: unknown,
) {
  return isLocalBookingConfirmed(row.status)
    && paymentStatus === 'paid'
    && providerStatus === 'confirmed'
    && failureState === 'none'
    && isTripItemReconciled(row.booking_type, tripItem, providerReference);
}

function isLocalBookingConfirmed(status: unknown) {
  return ['booked', 'confirmed', 'succeeded', 'paid'].includes(normalizedStatus(status));
}

function isTripItemReconciled(bookingType: unknown, tripItem: BookingTripItem | undefined, providerReference: unknown) {
  if (!tripItem || !providerReference) return !requiresTripItem(bookingType);
  const status = normalizedStatus(tripItem.status);
  if (['failed', 'error', 'cancelled', 'canceled', 'refunded'].includes(status)) return false;
  if (isFlightBookingType(bookingType) && !status) return true;
  return ['booked', 'confirmed', 'succeeded', 'paid'].includes(status);
}

function requiresTripItem(bookingType: unknown) {
  const value = normalizedStatus(bookingType);
  return ['hotel', 'accommodation', 'stay', 'stays', 'flight'].includes(value) || value.includes('flight');
}

function isFlightBookingType(bookingType: unknown) {
  return normalizedStatus(bookingType).includes('flight');
}
