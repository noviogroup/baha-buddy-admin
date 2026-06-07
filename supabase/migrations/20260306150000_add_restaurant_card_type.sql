-- Baha Buddy V2 — allow restaurant card_type in chat_messages

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_card_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_card_type_check CHECK (
  card_type IN (
    'none', 'destination', 'hotel', 'restaurant', 'flight', 'dayPlan', 'activity', 'map', 'summary', 'payment', 'mixed'
  )
);
