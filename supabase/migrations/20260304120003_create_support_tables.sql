-- Baha Buddy V2 — Support tables
-- user_documents, user_payments, bookings, ugc_content.
-- (google_places: use existing V1 table; not created here to avoid schema conflict.)

-- ---------------------------------------------------------------------------
-- user_documents
-- Encrypted passport/visa reminders (Phase 3).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('passport', 'visa', 'insurance', 'other')),
  encrypted_payload text,
  reminder_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
-- ---------------------------------------------------------------------------
-- user_payments
-- Stripe customer IDs and payment method references.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_payment_method_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments(user_id);
-- ---------------------------------------------------------------------------
-- bookings
-- Confirmed booking records (flights, hotels, activities).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('flight', 'accommodation', 'activity', 'other')),
  reference_id uuid,
  provider text,
  amount numeric(12, 2),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON public.bookings(trip_id);
-- ---------------------------------------------------------------------------
-- ugc_content
-- User-generated content for Explore / Community (Phase 4).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ugc_content (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('video', 'photo', 'story')),
  storage_path text NOT NULL,
  caption text,
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ugc_content_user_id ON public.ugc_content(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_content_moderation ON public.ugc_content(moderation_status);
