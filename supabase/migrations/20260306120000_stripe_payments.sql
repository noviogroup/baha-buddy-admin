-- Baha Buddy V2 — Stripe Payment Schema
-- Run after the base V2 migrations.

-- Add stripe_customer_id to users (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;
-- Bookings table — ensure it has Stripe fields
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'full_trip',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled', 'refunded')),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  supplier_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Add stripe_payment_intent_id if bookings already existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON bookings(stripe_payment_intent_id);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- Users see own bookings
CREATE POLICY IF NOT EXISTS "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);
-- Service role inserts/updates (from Edge Functions)
CREATE POLICY IF NOT EXISTS "Service can manage bookings" ON bookings
  FOR ALL USING (true) WITH CHECK (true);
