
-- Schedule tripadvisor-seeder to run every Sunday at 3:00 AM UTC
-- Uses CRON_TRIGGER_SECRET stored in vault for authentication
SELECT cron.schedule(
  'tripadvisor-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://cxcfymhoncysyloutvkh.supabase.co/functions/v1/tripadvisor-seeder',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'cron_trigger_secret'
        LIMIT 1
      )
    )::jsonb,
    body := '{"limit": 32}'::jsonb
  )
  $$
);
;
