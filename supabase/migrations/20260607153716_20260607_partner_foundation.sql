-- Baha Buddy — Partner Foundation
-- Purpose: create the supply-side partner tables used by the admin command center.
-- Non-destructive: no existing data is modified.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  partner_type text not null default 'vendor',
  tier text not null default 'standard' check (tier in ('free', 'standard', 'featured', 'premium', 'sponsor')),
  status text not null default 'prospect' check (status in ('prospect', 'active', 'paused', 'churned', 'archived')),
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  island_name text,
  description text,
  commission_model text,
  commission_rate numeric,
  monthly_subscription_amount numeric default 0,
  currency text not null default 'USD',
  is_featured boolean not null default false,
  is_sponsored boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_places (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  relationship_type text not null default 'owner_operator',
  created_at timestamptz not null default now(),
  unique (partner_id, place_id)
);

create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  user_id uuid,
  trip_id uuid,
  source text not null default 'admin',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'lost', 'closed')),
  lead_type text,
  estimated_value numeric,
  currency text not null default 'USD',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  campaign_type text not null default 'sponsored_placement',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  budget_amount numeric default 0,
  currency text not null default 'USD',
  impressions integer not null default 0,
  clicks integer not null default 0,
  leads integer not null default 0,
  conversions integer not null default 0,
  revenue_amount numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  booking_id uuid,
  amount numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  payout_period_start date,
  payout_period_end date,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partners_status on public.partners(status);
create index if not exists idx_partners_tier on public.partners(tier);
create index if not exists idx_partners_type on public.partners(partner_type);
create index if not exists idx_partners_island on public.partners(island_name);
create index if not exists idx_partner_places_partner on public.partner_places(partner_id);
create index if not exists idx_partner_places_place on public.partner_places(place_id);
create index if not exists idx_partner_leads_partner on public.partner_leads(partner_id);
create index if not exists idx_partner_leads_status on public.partner_leads(status);
create index if not exists idx_partner_leads_created_at on public.partner_leads(created_at desc);
create index if not exists idx_partner_campaigns_partner on public.partner_campaigns(partner_id);
create index if not exists idx_partner_campaigns_status on public.partner_campaigns(status);
create index if not exists idx_partner_payouts_partner on public.partner_payouts(partner_id);
create index if not exists idx_partner_payouts_status on public.partner_payouts(status);

alter table public.partners enable row level security;
alter table public.partner_places enable row level security;
alter table public.partner_leads enable row level security;
alter table public.partner_campaigns enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists "Public can read active partners" on public.partners;
create policy "Public can read active partners"
on public.partners
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Authenticated can read partner place links" on public.partner_places;
create policy "Authenticated can read partner place links"
on public.partner_places
for select
to authenticated
using (true);

drop policy if exists "Service role can manage partners" on public.partners;
create policy "Service role can manage partners"
on public.partners
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage partner places" on public.partner_places;
create policy "Service role can manage partner places"
on public.partner_places
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage partner leads" on public.partner_leads;
create policy "Service role can manage partner leads"
on public.partner_leads
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage partner campaigns" on public.partner_campaigns;
create policy "Service role can manage partner campaigns"
on public.partner_campaigns
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage partner payouts" on public.partner_payouts;
create policy "Service role can manage partner payouts"
on public.partner_payouts
for all
to service_role
using (true)
with check (true);

create or replace function public.tg_partners_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_partners on public.partners;
create trigger set_updated_at_partners
before update on public.partners
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_leads on public.partner_leads;
create trigger set_updated_at_partner_leads
before update on public.partner_leads
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_campaigns on public.partner_campaigns;
create trigger set_updated_at_partner_campaigns
before update on public.partner_campaigns
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_payouts on public.partner_payouts;
create trigger set_updated_at_partner_payouts
before update on public.partner_payouts
for each row execute function public.tg_partners_set_updated_at();

create or replace view public.v_partner_performance as
select
  p.id,
  p.name,
  p.partner_type,
  p.tier,
  p.status,
  p.is_featured,
  p.is_sponsored,
  p.island_name,
  count(distinct pp.place_id)::int as linked_places,
  count(distinct pl.id)::int as total_leads,
  count(distinct pl.id) filter (where pl.status = 'converted')::int as converted_leads,
  count(distinct pc.id)::int as campaigns,
  coalesce(sum(pc.revenue_amount), 0)::numeric as campaign_revenue,
  coalesce(sum(po.amount) filter (where po.status = 'paid'), 0)::numeric as paid_payouts
from public.partners p
left join public.partner_places pp on pp.partner_id = p.id
left join public.partner_leads pl on pl.partner_id = p.id
left join public.partner_campaigns pc on pc.partner_id = p.id
left join public.partner_payouts po on po.partner_id = p.id
group by p.id;

comment on table public.partners is 'Supply-side partner profiles for hotels, restaurants, tour operators, transportation providers, guides, and sponsors.';
comment on table public.partner_places is 'Links partners to canonical Baha Buddy places.';
comment on table public.partner_leads is 'Partner lead and referral tracking from chat, explore, content, concierge, and admin workflows.';
comment on table public.partner_campaigns is 'Sponsored placements, deals, campaigns, and promotional performance for partners.';
comment on table public.partner_payouts is 'Partner commission and payout tracking.';
comment on view public.v_partner_performance is 'Admin reporting view for partner leads, campaigns, linked places, revenue, and payouts.';;
