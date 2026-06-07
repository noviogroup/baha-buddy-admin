-- Baha Buddy V2 — AI Chat Schema Migration
-- Idempotent: safe to run on existing DB.
-- Adds: ai_usage_log, card_type 'mixed', google_places/users/trip_activities columns, views.

-- ============================================
-- AI Usage Log (Cost Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  thread_id uuid,
  model text NOT NULL DEFAULT 'claude-sonnet-4-5-20250514',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd decimal(10, 6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_model ON public.ai_usage_log(model);
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own usage" ON public.ai_usage_log;
CREATE POLICY "Users can view own usage" ON public.ai_usage_log
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can insert usage" ON public.ai_usage_log;
CREATE POLICY "Service role can insert usage" ON public.ai_usage_log
  FOR INSERT WITH CHECK (true);
-- ============================================
-- Chat Messages — Allow 'mixed' card_type
-- ============================================

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_card_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_card_type_check CHECK (
  card_type IN ('none', 'destination', 'hotel', 'flight', 'dayPlan', 'activity', 'map', 'summary', 'payment', 'mixed')
);
-- ============================================
-- Trip Activities — Ensure columns exist
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trip_activities' AND column_name = 'activity_type'
  ) THEN
    ALTER TABLE public.trip_activities ADD COLUMN activity_type text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trip_activities' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE public.trip_activities ADD COLUMN place_id text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trip_activities' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.trip_activities ADD COLUMN notes text;
  END IF;
END $$;
-- ============================================
-- Google Places — Add V2 rich card columns
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'google_places' AND column_name = 'photo_url') THEN
    ALTER TABLE public.google_places ADD COLUMN photo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'google_places' AND column_name = 'description') THEN
    ALTER TABLE public.google_places ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'google_places' AND column_name = 'amenities') THEN
    ALTER TABLE public.google_places ADD COLUMN amenities text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'google_places' AND column_name = 'cuisine_type') THEN
    ALTER TABLE public.google_places ADD COLUMN cuisine_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'google_places' AND column_name = 'vibe_tags') THEN
    ALTER TABLE public.google_places ADD COLUMN vibe_tags text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'google_places' AND column_name = 'kid_friendly') THEN
    ALTER TABLE public.google_places ADD COLUMN kid_friendly boolean DEFAULT false;
  END IF;
END $$;
-- ============================================
-- Users — Add V2 profile fields
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'engagement_score') THEN
    ALTER TABLE public.users ADD COLUMN engagement_score integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'dietary_needs') THEN
    ALTER TABLE public.users ADD COLUMN dietary_needs text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'accessibility_needs') THEN
    ALTER TABLE public.users ADD COLUMN accessibility_needs text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'voice_enabled') THEN
    ALTER TABLE public.users ADD COLUMN voice_enabled boolean DEFAULT true;
  END IF;
END $$;
-- ============================================
-- Views for cost monitoring
-- ============================================

CREATE OR REPLACE VIEW public.ai_daily_costs AS
SELECT
  date(created_at) AS date,
  model,
  count(*) AS requests,
  sum(input_tokens) AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  sum(estimated_cost_usd)::decimal(10,4) AS total_cost_usd
FROM public.ai_usage_log
GROUP BY date(created_at), model
ORDER BY date DESC;
CREATE OR REPLACE VIEW public.ai_user_costs_30d AS
SELECT
  user_id,
  count(*) AS requests,
  sum(input_tokens) AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  sum(estimated_cost_usd)::decimal(10,4) AS total_cost_usd
FROM public.ai_usage_log
WHERE created_at > now() - interval '30 days'
GROUP BY user_id
ORDER BY total_cost_usd DESC;
