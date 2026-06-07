
-- Add TripAdvisor-specific columns to bahamas_attractions
ALTER TABLE public.bahamas_attractions
  ADD COLUMN IF NOT EXISTS tripadvisor_id TEXT,
  ADD COLUMN IF NOT EXISTS tripadvisor_url TEXT,
  ADD COLUMN IF NOT EXISTS tripadvisor_rating DECIMAL(3,1),
  ADD COLUMN IF NOT EXISTS tripadvisor_num_reviews INT;

-- Index for fast lookups by tripadvisor_id
CREATE INDEX IF NOT EXISTS idx_bahamas_attractions_tripadvisor_id 
  ON public.bahamas_attractions (tripadvisor_id) 
  WHERE tripadvisor_id IS NOT NULL;

COMMENT ON COLUMN public.bahamas_attractions.tripadvisor_id IS 'TripAdvisor location ID (from Content API)';
COMMENT ON COLUMN public.bahamas_attractions.tripadvisor_url IS 'TripAdvisor web URL for this attraction';
COMMENT ON COLUMN public.bahamas_attractions.tripadvisor_rating IS 'TripAdvisor rating (0.0-5.0)';
COMMENT ON COLUMN public.bahamas_attractions.tripadvisor_num_reviews IS 'Number of TripAdvisor reviews';
;
