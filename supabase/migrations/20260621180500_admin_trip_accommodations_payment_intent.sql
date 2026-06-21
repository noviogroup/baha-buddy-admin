-- Baha Buddy Admin — hotel trip-item payment intent parity
-- Links hotel trip items to canonical booking/payment rows for admin recovery.

ALTER TABLE public.trip_accommodations
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_trip_accommodations_stripe_pi
  ON public.trip_accommodations(stripe_payment_intent_id);
