-- Baha Buddy V2 — Comprehensive API & Cost Tracking
-- Run in Supabase SQL Editor.
-- Tracks usage across ALL external APIs: Anthropic, LiteAPI, Viator, Duffel, Deepgram, OpenAI TTS, Stripe.

-- ============================================
-- 1. api_usage_log — universal API call tracker
-- Complements ai_usage_log for non-AI API calls
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service text NOT NULL,                     -- 'liteapi' | 'viator' | 'duffel' | 'deepgram' | 'openai_tts' | 'stripe' | 'open_meteo'
  action text NOT NULL,                       -- e.g. 'search_hotels', 'get_hotel_rates', 'search_flights', 'book_activity', 'transcribe', 'synthesize'
  edge_function text,                         -- which Edge Function made the call
  status_code integer,                        -- HTTP response status from external API
  latency_ms integer,                         -- round-trip time in ms
  request_metadata jsonb DEFAULT '{}',        -- sanitized request params (no PII)
  response_metadata jsonb DEFAULT '{}',       -- result counts, error messages
  estimated_cost_usd decimal(10, 6) DEFAULT 0,-- estimated cost per call (when calculable)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_log_service ON public.api_usage_log(service);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_created ON public.api_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_user ON public.api_usage_log(user_id);

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access api_usage_log" ON public.api_usage_log
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. api_credit_status — track account balances and billing status
-- Updated manually or by a scheduled Edge Function
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_credit_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL UNIQUE,               -- 'anthropic' | 'liteapi' | 'viator' | 'duffel' | 'deepgram' | 'openai' | 'stripe' | 'supabase'
  display_name text NOT NULL,
  plan_tier text,                              -- e.g. 'sandbox', 'build-1', 'pay-as-you-go', 'pro', 'free'
  credit_balance decimal(12, 2),               -- remaining credit (NULL if not credit-based)
  credit_currency text DEFAULT 'USD',
  monthly_limit decimal(12, 2),                -- budget cap if set
  current_month_usage decimal(12, 2) DEFAULT 0,-- running total for current billing period
  billing_period_start date,
  billing_period_end date,
  api_key_status text DEFAULT 'active' CHECK (api_key_status IN ('active', 'expiring', 'expired', 'revoked', 'missing')),
  api_key_last_verified timestamptz,
  notes text,                                   -- e.g. 'sandbox key, switch to live before launch'
  dashboard_url text,                           -- link to provider's billing dashboard
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_credit_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access credit_status" ON public.api_credit_status
  FOR ALL USING (true) WITH CHECK (true);

-- Seed with all services
INSERT INTO public.api_credit_status (service, display_name, plan_tier, dashboard_url, notes) VALUES
  ('anthropic',  'Anthropic Claude',   'pay-as-you-go', 'https://console.anthropic.com/settings/billing', 'Sonnet 4.5: $3/$15 per 1M tokens. Haiku: $1/$5. Prompt caching enabled.'),
  ('liteapi',    'LiteAPI (Hotels)',    'sandbox',        'https://dashboard.liteapi.travel',               'Sandbox key active. Switch to live before launch. Per-booking fees.'),
  ('viator',     'Viator (Activities)', 'sandbox',        'https://partnerportal.viator.com',               'Sandbox key. Awaiting Merchant key for direct booking. Currently affiliate links.'),
  ('duffel',     'Duffel (Flights)',    'test',           'https://app.duffel.com',                         'Test mode. Live mode requires production approval. Per-booking fees.'),
  ('deepgram',   'Deepgram (STT)',      'pay-as-you-go', 'https://console.deepgram.com',                   'Nova-3 model. $0.0043/min (pay-as-you-go). Free tier: $200 credit.'),
  ('openai',     'OpenAI (TTS)',        'pay-as-you-go', 'https://platform.openai.com/usage',              'TTS-1 model: $15/1M chars. TTS-1-HD: $30/1M chars.'),
  ('stripe',     'Stripe (Payments)',   'standard',       'https://dashboard.stripe.com',                   'Test mode. 2.9% + 30¢ per transaction in production.'),
  ('supabase',   'Supabase',            'pro',            'https://supabase.com/dashboard',                 'Pro plan. Check egress, storage, and Edge Function invocations.'),
  ('open_meteo', 'Open-Meteo (Weather)','free',           'https://open-meteo.com',                         'Free, no API key. Rate limit: 10k requests/day.')
ON CONFLICT (service) DO NOTHING;

-- ============================================
-- 3. Views for admin dashboard
-- ============================================

-- Daily API usage by service
CREATE OR REPLACE VIEW public.api_daily_usage AS
SELECT
  date(created_at) AS date,
  service,
  action,
  count(*) AS requests,
  avg(latency_ms)::integer AS avg_latency_ms,
  sum(estimated_cost_usd)::decimal(10,4) AS total_cost_usd,
  count(*) FILTER (WHERE status_code >= 400) AS error_count
FROM public.api_usage_log
GROUP BY date(created_at), service, action
ORDER BY date DESC, service;

-- Combined daily costs across ALL services (AI + API)
CREATE OR REPLACE VIEW public.all_daily_costs AS
SELECT date, service, total_cost_usd, requests FROM (
  -- AI costs from ai_usage_log
  SELECT
    date(created_at) AS date,
    CASE
      WHEN model LIKE '%sonnet%' THEN 'claude_sonnet'
      WHEN model LIKE '%haiku%' THEN 'claude_haiku'
      ELSE 'claude_other'
    END AS service,
    sum(estimated_cost_usd)::decimal(10,4) AS total_cost_usd,
    count(*) AS requests
  FROM public.ai_usage_log
  GROUP BY date(created_at), service

  UNION ALL

  -- API costs from api_usage_log
  SELECT
    date(created_at) AS date,
    service,
    sum(estimated_cost_usd)::decimal(10,4) AS total_cost_usd,
    count(*) AS requests
  FROM public.api_usage_log
  GROUP BY date(created_at), service
) combined
ORDER BY date DESC, service;

-- Stripe revenue summary
CREATE OR REPLACE VIEW public.stripe_revenue_summary AS
SELECT
  date(paid_at) AS date,
  count(*) AS transactions,
  sum(amount)::decimal(12,2) AS revenue,
  currency
FROM public.bookings
WHERE status = 'confirmed' AND paid_at IS NOT NULL
GROUP BY date(paid_at), currency
ORDER BY date DESC;
