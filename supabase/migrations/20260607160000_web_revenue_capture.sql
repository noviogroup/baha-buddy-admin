-- Baha Buddy Web Revenue Capture Tables
-- Date: 2026-06-07
-- Purpose: Support concierge requests, partner applications, and travel-document leads.

create table if not exists public.concierge_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  trip_id uuid,
  offer_type text not null,
  price_usd numeric(10,2),
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  source text,
  traveler_name text,
  traveler_email text,
  travel_dates text,
  destination_interests text,
  party_size text,
  budget_range text,
  notes text,
  delivered_plan_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  category text not null,
  island_service_area text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website_url text,
  description text,
  booking_method text,
  interested_tier text,
  status text not null default 'new',
  source text default 'partners_page',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.travel_document_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  trip_id uuid,
  concierge_order_id uuid references public.concierge_orders(id),
  lead_type text,
  traveler_name text,
  traveler_email text not null,
  phone text,
  nationality text,
  destination text default 'Bahamas',
  travel_dates text,
  party_size text,
  notes text,
  source text,
  status text not null default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.concierge_orders enable row level security;
alter table public.partner_applications enable row level security;
alter table public.travel_document_leads enable row level security;
-- Public lead capture policies. These allow future web API routes using the anon key to insert.
-- Admin reads and updates should be handled by admin portal service-role access or future role policies.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'concierge_orders'
      and policyname = 'Allow public concierge order insert'
  ) then
    create policy "Allow public concierge order insert"
      on public.concierge_orders for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'partner_applications'
      and policyname = 'Allow public partner application insert'
  ) then
    create policy "Allow public partner application insert"
      on public.partner_applications for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'travel_document_leads'
      and policyname = 'Allow public travel document lead insert'
  ) then
    create policy "Allow public travel document lead insert"
      on public.travel_document_leads for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
create index if not exists concierge_orders_status_idx on public.concierge_orders(status);
create index if not exists concierge_orders_created_at_idx on public.concierge_orders(created_at desc);
create index if not exists partner_applications_status_idx on public.partner_applications(status);
create index if not exists partner_applications_created_at_idx on public.partner_applications(created_at desc);
create index if not exists travel_document_leads_status_idx on public.travel_document_leads(status);
create index if not exists travel_document_leads_created_at_idx on public.travel_document_leads(created_at desc);
