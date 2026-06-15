-- Baha Buddy — Booking Financial Operations
-- Non-destructive migration for admin revenue/margin/payout tracking.

alter table public.bookings
  add column if not exists gross_booking_value numeric,
  add column if not exists net_revenue numeric,
  add column if not exists platform_fee numeric,
  add column if not exists commission_amount numeric,
  add column if not exists partner_payout_amount numeric,
  add column if not exists partner_id uuid references public.partners(id) on delete set null,
  add column if not exists payout_status text not null default 'not_applicable' check (payout_status in ('not_applicable', 'pending', 'approved', 'paid', 'cancelled')),
  add column if not exists external_reference text,
  add column if not exists revenue_notes text,
  add column if not exists financial_metadata jsonb not null default '{}'::jsonb;

update public.bookings
set gross_booking_value = coalesce(gross_booking_value, amount),
    net_revenue = coalesce(net_revenue, amount),
    platform_fee = coalesce(platform_fee, 0),
    commission_amount = coalesce(commission_amount, 0),
    partner_payout_amount = coalesce(partner_payout_amount, 0)
where gross_booking_value is null
   or net_revenue is null
   or platform_fee is null
   or commission_amount is null
   or partner_payout_amount is null;

create index if not exists idx_bookings_partner_id on public.bookings(partner_id);
create index if not exists idx_bookings_payout_status on public.bookings(payout_status);
create index if not exists idx_bookings_booking_type on public.bookings(booking_type);
create index if not exists idx_bookings_provider on public.bookings(provider);
create index if not exists idx_bookings_status_created_at on public.bookings(status, created_at desc);

create or replace view public.v_booking_financials as
select
  b.id,
  b.user_id,
  b.trip_id,
  b.booking_type,
  b.provider,
  b.status,
  b.currency,
  b.amount,
  coalesce(b.gross_booking_value, b.amount, 0) as gross_booking_value,
  coalesce(b.net_revenue, b.amount, 0) as net_revenue,
  coalesce(b.platform_fee, 0) as platform_fee,
  coalesce(b.commission_amount, 0) as commission_amount,
  coalesce(b.partner_payout_amount, 0) as partner_payout_amount,
  coalesce(b.gross_booking_value, b.amount, 0) - coalesce(b.partner_payout_amount, 0) as gross_margin_after_payout,
  b.partner_id,
  p.name as partner_name,
  p.status as partner_status,
  p.tier as partner_tier,
  b.payout_status,
  b.stripe_payment_intent_id,
  b.external_reference,
  b.reference_id,
  b.paid_at,
  b.created_at,
  b.updated_at
from public.bookings b
left join public.partners p on p.id = b.partner_id;

comment on column public.bookings.gross_booking_value is 'Total traveler-facing booking value before payouts or internal revenue allocations.';
comment on column public.bookings.net_revenue is 'Estimated Baha Buddy retained revenue for the booking.';
comment on column public.bookings.platform_fee is 'Platform/service fee component retained by Baha Buddy.';
comment on column public.bookings.commission_amount is 'Commission amount earned on the booking when applicable.';
comment on column public.bookings.partner_payout_amount is 'Estimated or approved amount owed to a partner for this booking.';
comment on column public.bookings.partner_id is 'Optional partner associated with this booking.';
comment on column public.bookings.payout_status is 'Partner payout lifecycle for this booking.';
comment on view public.v_booking_financials is 'Admin reporting view for booking revenue, margin, partner payout, and partner association.';;
