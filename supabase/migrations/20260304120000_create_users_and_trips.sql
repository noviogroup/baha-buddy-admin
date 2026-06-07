-- Baha Buddy V2 — Users & Trips
-- Safe to run on existing V1 project: uses IF NOT EXISTS.
-- If V1 already has users/trips with different columns, add a follow-up migration to ALTER.

-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ---------------------------------------------------------------------------
-- users
-- Profile from onboarding; AI reads this every conversation.
-- id matches auth.users(id) when using Supabase Auth (anonymous or email).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name text NOT NULL,
  email text,
  country text,
  city text,
  party_type text NOT NULL DEFAULT 'solo' CHECK (party_type IN ('solo', 'couple', 'family', 'friends')),
  party_size int NOT NULL DEFAULT 1 CHECK (party_size >= 1),
  children_count int NOT NULL DEFAULT 0,
  children_ages int[] DEFAULT '{}',
  interest_tags text[] DEFAULT '{}',
  engagement_score int NOT NULL DEFAULT 0,
  voice_enabled boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Baha Buddy user profile from onboarding; id aligns with auth.users for Supabase Auth';
-- ---------------------------------------------------------------------------
-- trips
-- Trip entities with status lifecycle. One chat thread per trip.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'booked', 'active', 'completed', 'cancelled')),
  date_start date,
  date_end date,
  islands text[] DEFAULT '{}',
  party_type text NOT NULL DEFAULT 'solo',
  party_size int NOT NULL DEFAULT 1,
  budget_estimate numeric(12, 2),
  budget_actual numeric(12, 2),
  chat_thread_id uuid,
  hero_image_url text,
  collaborator_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_date_start ON public.trips(date_start);
COMMENT ON TABLE public.trips IS 'Trip entities; chat_thread_id set when thread is created';
