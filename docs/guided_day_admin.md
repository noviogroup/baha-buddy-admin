# Guided Day Admin Notes

Admin scope for the guided day-plan module.

## Data managed by admin

- Plans
- Stops
- Route segments
- Feed cards
- Live rules
- Orders
- Guide sessions
- Guide events

## First admin screens

1. Plan list
2. Plan editor
3. Stop editor
4. Route preview
5. Feed card manager
6. Live rule manager
7. Detail preview
8. Analytics view

## Shared Supabase tables

- `cruise_itineraries`
- `cruise_itinerary_stops`
- `cruise_itinerary_route_segments`
- `cruise_itinerary_live_rules`
- `cruise_feed_items`
- `cruise_day_orders`
- `user_itinerary_sessions`
- `itinerary_session_events`

## Build notes

Use server-side admin API routes for writes. Keep the public app reading from the published views and keep session/event data tied to the current traveler account.
