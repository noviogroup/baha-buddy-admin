-- Baha Buddy V2 — fix infinite recursion in RLS between trips and trip_collaborators
-- Error observed: PostgrestException code 42P17 "infinite recursion detected in policy for relation trips"

-- ============================================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_trip_owner(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = p_trip_id
      AND t.user_id = auth.uid()
  );
$$;
CREATE OR REPLACE FUNCTION public.is_trip_collaborator(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_collaborators tc
    WHERE tc.trip_id = p_trip_id
      AND tc.user_id = auth.uid()
      AND tc.accepted_at IS NOT NULL
  );
$$;
CREATE OR REPLACE FUNCTION public.is_trip_editor(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_collaborators tc
    WHERE tc.trip_id = p_trip_id
      AND tc.user_id = auth.uid()
      AND tc.accepted_at IS NOT NULL
      AND tc.role = 'editor'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_trip_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_collaborator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_editor(uuid) TO authenticated;
-- ============================================
-- trips policies
-- ============================================

DROP POLICY IF EXISTS "Users can read own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can read own or collaborated trips" ON public.trips;
CREATE POLICY "Users can read own or collaborated trips"
  ON public.trips FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_trip_collaborator(id)
  );
-- ============================================
-- trip_collaborators policies
-- ============================================

DROP POLICY IF EXISTS "Users can read collaborators for own trips or where they are collaborator" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can insert collaborators" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can update collaborators" ON public.trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can delete collaborators" ON public.trip_collaborators;
CREATE POLICY "Users can read collaborators for own trips or where they are collaborator"
  ON public.trip_collaborators FOR SELECT
  USING (
    public.is_trip_owner(trip_id)
    OR user_id = auth.uid()
  );
CREATE POLICY "Trip owners can insert collaborators"
  ON public.trip_collaborators FOR INSERT
  WITH CHECK (public.is_trip_owner(trip_id));
CREATE POLICY "Trip owners can update collaborators"
  ON public.trip_collaborators FOR UPDATE
  USING (public.is_trip_owner(trip_id))
  WITH CHECK (public.is_trip_owner(trip_id));
CREATE POLICY "Trip owners can delete collaborators"
  ON public.trip_collaborators FOR DELETE
  USING (public.is_trip_owner(trip_id));
-- ============================================
-- chat_threads policy
-- ============================================

DROP POLICY IF EXISTS "Users can read own chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can read own or collaborated chat threads" ON public.chat_threads;
CREATE POLICY "Users can read own or collaborated chat threads"
  ON public.chat_threads FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      trip_id IS NOT NULL
      AND public.is_trip_collaborator(trip_id)
    )
  );
-- ============================================
-- trip detail table policies (simplified, non-recursive)
-- ============================================

DROP POLICY IF EXISTS "Users can manage trip_activities for own trips" ON public.trip_activities;
DROP POLICY IF EXISTS "Users can manage trip_activities for own or collaborated trips" ON public.trip_activities;
CREATE POLICY "Users can manage trip_activities for own or collaborated trips"
  ON public.trip_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_activities.trip_id
        AND (t.user_id = auth.uid() OR public.is_trip_collaborator(t.id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_activities.trip_id
        AND (t.user_id = auth.uid() OR public.is_trip_editor(t.id))
    )
  );
DROP POLICY IF EXISTS "Users can manage trip_accommodations for own trips" ON public.trip_accommodations;
DROP POLICY IF EXISTS "Users can manage trip_accommodations for own or collaborated trips" ON public.trip_accommodations;
CREATE POLICY "Users can manage trip_accommodations for own or collaborated trips"
  ON public.trip_accommodations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_accommodations.trip_id
        AND (t.user_id = auth.uid() OR public.is_trip_collaborator(t.id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_accommodations.trip_id
        AND (t.user_id = auth.uid() OR public.is_trip_editor(t.id))
    )
  );
DROP POLICY IF EXISTS "Users can manage trip_flights for own trips" ON public.trip_flights;
DROP POLICY IF EXISTS "Users can manage trip_flights for own or collaborated trips" ON public.trip_flights;
CREATE POLICY "Users can manage trip_flights for own or collaborated trips"
  ON public.trip_flights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_flights.trip_id
        AND (t.user_id = auth.uid() OR public.is_trip_collaborator(t.id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_flights.trip_id
        AND (t.user_id = auth.uid() OR public.is_trip_editor(t.id))
    )
  );
-- ============================================
-- chat_messages policies
-- ============================================

DROP POLICY IF EXISTS "Users can read messages in own threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read messages in own or collaborated threads" ON public.chat_messages;
CREATE POLICY "Users can read messages in own or collaborated threads"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND (
          ct.user_id = auth.uid()
          OR (ct.trip_id IS NOT NULL AND public.is_trip_collaborator(ct.trip_id))
        )
    )
  );
DROP POLICY IF EXISTS "Users can insert messages in own threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in own or collaborated threads" ON public.chat_messages;
CREATE POLICY "Users can insert messages in own or collaborated threads"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND (
          ct.user_id = auth.uid()
          OR (ct.trip_id IS NOT NULL AND public.is_trip_collaborator(ct.trip_id))
        )
    )
  );
