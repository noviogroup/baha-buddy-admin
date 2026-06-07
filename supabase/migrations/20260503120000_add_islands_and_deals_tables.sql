-- Baha Buddy V2 — Islands reference table and Deals/Packages table
-- Source: bahamas.com (official Bahamas Tourism Authority)
-- Data collected: 2026-05-03. ToS review: no scraping prohibition found.
-- robots.txt: only blocks /frontend/*, /ajax/*, /cscripts/* — public pages are open.

-- ---------------------------------------------------------------------------
-- islands
-- Reference data for all 16 major Bahamian islands.
-- Used by Claude tools (get_island_info) and Explore tab content.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.islands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  hero_image_url text,
  airport_codes text[] DEFAULT '{}',
  highlights text[] DEFAULT '{}',
  vibe_tags text[] DEFAULT '{}',
  best_for text[] DEFAULT '{}',
  avg_flight_time_from_miami_hours numeric(4,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_islands_slug ON public.islands(slug);
ALTER TABLE public.islands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Islands are publicly readable"
  ON public.islands FOR SELECT
  USING (true);
-- ---------------------------------------------------------------------------
-- bahamas_deals
-- Curated deals and packages for the Explore / chat card layer.
-- Not live pricing — representative deal types from official BTA sources.
-- For live pricing, use Duffel (flights) and LiteAPI (hotels).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bahamas_deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  deal_type text NOT NULL CHECK (deal_type IN ('accommodation', 'tour', 'package', 'activity')),
  island text REFERENCES public.islands(slug),
  resort_name text,
  description text NOT NULL,
  price_from_usd numeric(10,2),
  price_unit text CHECK (price_unit IN ('per_night', 'per_person', 'per_day', 'per_charter', 'total')),
  image_url text,
  highlights text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  valid_through date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bahamas_deals_island ON public.bahamas_deals(island);
CREATE INDEX IF NOT EXISTS idx_bahamas_deals_type ON public.bahamas_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_bahamas_deals_active ON public.bahamas_deals(is_active);
ALTER TABLE public.bahamas_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deals are publicly readable"
  ON public.bahamas_deals FOR SELECT
  USING (true);
-- ---------------------------------------------------------------------------
-- bahamas_attractions
-- Curated attractions, landmarks, dive sites, and experiences.
-- Supplements the google_places table (which has 61 restaurant/hotel/activity entries).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bahamas_attractions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL,
  island text REFERENCES public.islands(slug),
  description text NOT NULL,
  image_url text,
  source_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bahamas_attractions_island ON public.bahamas_attractions(island);
CREATE INDEX IF NOT EXISTS idx_bahamas_attractions_category ON public.bahamas_attractions(category);
ALTER TABLE public.bahamas_attractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attractions are publicly readable"
  ON public.bahamas_attractions FOR SELECT
  USING (true);
