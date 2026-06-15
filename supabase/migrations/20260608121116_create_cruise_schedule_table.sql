-- Create cruise_schedule table for Nassau Cruise Port ship schedules
create table public.cruise_schedule (
  id uuid primary key default gen_random_uuid(),
  port_of_call text not null default 'Nassau',
  ship_name text not null,
  cruise_line text not null,
  arrival_at timestamptz not null,
  departure_at timestamptz not null,
  capacity integer,
  berth text,
  synced_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for common queries
create index cruise_schedule_arrival_idx on public.cruise_schedule (arrival_at);
create index cruise_schedule_ship_idx on public.cruise_schedule (ship_name);

-- Unique constraint for upsert conflict target
create unique index cruise_schedule_ship_arrival_uidx on public.cruise_schedule (ship_name, arrival_at);

-- Enable RLS
alter table public.cruise_schedule enable row level security;

-- Public read: anon and authenticated roles can read
create policy "public read cruise_schedule"
  on public.cruise_schedule
  for select
  to anon, authenticated
  using (true);

-- No direct writes from client — service role only (Edge Function)
-- (No insert/update/delete policies needed; service role bypasses RLS);
