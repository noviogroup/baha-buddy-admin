-- Baha Buddy V2 — Chat threads & messages
-- One thread per trip; messages can include rich card JSON.

-- ---------------------------------------------------------------------------
-- chat_threads
-- One conversation per trip. trip_id nullable for pre-trip conversations.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_threads_trip_id_unique UNIQUE (trip_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON public.chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_trip_id ON public.chat_threads(trip_id);
-- ---------------------------------------------------------------------------
-- chat_messages
-- Messages with optional card_type and card_data JSON for rich UI.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  card_type text NOT NULL DEFAULT 'none' CHECK (card_type IN (
    'none', 'destination', 'hotel', 'flight', 'dayPlan', 'activity', 'map', 'summary', 'payment'
  )),
  card_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(thread_id, created_at);
-- Optional: backfill trips.chat_thread_id when a thread is created for a trip
-- (app or Edge Function can set trips.chat_thread_id when creating the thread)

COMMENT ON TABLE public.chat_threads IS 'One chat thread per trip; user_id is owner';
COMMENT ON TABLE public.chat_messages IS 'Messages with optional rich card_data JSON';
