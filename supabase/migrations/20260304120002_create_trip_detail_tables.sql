-- Baha Buddy V2 — Trip detail tables
-- Accommodations, flights, day-by-day activities, collaborators.

-- ---------------------------------------------------------------------------
-- trip_accommodations
-- Hotel/villa bookings per trip.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_accommodations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id text,
  name text NOT NULL,
  island text,
  check_in date,
  check_out date,
  price_per_night numeric(12, 2),
  guests int,
  booking_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_trip_id ON public.trip_accommodations(trip_id);
-- ---------------------------------------------------------------------------
-- trip_flights
-- Flight bookings per trip (Duffel or manual).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_flights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  departure_at timestamptz,
  arrival_at timestamptz,
  airline text,
  booking_reference text,
  price numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_flights_trip_id ON public.trip_flights(trip_id);
-- ---------------------------------------------------------------------------
-- trip_activities
-- Day-by-day itinerary items (morning/afternoon/evening).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number >= 1),
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
  activity_name text NOT NULL,
  activity_type text,
  place_id text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_day ON public.trip_activities(trip_id, day_number);
-- ---------------------------------------------------------------------------
-- trip_collaborators
-- Shared trip participants (Phase 4).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_collaborators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(trip_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON public.trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON public.trip_collaborators(user_id);
