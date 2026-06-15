alter table public.cruise_itinerary_stops
add column if not exists tripadvisor_location_id text;

create index if not exists cruise_itinerary_stops_tripadvisor_location_id_idx
on public.cruise_itinerary_stops (tripadvisor_location_id);

comment on column public.cruise_itinerary_stops.tripadvisor_location_id is 'Tripadvisor location_id linked from tripadvisor_locations when a stop is sourced from Tripadvisor.';;
