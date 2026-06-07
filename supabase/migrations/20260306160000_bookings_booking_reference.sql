-- Baha Buddy V2 — Add booking_reference to bookings for PNR / Duffel order id
-- So flight (and other) bookings can store external reference (e.g. PNR ENYH6J).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_reference text;
COMMENT ON COLUMN public.bookings.booking_reference IS 'External reference: PNR for flights, Duffel order id, or provider reference.';
