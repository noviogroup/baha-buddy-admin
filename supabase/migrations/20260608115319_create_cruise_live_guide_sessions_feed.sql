create table if not exists public.cruise_itinerary_live_rules (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.cruise_itineraries(id) on delete cascade,
  rule_name text not null,
  trigger_type text not null,
  trigger_value jsonb not null default '{}'::jsonb,
  action_type text not null,
  severity text not null default 'info',
  traveler_message text not null,
  admin_note text,
  priority integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cruise_feed_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  item_type text not null,
  itinerary_id uuid references public.cruise_itineraries(id) on delete set null,
  stop_id uuid references public.cruise_itinerary_stops(id) on delete set null,
  partner_id uuid,
  image_url text,
  cta_label text,
  cta_url text,
  priority integer not null default 1,
  conditions jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cruise_day_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  itinerary_id uuid references public.cruise_itineraries(id),
  customer_name text,
  customer_email text,
  product_tier text not null default 'basic',
  ship_name text,
  arrival_time time,
  departure_time time,
  all_aboard_time time,
  visit_date date,
  group_size integer,
  adults integer,
  children integer,
  budget_per_person numeric(10,2),
  mobility_level text,
  interests text[] not null default '{}',
  payment_status text not null default 'pending',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  generated_itinerary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_itinerary_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  order_id uuid references public.cruise_day_orders(id) on delete set null,
  itinerary_id uuid not null references public.cruise_itineraries(id),
  current_stop_id uuid references public.cruise_itinerary_stops(id),
  status text not null default 'not_started',
  ship_name text,
  visit_date date,
  ship_departure_at timestamptz,
  all_aboard_at timestamptz,
  recommended_return_at timestamptz,
  latest_safe_departure_at timestamptz,
  last_latitude numeric(10,7),
  last_longitude numeric(10,7),
  last_location_accuracy_meters numeric(10,2),
  last_location_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itinerary_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.user_itinerary_sessions(id) on delete cascade,
  event_type text not null,
  stop_id uuid references public.cruise_itinerary_stops(id) on delete set null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_meters numeric(10,2),
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cruise_feed_items_active_priority on public.cruise_feed_items(is_active, priority);
create index if not exists idx_cruise_day_orders_user on public.cruise_day_orders(user_id, created_at desc);
create index if not exists idx_user_itinerary_sessions_user_status on public.user_itinerary_sessions(user_id, status);
create index if not exists idx_itinerary_session_events_session_created on public.itinerary_session_events(session_id, created_at desc);

alter table public.cruise_itinerary_live_rules enable row level security;
alter table public.cruise_feed_items enable row level security;
alter table public.cruise_day_orders enable row level security;
alter table public.user_itinerary_sessions enable row level security;
alter table public.itinerary_session_events enable row level security;;
