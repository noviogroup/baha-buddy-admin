create extension if not exists pgcrypto;

create table if not exists public.cruise_itineraries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  island text not null default 'New Providence',
  area text not null default 'Nassau',
  itinerary_type text not null default 'cruise_day',
  traveler_types text[] not null default '{}',
  interests text[] not null default '{}',
  duration_min_minutes integer not null default 180,
  duration_max_minutes integer not null default 360,
  mobility_level text not null default 'moderate',
  budget_level text not null default 'moderate',
  base_price numeric(10,2) not null default 9.99,
  personalized_price numeric(10,2) not null default 19.99,
  concierge_price numeric(10,2),
  hero_image_url text,
  default_return_buffer_minutes integer not null default 90,
  supports_live_guide boolean not null default true,
  supports_google_maps_fallback boolean not null default true,
  supports_mapbox_navigation boolean not null default true,
  status text not null default 'draft',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cruise_itinerary_stops (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.cruise_itineraries(id) on delete cascade,
  stop_order integer not null,
  name text not null,
  stop_type text not null default 'attraction',
  address text,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  google_place_id text references public.google_places(id),
  partner_id uuid,
  suggested_arrival_offset_minutes integer,
  suggested_duration_minutes integer not null default 20,
  description text,
  baha_tip text,
  best_photo_spot text,
  estimated_cost numeric(10,2),
  cost_note text,
  is_required boolean not null default true,
  is_partner_stop boolean not null default false,
  kid_friendly boolean not null default false,
  bathroom_available boolean not null default false,
  food_available boolean not null default false,
  accessibility_notes text,
  safety_notes text,
  image_urls text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (itinerary_id, stop_order)
);

create table if not exists public.cruise_itinerary_route_segments (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.cruise_itineraries(id) on delete cascade,
  from_stop_id uuid references public.cruise_itinerary_stops(id) on delete cascade,
  to_stop_id uuid references public.cruise_itinerary_stops(id) on delete cascade,
  segment_order integer not null,
  travel_mode text not null default 'walking',
  distance_meters integer,
  estimated_duration_minutes integer,
  route_provider text not null default 'mapbox',
  encoded_polyline text,
  fallback_google_maps_url text,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (itinerary_id, segment_order)
);

create index if not exists idx_cruise_itineraries_status_type on public.cruise_itineraries(status, itinerary_type);
create index if not exists idx_cruise_itinerary_stops_itinerary_order on public.cruise_itinerary_stops(itinerary_id, stop_order);
create index if not exists idx_cruise_route_segments_itinerary_order on public.cruise_itinerary_route_segments(itinerary_id, segment_order);

alter table public.cruise_itineraries enable row level security;
alter table public.cruise_itinerary_stops enable row level security;
alter table public.cruise_itinerary_route_segments enable row level security;;
