insert into public.cruise_itineraries
  (title, slug, short_description, full_description, traveler_types, interests, duration_min_minutes, duration_max_minutes, mobility_level, budget_level, base_price, personalized_price, concierge_price, status)
values
  ('Culture, History & Heritage Walk', 'culture-history-heritage-walk', 'A self-guided Nassau walking route focused on landmarks, culture, and local heritage.', 'A cultural Nassau route for travelers who want more than beach and shopping, with historic stops, local context, and enough buffer to return to the ship.', array['history lovers','culture travelers','repeat visitors'], array['history','culture','walking','crafts'], 210, 270, 'moderate', 'low', 9.99, 19.99, 49.99, 'draft'),
  ('Family-Friendly Nassau Day', 'family-friendly-nassau-day', 'A flexible low-stress Nassau plan for families with children and multi-generational groups.', 'A family-friendly Nassau route designed around short distances, bathrooms, food options, flexible stops, and a conservative return-to-ship buffer.', array['families','grandparents','multi-generational groups'], array['family','beach','food','easy walking'], 180, 300, 'low', 'moderate', 14.99, 24.99, 59.99, 'draft'),
  ('Budget Nassau Day', 'budget-nassau-day', 'A low-cost Nassau route with landmarks, photos, light shopping, and beach time.', 'A simple budget-conscious Nassau cruise day for travelers who want to enjoy the island without overspending.', array['budget travelers','students','solo travelers'], array['budget','walking','beach','shopping'], 180, 300, 'moderate', 'low', 9.99, 19.99, 49.99, 'draft'),
  ('Couples Relaxed Nassau Escape', 'couples-relaxed-nassau-escape', 'A slower Nassau day for couples with beach time, food, scenic stops, and shopping.', 'A relaxed cruise-day experience for couples who want Nassau to feel easy, scenic, and not rushed.', array['couples','honeymooners','anniversary travelers'], array['romance','beach','food','relaxation'], 240, 360, 'low', 'premium', 14.99, 24.99, 69.99, 'draft'),
  ('Adventure Lite Nassau in Motion', 'adventure-lite-nassau-in-motion', 'An active Nassau plan for travelers who want movement, photos, and a faster-paced day.', 'A more energetic Nassau day for younger travelers, friend groups, and active visitors who still need cruise-safe timing.', array['friend groups','active couples','younger travelers'], array['adventure','photos','beach','food'], 240, 360, 'active', 'premium', 14.99, 24.99, 69.99, 'draft'),
  ('Shopping, Souvenirs & Local Finds', 'shopping-souvenirs-local-finds', 'A downtown Nassau shopping route for gifts, crafts, sweets, and easy stops close to port.', 'A short and flexible shopping-first plan for cruise passengers who want souvenirs and local finds without going far from the ship.', array['shoppers','gift buyers','short port windows'], array['shopping','crafts','food','walking'], 150, 240, 'low', 'moderate', 9.99, 19.99, 49.99, 'draft'),
  ('Premium Private Nassau Day', 'premium-private-nassau-day', 'A custom-feeling Nassau day built around comfort, private transport, and curated stops.', 'A premium cruise-day product for families, groups, executives, and high-spend visitors who want comfort, privacy, and a smooth schedule.', array['premium travelers','families','groups','executives'], array['premium','private','food','beach','scenic'], 240, 360, 'custom', 'premium', 24.99, 49.99, 99.99, 'draft')
on conflict (slug) do nothing;

insert into public.cruise_feed_items (title, description, item_type, itinerary_id, priority, cta_label)
select title, short_description, 'itinerary', id, 10, 'Start Plan'
from public.cruise_itineraries
where slug in (
  'culture-history-heritage-walk',
  'family-friendly-nassau-day',
  'budget-nassau-day',
  'couples-relaxed-nassau-escape',
  'adventure-lite-nassau-in-motion',
  'shopping-souvenirs-local-finds',
  'premium-private-nassau-day'
);;
