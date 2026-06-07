-- Baha Buddy Admin — Supplemental Audit Hardening
-- Date: 2026-06-07
-- Purpose:
--   Supplements the already-applied admin core table migration.
--
-- Adds:
--   1. updated_at trigger helper
--   2. updated_at triggers for admin_users and admin_notes
--   3. append-only protection helper
--   4. append-only triggers for admin_audit_log and pii_access_log
--   5. admin_action_summary view for audit dashboard widgets
--
-- Safe to run after:
--   migrations/20260607_admin_core_tables.sql
--
-- This migration does not recreate admin tables or seed admin users.

-- ---------------------------------------------------------------------------
-- 1. updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 2. updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_admin_users ON public.admin_users;
CREATE TRIGGER set_updated_at_admin_users
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_admin_notes ON public.admin_notes;
CREATE TRIGGER set_updated_at_admin_notes
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. append-only protection helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_deny_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. % is not permitted.', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 4. append-only audit / PII triggers
-- ---------------------------------------------------------------------------
-- Audit logs should never be updated or deleted. Corrections should be written
-- as new audit events.
DROP TRIGGER IF EXISTS deny_update_admin_audit_log ON public.admin_audit_log;
CREATE TRIGGER deny_update_admin_audit_log
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_deny_mutation();

-- PII reveal logs should also be append-only.
DROP TRIGGER IF EXISTS deny_update_pii_access_log ON public.pii_access_log;
CREATE TRIGGER deny_update_pii_access_log
  BEFORE UPDATE OR DELETE ON public.pii_access_log
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_deny_mutation();

-- ---------------------------------------------------------------------------
-- 5. admin_action_summary view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_action_summary AS
SELECT
  admin_email,
  action,
  count(*)::int AS event_count,
  max(created_at) AS last_at,
  count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS events_7d,
  count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS events_30d
FROM public.admin_audit_log
GROUP BY admin_email, action
ORDER BY last_at DESC;

-- ---------------------------------------------------------------------------
-- Verification queries after running:
-- ---------------------------------------------------------------------------
-- select routine_name
-- from information_schema.routines
-- where routine_schema = 'public'
--   and routine_name in ('tg_set_updated_at', 'tg_deny_mutation')
-- order by routine_name;
--
-- select trigger_name, event_object_table
-- from information_schema.triggers
-- where trigger_schema = 'public'
--   and event_object_table in ('admin_users', 'admin_notes', 'admin_audit_log', 'pii_access_log')
-- order by event_object_table, trigger_name;
--
-- select table_name
-- from information_schema.views
-- where table_schema = 'public'
--   and table_name = 'admin_action_summary';
