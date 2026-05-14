-- Phase 9: License Auto-Renewal & Expiry
-- Run this against your Supabase project

-- 1. Add license expiry column
ALTER TABLE community_groups
    ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ;

-- 2. Backfill: existing paid tiers get 30 days from today as a grace period
UPDATE community_groups
SET license_expires_at = NOW() + INTERVAL '30 days'
WHERE license_tier IN ('pro', 'enterprise')
  AND license_expires_at IS NULL;
-- Free tier: NULL = perpetual, no update needed

-- 3. Seed new platform_settings keys (prices + duration)
-- community_free/pro/enterprise_revenue_share already exist from community_migration.sql
INSERT INTO platform_settings (key, value) VALUES
    ('community_pro_price',                '15000'),
    ('community_enterprise_price',         '35000'),
    ('community_pro_duration_days',        '30'),
    ('community_enterprise_duration_days', '30')
ON CONFLICT (key) DO NOTHING;
