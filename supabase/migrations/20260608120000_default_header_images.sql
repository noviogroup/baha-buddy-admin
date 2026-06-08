-- Default Header Image Media Library
-- Central fallback image system for Baha Buddy pages, islands, itineraries, businesses, and empty states.

create extension if not exists pgcrypto;

create table if not exists public.default_header_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  header_type text not null check (header_type in ('global', 'island', 'itinerary_category', 'business_type', 'empty_state')),
  scope_key text not null,
  island text,
  category text,
  business_type text,
  desktop_image_url text not null,
  mobile_image_url text,
  card_image_url text,
  app_detail_image_url text,
  alt_text text not null,
  is_active boolean not null default true,
  usage_count integer not null default 0,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  unique (header_type, scope_key)
);

create index if not exists default_header_images_lookup_idx on public.default_header_images (header_type, scope_key, is_active, sort_order);
create index if not exists default_header_images_island_idx on public.default_header_images (island) where island is not null;
create index if not exists default_header_images_category_idx on public.default_header_images (category) where category is not null;

create or replace function public.set_default_header_images_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_default_header_images_updated_at on public.default_header_images;
create trigger set_default_header_images_updated_at
before update on public.default_header_images
for each row execute function public.set_default_header_images_updated_at();

alter table public.default_header_images enable row level security;

drop policy if exists "Active default headers are public readable" on public.default_header_images;
create policy "Active default headers are public readable"
on public.default_header_images
for select
using (is_active = true);

comment on table public.default_header_images is 'Baha Buddy default header image library used by admin and client fallback header logic.';
