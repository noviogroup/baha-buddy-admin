-- Baha Buddy — Concierge Orders Admin Operations
-- Supplemental non-destructive admin fields for paid concierge fulfillment.

alter table public.concierge_orders
  add column if not exists assigned_team_member text,
  add column if not exists internal_notes text,
  add column if not exists final_itinerary text,
  add column if not exists stripe_metadata jsonb not null default '{}'::jsonb,
  add column if not exists delivered_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists fulfillment_started_at timestamptz;

create index if not exists idx_concierge_orders_status on public.concierge_orders(status);
create index if not exists idx_concierge_orders_payment_status on public.concierge_orders(payment_status);
create index if not exists idx_concierge_orders_offer_type on public.concierge_orders(offer_type);
create index if not exists idx_concierge_orders_source on public.concierge_orders(source);
create index if not exists idx_concierge_orders_created_at on public.concierge_orders(created_at desc);
create index if not exists idx_concierge_orders_stripe_session on public.concierge_orders(stripe_checkout_session_id);
create index if not exists idx_concierge_orders_stripe_payment_intent on public.concierge_orders(stripe_payment_intent_id);

create or replace view public.v_concierge_order_metrics as
select
  offer_type,
  source,
  status,
  payment_status,
  count(*)::int as order_count,
  coalesce(sum(price_usd), 0)::numeric as revenue_usd,
  count(*) filter (where status = 'paid')::int as paid_count,
  count(*) filter (where status = 'in_review')::int as in_review_count,
  count(*) filter (where status = 'in_progress')::int as in_progress_count,
  count(*) filter (where status = 'delivered')::int as delivered_count,
  count(*) filter (where status in ('refunded','payment_failed','cancelled'))::int as failed_or_refunded_count
from public.concierge_orders
group by offer_type, source, status, payment_status;

comment on table public.concierge_orders is 'Paid concierge order queue created from Stripe Checkout and fulfilled by the admin team.';
comment on column public.concierge_orders.assigned_team_member is 'Admin/team member assigned to fulfill the concierge order.';
comment on column public.concierge_orders.internal_notes is 'Private admin fulfillment notes.';
comment on column public.concierge_orders.final_itinerary is 'Final itinerary text or delivery content pasted by admin.';
comment on column public.concierge_orders.delivered_plan_url is 'URL to the delivered concierge plan when hosted externally.';
comment on column public.concierge_orders.stripe_metadata is 'Stripe Checkout metadata including product, offer_id, and source.';
comment on view public.v_concierge_order_metrics is 'Concierge order reporting view for revenue, status, payment status, offer, and source metrics.';;
