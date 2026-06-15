create or replace view public.published_cruise_itineraries as
select i.*, coalesce(count(s.id), 0) as stop_count
from public.cruise_itineraries i
left join public.cruise_itinerary_stops s on s.itinerary_id = i.id
where i.status = 'published'
group by i.id;

create or replace view public.cruise_itinerary_detail as
select
  i.*,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
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
      ) order by s.stop_order
    ) filter (where s.id is not null),
    '[]'::jsonb
  ) as stops
from public.cruise_itineraries i
left join public.cruise_itinerary_stops s on s.itinerary_id = i.id
where i.status = 'published'
group by i.id;

insert into public.cruise_itineraries
  (title, slug, short_description, full_description, traveler_types, interests, duration_min_minutes, duration_max_minutes, mobility_level, budget_level, base_price, personalized_price, concierge_price, status)
values
  ('Nassau First-Timer Day', 'nassau-first-timer-day', 'History, beach, food, and shopping in one cruise-safe Nassau route.', 'A balanced Nassau cruise-day route for first-time visitors who want key landmarks, local flavor, beach time, and a safe return-to-ship buffer.', array['first-time visitors','couples','small groups'], array['history','food','shopping','beach'], 240, 300, 'moderate', 'moderate', 9.99, 19.99, 49.99, 'draft'),
  ('Beach Day Without Stress', 'beach-day-without-stress', 'A simple beach-first plan with timing, food, and safe return guidance.', 'A low-stress Nassau beach day for cruise passengers who want sun, water, food, and clear return-to-ship timing.', array['families','couples','beach lovers'], array['beach','relaxation','food'], 180, 300, 'low', 'moderate', 9.99, 19.99, 49.99, 'draft'),
  ('Bahamian Food & Flavor Trail', 'bahamian-food-flavor-trail', 'Local bites, sweets, seafood, and cultural stops near the cruise route.', 'A food-focused Nassau itinerary that helps travelers taste local flavors while staying aware of time and distance from the ship.', array['foodies','couples','friend groups'], array['food','culture','shopping'], 180, 300, 'moderate', 'moderate', 14.99, 24.99, 59.99, 'draft')
on conflict (slug) do nothing;

insert into public.cruise_feed_items (title, description, item_type, itinerary_id, priority, cta_label)
select title, short_description, 'itinerary', id, 10, 'Start Plan'
from public.cruise_itineraries
where slug in ('nassau-first-timer-day','beach-day-without-stress','bahamian-food-flavor-trail');;
