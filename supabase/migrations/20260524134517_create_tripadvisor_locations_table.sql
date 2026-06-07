
-- BAH-99: tripadvisor_locations table
CREATE TABLE public.tripadvisor_locations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id      text        UNIQUE NOT NULL,
  category         text        NOT NULL CHECK (category IN ('hotels', 'restaurants', 'attractions')),
  island_name      text,
  name             text        NOT NULL,
  address          jsonb,
  rating           numeric(2,1),
  num_reviews      integer,
  price_level      text,
  cuisine_types    text[],
  hotel_class      text,
  amenities        text[],
  photos           jsonb,
  reviews          jsonb,
  website          text,
  tripadvisor_url  text,
  latitude         numeric,
  longitude        numeric,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.tripadvisor_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tripadvisor_locations_public_read"
  ON public.tripadvisor_locations
  FOR SELECT USING (true);

CREATE INDEX idx_ta_locations_category   ON public.tripadvisor_locations(category);
CREATE INDEX idx_ta_locations_island     ON public.tripadvisor_locations(island_name);
CREATE INDEX idx_ta_locations_rating     ON public.tripadvisor_locations(rating DESC NULLS LAST);
CREATE INDEX idx_ta_locations_location_id ON public.tripadvisor_locations(location_id);

CREATE OR REPLACE FUNCTION public.set_tripadvisor_locations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tripadvisor_locations_updated_at
  BEFORE UPDATE ON public.tripadvisor_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_tripadvisor_locations_updated_at();
;
