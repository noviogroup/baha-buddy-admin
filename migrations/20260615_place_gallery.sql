-- Baha Buddy Admin — Place Gallery Support
-- Date: 2026-06-15
-- Creates place-gallery storage bucket and partner_photo_submissions table.
-- Apply in Supabase SQL Editor.

-- Storage bucket (already applied via MCP in heartbeat)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'place-gallery',
  'place-gallery',
  true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "place-gallery: service role full access" ON storage.objects;
CREATE POLICY "place-gallery: service role full access" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'place-gallery') WITH CHECK (bucket_id = 'place-gallery');

DROP POLICY IF EXISTS "place-gallery: public read" ON storage.objects;
CREATE POLICY "place-gallery: public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'place-gallery');

-- Partner photo submissions
CREATE TABLE IF NOT EXISTS public.partner_photo_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'gallery' CHECK (type IN ('hero','gallery','room','food','exterior','activity','map')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text
);

CREATE INDEX IF NOT EXISTS idx_partner_photos_place ON public.partner_photo_submissions(place_id);
CREATE INDEX IF NOT EXISTS idx_partner_photos_partner ON public.partner_photo_submissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_photos_status ON public.partner_photo_submissions(status);

ALTER TABLE public.partner_photo_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage partner photos" ON public.partner_photo_submissions;
CREATE POLICY "Service role can manage partner photos" ON public.partner_photo_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
