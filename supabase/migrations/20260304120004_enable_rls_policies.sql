-- Baha Buddy V2 — Row Level Security (RLS) + updated_at triggers
-- Users can only read/write their own data. Uses auth.uid() from Supabase Auth.
-- Service role bypasses RLS; never use service role key in client code.

-- ---------------------------------------------------------------------------
-- updated_at trigger (reusable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply to tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users', 'trips', 'chat_threads', 'trip_accommodations', 'trip_flights', 'trip_activities', 'trip_collaborators', 'user_documents', 'user_payments', 'bookings', 'ugc_content'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;
-- ---------------------------------------------------------------------------
-- users: users can read/update their own row (id = auth.uid())
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
-- ---------------------------------------------------------------------------
-- trips: owner can do everything; collaborators can read (Phase 4)
-- ---------------------------------------------------------------------------
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
-- chat_threads: owner only
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own chat threads"
  ON public.chat_threads FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat threads"
  ON public.chat_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat threads"
  ON public.chat_threads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat threads"
  ON public.chat_threads FOR DELETE
  USING (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
-- chat_messages: via thread ownership
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read messages in own threads"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert messages in own threads"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()
    )
  );
-- ---------------------------------------------------------------------------
-- trip_accommodations, trip_flights, trip_activities: via trip ownership
-- ---------------------------------------------------------------------------
ALTER TABLE public.trip_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage trip_accommodations for own trips"
  ON public.trip_accommodations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_accommodations.trip_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_accommodations.trip_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage trip_flights for own trips"
  ON public.trip_flights FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_flights.trip_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_flights.trip_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage trip_activities for own trips"
  ON public.trip_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_activities.trip_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_activities.trip_id AND user_id = auth.uid()));
-- ---------------------------------------------------------------------------
-- trip_collaborators: trip owner can manage; collaborator can read
-- ---------------------------------------------------------------------------
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read collaborators for own trips or where they are collaborator"
  ON public.trip_collaborators FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_collaborators.trip_id AND t.user_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Trip owners can insert collaborators"
  ON public.trip_collaborators FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_collaborators.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip owners can update collaborators"
  ON public.trip_collaborators FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_collaborators.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip owners can delete collaborators"
  ON public.trip_collaborators FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_collaborators.trip_id AND user_id = auth.uid()));
-- (google_places: V1 already has table and RLS; skip to avoid conflict.)

-- ---------------------------------------------------------------------------
-- user_documents, user_payments, bookings, ugc_content: own data only
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own user_documents"
  ON public.user_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own user_payments"
  ON public.user_payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own bookings"
  ON public.bookings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own ugc_content"
  ON public.ugc_content FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
