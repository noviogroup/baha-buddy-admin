drop view if exists public.cruise_itinerary_detail;
drop view if exists public.published_cruise_itineraries;

create view public.published_cruise_itineraries
with (security_invoker = true)
as
select i.*, coalesce(count(s.id), 0) as stop_count
from public.cruise_itineraries i
left join public.cruise_itinerary_stops s on s.itinerary_id = i.id
where i.status = 'published'
group by i.id;

create view public.cruise_itinerary_detail
with (security_invoker = true)
as
select
  i.*,
  coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'stop_order', s.stop_order,
    'name', s.name,
    'stop_type', s.stop_type,
    'address', s.address,
    'latitude', s.latitude,
    'longitude', s.longitude,
    'google_place_id', s.google_place_id,
    'suggested_arrival_offset_minutes', s.suggested_arrival_offset_minutes,
    'suggested_duration_minutes', s.suggested_duration_minutes,
    'description', s.description,
    'baha_tip', s.baha_tip,
    'estimated_cost', s.estimated_cost,
    'is_required', s.is_required,
    'kid_friendly', s.kid_friendly,
    'bathroom_available', s.bathroom_available,
    'food_available', s.food_available,
    'accessibility_notes', s.accessibility_notes,
    'safety_notes', s.safety_notes,
    'image_urls', s.image_urls
  ) order by s.stop_order) filter (where s.id is not null), '[]'::jsonb) as stops
from public.cruise_itineraries i
left join public.cruise_itinerary_stops s on s.itinerary_id = i.id
where i.status = 'published'
group by i.id;

drop policy if exists "Public can read published cruise itineraries" on public.cruise_itineraries;
create policy "Public can read published cruise itineraries"
on public.cruise_itineraries for select
using (status = 'published');

drop policy if exists "Public can read published cruise stops" on public.cruise_itinerary_stops;
create policy "Public can read published cruise stops"
on public.cruise_itinerary_stops for select
using (exists (select 1 from public.cruise_itineraries i where i.id = itinerary_id and i.status = 'published'));

drop policy if exists "Public can read published route segments" on public.cruise_itinerary_route_segments;
create policy "Public can read published route segments"
on public.cruise_itinerary_route_segments for select
using (exists (select 1 from public.cruise_itineraries i where i.id = itinerary_id and i.status = 'published'));

drop policy if exists "Public can read active feed items" on public.cruise_feed_items;
create policy "Public can read active feed items"
on public.cruise_feed_items for select
using (is_active = true);

drop policy if exists "Users can read own cruise day orders" on public.cruise_day_orders;
create policy "Users can read own cruise day orders"
on public.cruise_day_orders for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own cruise day orders" on public.cruise_day_orders;
create policy "Users can create own cruise day orders"
on public.cruise_day_orders for insert
with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can read own itinerary sessions" on public.user_itinerary_sessions;
create policy "Users can read own itinerary sessions"
on public.user_itinerary_sessions for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own itinerary sessions" on public.user_itinerary_sessions;
create policy "Users can create own itinerary sessions"
on public.user_itinerary_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own itinerary sessions" on public.user_itinerary_sessions;
create policy "Users can update own itinerary sessions"
on public.user_itinerary_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own itinerary session events" on public.itinerary_session_events;
create policy "Users can read own itinerary session events"
on public.itinerary_session_events for select
using (exists (select 1 from public.user_itinerary_sessions s where s.id = session_id and s.user_id = auth.uid()));

drop policy if exists "Users can create own itinerary session events" on public.itinerary_session_events;
create policy "Users can create own itinerary session events"
on public.itinerary_session_events for insert
with check (exists (select 1 from public.user_itinerary_sessions s where s.id = session_id and s.user_id = auth.uid()));;
