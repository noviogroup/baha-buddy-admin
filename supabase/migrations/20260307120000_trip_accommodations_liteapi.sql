-- Baha Buddy V2 — LiteAPI hotel fields for trip_accommodations
-- ============================================================
-- Extends trip_accommodations to store LiteAPI booking identifiers
-- so the booking flow can retrieve a prebook token and confirm payment.
--
-- LiteAPI booking flow (4 steps):
--   1. get_hotels        → returns liteapi_hotel_id per property
--   2. get_hotel_rates   → returns liteapi_rate_id per room type
--   3. prebook (POST /v3.0/hotels/prebook) → returns prebookId
--   4. book   (POST /v3.0/hotels/book)     → returns bookingId, confirmation
--
-- This migration adds the identifiers needed at each stage.
-- prebookId and bookingId are added to the `bookings` table (existing) via
-- booking_reference; liteapi_prebook_id is stored here for the confirm step.

ALTER TABLE public.trip_accommodations
  ADD COLUMN IF NOT EXISTS liteapi_hotel_id  text,
  ADD COLUMN IF NOT EXISTS liteapi_rate_id   text,
  ADD COLUMN IF NOT EXISTS liteapi_prebook_id text,
  ADD COLUMN IF NOT EXISTS status            text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'prebooked', 'booked', 'cancelled')),
  ADD COLUMN IF NOT EXISTS total_price       numeric(12, 2),
  ADD COLUMN IF NOT EXISTS currency          text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS nights            int,
  ADD COLUMN IF NOT EXISTS photo_url         text,
  ADD COLUMN IF NOT EXISTS stars             numeric(2, 1),
  ADD COLUMN IF NOT EXISTS rating            numeric(3, 1);
COMMENT ON COLUMN public.trip_accommodations.liteapi_hotel_id IS
  'LiteAPI property ID (e.g. lp74875). Returned by hotels-stays-proxy search_hotels action.';
COMMENT ON COLUMN public.trip_accommodations.liteapi_rate_id IS
  'LiteAPI rate ID for the selected room type. Returned by hotels-stays-proxy get_hotel_rates action. Required for prebook step.';
COMMENT ON COLUMN public.trip_accommodations.liteapi_prebook_id IS
  'Temporary prebookId returned by POST /v3.0/hotels/prebook. Must be used within 10 minutes to confirm booking.';
COMMENT ON COLUMN public.trip_accommodations.status IS
  'Lifecycle: planned → prebooked (after /prebook) → booked (after /book) → cancelled.';
COMMENT ON COLUMN public.trip_accommodations.total_price IS
  'Total stay cost in the stored currency. Set when rates are fetched; confirmed at booking.';
COMMENT ON COLUMN public.trip_accommodations.nights IS
  'Number of nights computed from check_in / check_out at rate-fetch time.';
