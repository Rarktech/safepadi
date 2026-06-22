-- Phase 6 (Profile/Settings): adds editable profile fields, JSON preference blobs,
-- and a soft-delete marker. Run once against the Supabase project's SQL editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Also requires a public Storage bucket named "avatars" (Supabase dashboard ->
-- Storage -> New bucket -> public), mirroring the existing "receipts"/"kyc-documents" buckets.
