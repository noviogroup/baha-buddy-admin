comment on table public.places is 'Canonical Baha Buddy place records used by web, mobile, chat, admin, tours, cruise planning, and partner workflows.';
comment on table public.place_sources is 'Source mappings from canonical places to Google Places, TripAdvisor, manual, partner, Sanity, LiteAPI, Viator, and future external systems.';
comment on view public.v_places_hotels is 'Active canonical hotel places for app-facing reads.';
comment on view public.v_places_restaurants is 'Active canonical restaurant places for app-facing reads.';
comment on view public.v_places_activities is 'Active canonical activity, attraction, tour, and beach places for app-facing reads.';
comment on view public.v_places_search is 'All active canonical places for search and discovery reads.';;
