-- Store Duffel offer ID so we can "Confirm & Book" from My Trip (and avoid duplicate rows).
ALTER TABLE public.trip_flights
  ADD COLUMN IF NOT EXISTS duffel_offer_id text;
COMMENT ON COLUMN public.trip_flights.duffel_offer_id IS 'Duffel offer ID (e.g. off_xxx) when added without payment; used to book from My Trip.';
