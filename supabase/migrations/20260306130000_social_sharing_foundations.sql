-- Baha Buddy V2 — Social & Sharing Foundations
-- New tables for share links, trip invitations, and notification events.
-- RLS policy updates for collaborator access.
-- Run: supabase db push or paste in SQL Editor.

-- ═══════════════════════════════════════════
-- 1. SHARE LINKS — every shared trip gets a tracked link
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('social_card', 'link', 'collaborative')),
  short_code TEXT NOT NULL UNIQUE,
  image_url TEXT,
  expires_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,
  click_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_share_links_short_code ON public.share_links(short_code);
CREATE INDEX IF NOT EXISTS idx_share_links_trip_id ON public.share_links(trip_id);
CREATE INDEX IF NOT EXISTS idx_share_links_created_by ON public.share_links(created_by);
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own share links"
  ON public.share_links FOR SELECT
  USING (auth.uid() = created_by);
CREATE POLICY "Users can create share links for own trips"
  ON public.share_links FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = share_links.trip_id AND user_id = auth.uid())
  );
-- Public read for short_code lookups (anyone with the link can view trip)
CREATE POLICY "Anyone can read share links by short_code"
  ON public.share_links FOR SELECT
  USING (true);
-- ═══════════════════════════════════════════
-- 2. TRIP INVITATIONS — invite by email before user has an account
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_email TEXT,
  invitee_user_id UUID REFERENCES public.users(id),
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  short_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON public.trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email ON public.trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_user ON public.trip_invitations(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_short_code ON public.trip_invitations(short_code);
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;
-- Trip owners can manage invitations
CREATE POLICY "Trip owners can manage invitations"
  ON public.trip_invitations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_invitations.trip_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_invitations.trip_id AND user_id = auth.uid())
  );
-- Invitees can read their own invitations
CREATE POLICY "Invitees can read own invitations"
  ON public.trip_invitations FOR SELECT
  USING (invitee_user_id = auth.uid());
-- Service role handles acceptance (via Edge Function)


-- ═══════════════════════════════════════════
-- 3. NOTIFICATION EVENTS — drives push + in-app notifications
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'trip_invite', 'invite_accepted', 'collaborator_update',
    'trip_reminder', 'booking_confirmed', 'buddy_message',
    'ugc_approved', 'share_viewed'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_unread ON public.notification_events(user_id) WHERE read_at IS NULL;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications"
  ON public.notification_events FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications (mark read)"
  ON public.notification_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ═══════════════════════════════════════════
-- 4. RLS POLICY UPDATES — collaborator access to trip data
-- ═══════════════════════════════════════════

-- Drop existing restrictive policies and replace with collaborator-aware ones

-- chat_threads: collaborators can read threads for shared trips
DROP POLICY IF EXISTS "Users can read own chat threads" ON public.chat_threads;
CREATE POLICY "Users can read own or collaborated chat threads"
  ON public.chat_threads FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.trip_collaborators tc ON tc.trip_id = t.id
      WHERE t.chat_thread_id = chat_threads.id
        AND tc.user_id = auth.uid()
        AND tc.accepted_at IS NOT NULL
    )
  );
-- trips: collaborators can READ shared trips
DROP POLICY IF EXISTS "Users can read own trips" ON public.trips;
CREATE POLICY "Users can read own or collaborated trips"
  ON public.trips FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.trip_collaborators tc
      WHERE tc.trip_id = trips.id
        AND tc.user_id = auth.uid()
        AND tc.accepted_at IS NOT NULL
    )
  );
-- trip_activities: collaborators can READ and WRITE
DROP POLICY IF EXISTS "Users can manage trip_activities for own trips" ON public.trip_activities;
CREATE POLICY "Users can manage trip_activities for own or collaborated trips"
  ON public.trip_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_activities.trip_id
        AND (t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_collaborators tc
            WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.accepted_at IS NOT NULL
          ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_activities.trip_id
        AND (t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_collaborators tc
            WHERE tc.trip_id = t.id AND tc.user_id = auth.uid()
              AND tc.accepted_at IS NOT NULL AND tc.role = 'editor'
          ))
    )
  );
-- trip_accommodations: same pattern
DROP POLICY IF EXISTS "Users can manage trip_accommodations for own trips" ON public.trip_accommodations;
CREATE POLICY "Users can manage trip_accommodations for own or collaborated trips"
  ON public.trip_accommodations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_accommodations.trip_id
        AND (t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_collaborators tc
            WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.accepted_at IS NOT NULL
          ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_accommodations.trip_id
        AND (t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_collaborators tc
            WHERE tc.trip_id = t.id AND tc.user_id = auth.uid()
              AND tc.accepted_at IS NOT NULL AND tc.role = 'editor'
          ))
    )
  );
-- trip_flights: same pattern
DROP POLICY IF EXISTS "Users can manage trip_flights for own trips" ON public.trip_flights;
CREATE POLICY "Users can manage trip_flights for own or collaborated trips"
  ON public.trip_flights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_flights.trip_id
        AND (t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_collaborators tc
            WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.accepted_at IS NOT NULL
          ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_flights.trip_id
        AND (t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trip_collaborators tc
            WHERE tc.trip_id = t.id AND tc.user_id = auth.uid()
              AND tc.accepted_at IS NOT NULL AND tc.role = 'editor'
          ))
    )
  );
-- chat_messages: collaborators can read/write in shared trip threads
DROP POLICY IF EXISTS "Users can read messages in own threads" ON public.chat_messages;
CREATE POLICY "Users can read messages in own or collaborated threads"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND (ct.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            JOIN public.trip_collaborators tc ON tc.trip_id = t.id
            WHERE t.chat_thread_id = ct.id
              AND tc.user_id = auth.uid()
              AND tc.accepted_at IS NOT NULL
          ))
    )
  );
DROP POLICY IF EXISTS "Users can insert messages in own threads" ON public.chat_messages;
CREATE POLICY "Users can insert messages in own or collaborated threads"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND (ct.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            JOIN public.trip_collaborators tc ON tc.trip_id = t.id
            WHERE t.chat_thread_id = ct.id
              AND tc.user_id = auth.uid()
              AND tc.accepted_at IS NOT NULL
          ))
    )
  );
-- ═══════════════════════════════════════════
-- 5. REALTIME — enable on social tables
-- ═══════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_accommodations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_flights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_collaborators;
-- ═══════════════════════════════════════════
-- 6. TRIGGERS — updated_at on new tables
-- ═══════════════════════════════════════════

CREATE TRIGGER set_updated_at_trip_invitations
  BEFORE UPDATE ON public.trip_invitations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
-- ═══════════════════════════════════════════
-- 7. STORAGE BUCKETS (run separately in Dashboard if this fails)
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('social-cards', 'social-cards', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ugc', 'ugc', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-images', 'trip-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
