-- Baha Buddy — Canonical Places Foundation
-- Non-destructive migration: creates canonical tables and views only.

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  category text not null,
  subcategory text,
  island_id text,
  island_name text,
  address text,
  latitude numeric,
  longitude numeric,
  phone text,
  website text,
  description text,
  primary_image_url text,
  rating numeric,
  review_count integer not null default 0,
  price_level text,
  status text not null default 'active' check (status in ('draft', 'active', 'hidden', 'archived')),
  is_active boolean not null default true,
  is_verified boolean not null default false,
  is_partner boolean not null default false,
  source_priority text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_sources (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  source text not null,
  source_table text,
  source_record_id text,
  source_location_id text,
  source_url text,
  source_rating numeric,
  source_review_count integer,
  source_price_level text,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  constraint place_sources_unique_source_location unique (source, source_location_id)
);

create index if not exists idx_places_category on public.places(category);
create index if not exists idx_places_island_id on public.places(island_id);
create index if not exists idx_places_island_name on public.places(island_name);
create index if not exists idx_places_status on public.places(status);
create index if not exists idx_places_active on public.places(is_active);
create index if not exists idx_places_partner on public.places(is_partner);
create index if not exists idx_places_verified on public.places(is_verified);
create index if not exists idx_places_rating on public.places(rating desc nulls last);
create index if not exists idx_place_sources_place_id on public.place_sources(place_id);
create index if not exists idx_place_sources_source on public.place_sources(source);
create index if not exists idx_place_sources_source_record_id on public.place_sources(source_record_id);

alter table public.places enable row level security;
alter table public.place_sources enable row level security;

drop policy if exists "Public can read active places" on public.places;
create policy "Public can read active places"
on public.places
for select
to anon, authenticated
using (is_active = true and status = 'active');

drop policy if exists "Authenticated can read place sources" on public.place_sources;
create policy "Authenticated can read place sources"
on public.place_sources
for select
to authenticated
using (true);

drop policy if exists "Service role can manage places" on public.places;
create policy "Service role can manage places"
on public.places
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage place sources" on public.place_sources;
create policy "Service role can manage place sources"
on public.place_sources
for all
to service_role
using (true)
with check (true);

create or replace function public.tg_places_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_places on public.places;
create trigger set_updated_at_places
before update on public.places
for each row
execute function public.tg_places_set_updated_at();

create or replace view public.v_places_hotels as
select * from public.places
where is_active = true and status = 'active' and category = 'hotel';

create or replace view public.v_places_restaurants as
select * from public.places
where is_active = true and status = 'active' and category = 'restaurant';

create or replace view public.v_places_activities as
select * from public.places
where is_active = true and status = 'active' and category in ('activity', 'attraction', 'tour', 'beach');

create or replace view public.v_places_search as
select * from public.places
where is_active = true and status = 'active';
;
