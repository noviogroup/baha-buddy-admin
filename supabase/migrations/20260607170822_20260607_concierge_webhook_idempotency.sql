-- Baha Buddy — Concierge Stripe Webhook Idempotency
-- Tracks processed Stripe events so checkout.session.completed can be handled safely.

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_for text,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_events_type on public.stripe_webhook_events(event_type);
create index if not exists idx_stripe_webhook_events_processed_for on public.stripe_webhook_events(processed_for);
create index if not exists idx_stripe_webhook_events_processed_at on public.stripe_webhook_events(processed_at desc);

comment on table public.stripe_webhook_events is 'Processed Stripe webhook events for idempotency and concierge order reconciliation.';;
