-- Baha Buddy Admin — booking reference parity
-- Ensures provider confirmation references are available on canonical bookings.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_reference text;

UPDATE public.bookings
SET booking_reference = coalesce(booking_reference, booking_ref, supplier_ref)
WHERE booking_reference IS NULL;

COMMENT ON COLUMN public.bookings.booking_reference IS
  'External provider reference shown to travelers/admins, such as a PNR, LiteAPI booking id, or order id.';

CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference
  ON public.bookings(booking_reference);
