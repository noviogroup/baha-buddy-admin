-- Baha Buddy Admin — canonical booking readiness columns
-- Non-destructive parity migration for the admin operational surface.
--
-- Mobile and web booking flows persist into canonical tables:
--   bookings, trip_accommodations, trip_flights, trip_activities
--
-- This migration makes the admin migration history self-contained for the
-- columns that later mobile/web flows and admin reconciliation depend on.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'full_trip',
  ADD COLUMN IF NOT EXISTS supplier_ref text,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS amount_cents int,
  ADD COLUMN IF NOT EXISTS commission_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_response jsonb;

UPDATE public.bookings
SET type = coalesce(type, booking_type, 'full_trip')
WHERE type IS NULL;

COMMENT ON COLUMN public.bookings.type IS
  'Booking product type used by legacy payment flows; kept for web/mobile compatibility.';

COMMENT ON COLUMN public.bookings.booking_ref IS
  'Provider-assigned booking reference, such as LiteAPI booking id or flight provider reference.';

COMMENT ON COLUMN public.bookings.amount_cents IS
  'Total amount charged in smallest currency unit. Derived from provider or payment response.';

COMMENT ON COLUMN public.bookings.commission_cents IS
  'Commission earned by Baha Buddy in cents, when known at booking time.';

COMMENT ON COLUMN public.bookings.raw_response IS
  'Provider booking response retained for support/audit visibility. Operational status remains on canonical booking rows.';

CREATE INDEX IF NOT EXISTS idx_bookings_booking_ref ON public.bookings(booking_ref);

ALTER TABLE public.trip_flights
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_trip_flights_stripe_payment_intent
  ON public.trip_flights(stripe_payment_intent_id);

COMMENT ON COLUMN public.trip_flights.stripe_payment_intent_id IS
  'Stripe PaymentIntent ID for the flight checkout that produced this trip item.';

ALTER TABLE public.trip_activities
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_activity_id text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trip_activities_source
  ON public.trip_activities(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_trip_activities_provider_activity
  ON public.trip_activities(provider, provider_activity_id);

ALTER TABLE public.trip_accommodations
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stars numeric,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS status text;

COMMENT ON COLUMN public.trip_accommodations.property_type IS
  'Canonical stay property type such as hotel, resort, villa, home, apartment, or condo.';
