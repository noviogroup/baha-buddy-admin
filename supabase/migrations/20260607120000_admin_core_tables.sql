-- Baha Buddy Admin — Core Admin Tables
-- Date: 2026-06-07
-- Purpose:
--   Creates the missing admin database foundation expected by the admin panel:
--   - public.admin_users
--   - public.admin_audit_log
--   - public.pii_access_log
--   - public.admin_notes
--
-- Live finding:
--   No public table with name like '%admin%' currently exists in Supabase, while
--   src/lib/admin-auth.ts expects public.admin_users and src/lib/audit-log.ts
--   expects public.admin_audit_log and public.pii_access_log.
--
-- Apply carefully in Supabase SQL Editor or Supabase migrations.

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(active);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read own admin profile" ON public.admin_users;
CREATE POLICY "Admins can read own admin profile" ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;
CREATE POLICY "Service role can manage admin users" ON public.admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- ---------------------------------------------------------------------------
-- admin_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_email ON public.admin_audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage audit log" ON public.admin_audit_log;
CREATE POLICY "Service role can manage audit log" ON public.admin_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- ---------------------------------------------------------------------------
-- pii_access_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  field text NOT NULL,
  reason text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_admin_id ON public.pii_access_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_entity ON public.pii_access_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_created_at ON public.pii_access_log(created_at DESC);
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage pii access log" ON public.pii_access_log;
CREATE POLICY "Service role can manage pii access log" ON public.pii_access_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- ---------------------------------------------------------------------------
-- admin_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_entity ON public.admin_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON public.admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON public.admin_notes(created_at DESC);
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage admin notes" ON public.admin_notes;
CREATE POLICY "Service role can manage admin notes" ON public.admin_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- ---------------------------------------------------------------------------
-- Optional helper: touch updated_at manually from API routes until a global
-- trigger strategy is adopted.
-- ---------------------------------------------------------------------------;
