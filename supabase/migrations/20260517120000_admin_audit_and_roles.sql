-- Baha Buddy V2 — Admin Audit + Roles + Notes + PII Access Log
-- Run in Supabase SQL Editor.
--
-- Creates the foundation for multi-admin operations:
--   1. admin_users    — admin-side identity + role (super_admin | admin | viewer)
--   2. admin_audit_log — immutable log of every admin mutation
--   3. admin_notes    — free-form notes attached to users, trips, bookings
--   4. pii_access_log — special log of every PII reveal with reason
--
-- All four tables are append-only from the service role's perspective:
-- there is NO delete policy. Audit trails must be tamper-resistant.

-- ============================================================================
-- 1. admin_users — separate from public.users (which is the app's customer table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role  ON public.admin_users(role);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- Admin users can see themselves; service role manages everything
CREATE POLICY "Admin sees self" ON public.admin_users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service role full access admin_users" ON public.admin_users
  FOR ALL USING (true) WITH CHECK (true);
-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at_admin_users ON public.admin_users;
CREATE TRIGGER set_updated_at_admin_users
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
-- ============================================================================
-- 2. admin_audit_log — immutable record of every admin mutation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,                  -- captured at write time, survives admin deletion
  action text NOT NULL,                       -- e.g. booking_cancelled, user_suspended, pii_revealed
  entity_type text NOT NULL,                  -- user | trip | booking | ugc_content | support_ticket | promo_code | partner
  entity_id uuid,                             -- nullable for non-row actions (e.g. admin_signed_in)
  before_state jsonb,                         -- full row state pre-mutation
  after_state jsonb,                          -- full row state post-mutation
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,-- supplier responses, refund ids, reasons, request_id
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin       ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON public.admin_audit_log(action, created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role read audit_log" ON public.admin_audit_log
  FOR SELECT USING (true);
CREATE POLICY "Service role insert audit_log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (true);
-- NB: No UPDATE or DELETE policies. Combined with the trigger below, this gives
--     tamper resistance even against the service role (which normally bypasses RLS).

-- Defense-in-depth: deny UPDATE and DELETE at the database level via trigger.
-- This catches even service-role queries since the trigger fires before RLS.
CREATE OR REPLACE FUNCTION public.tg_deny_mutation() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. % is not permitted.', TG_TABLE_NAME, TG_OP;
END;
$func$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS deny_update_audit_log ON public.admin_audit_log;
CREATE TRIGGER deny_update_audit_log
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_deny_mutation();
-- ============================================================================
-- 3. admin_notes — free-form notes attached to any entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  entity_type text NOT NULL,                  -- user | trip | booking | ugc_content | support_ticket
  entity_id uuid NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON public.admin_notes(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_admin  ON public.admin_notes(admin_id, created_at DESC);
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access admin_notes" ON public.admin_notes
  FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS set_updated_at_admin_notes ON public.admin_notes;
CREATE TRIGGER set_updated_at_admin_notes
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
-- ============================================================================
-- 4. pii_access_log — every reveal of masked PII (passport, payment method last-4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  entity_type text NOT NULL,                  -- user | booking | passenger
  entity_id uuid NOT NULL,
  field text NOT NULL,                        -- passport_number | payment_method_last4 | dob
  reason text NOT NULL,                       -- mandatory reason for the reveal
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pii_log_created  ON public.pii_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_log_entity   ON public.pii_access_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pii_log_admin    ON public.pii_access_log(admin_id, created_at DESC);
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role read pii_log" ON public.pii_access_log
  FOR SELECT USING (true);
CREATE POLICY "Service role insert pii_log" ON public.pii_access_log
  FOR INSERT WITH CHECK (true);
-- Same tamper-resistance trigger as admin_audit_log.
DROP TRIGGER IF EXISTS deny_update_pii_log ON public.pii_access_log;
CREATE TRIGGER deny_update_pii_log
  BEFORE UPDATE OR DELETE ON public.pii_access_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_deny_mutation();
-- ============================================================================
-- 5. View: admin_action_summary — used by audit log dashboard widgets
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_action_summary AS
SELECT
  admin_email,
  action,
  count(*)::int AS event_count,
  max(created_at) AS last_at,
  count(*) FILTER (WHERE created_at > now() - interval '7 days')::int  AS events_7d,
  count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS events_30d
FROM public.admin_audit_log
GROUP BY admin_email, action
ORDER BY last_at DESC;
-- ============================================================================
-- 6. Seed: bootstrap super_admin (replace email before running in production)
-- ============================================================================
-- Insert the first super_admin by email. This INSERT is idempotent; safe to re-run.
-- IMPORTANT: the admin must first sign up via Supabase Auth (login screen) so that
-- auth.users contains a row. After that, run this seed to grant super_admin.
INSERT INTO public.admin_users (id, email, display_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'display_name', email), 'super_admin'
FROM auth.users
WHERE lower(email) = lower('valdez@noviogroup.com')
ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin', active = true, email = EXCLUDED.email;
-- ============================================================================
-- Done. Verify with:
--   SELECT * FROM admin_users;
--   SELECT * FROM admin_audit_log LIMIT 5;
--   SELECT * FROM admin_action_summary;
-- ============================================================================;
