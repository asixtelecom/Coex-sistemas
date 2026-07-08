-- ============================================================
-- 039_account_branding.sql
--
-- Adds per-account branding fields so each account can have its
-- own logo, footer text, address, and CNPJ displayed in the
-- sidebar, header, invoices, etc.
--
-- Also creates the `logos` Storage bucket for logo uploads.
-- ============================================================

-- 1. Add branding columns to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- 2. Logos storage bucket (public, 2 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  TRUE,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Logos are publicly readable" ON storage.objects;
CREATE POLICY "Logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Account admins can upload logos" ON storage.objects;
CREATE POLICY "Account admins can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id::text = (storage.foldername(objects.name))[1]
        AND is_account_member(a.id, 'admin')
    )
  );

DROP POLICY IF EXISTS "Account admins can update logos" ON storage.objects;
CREATE POLICY "Account admins can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id::text = (storage.foldername(objects.name))[1]
        AND is_account_member(a.id, 'admin')
    )
  );

DROP POLICY IF EXISTS "Account admins can delete logos" ON storage.objects;
CREATE POLICY "Account admins can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id::text = (storage.foldername(objects.name))[1]
        AND is_account_member(a.id, 'admin')
    )
  );
