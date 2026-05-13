-- Community Bot Licensing Migration

-- 1. Groups table
CREATE TABLE IF NOT EXISTS community_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_group_id BIGINT UNIQUE NOT NULL,
    group_name TEXT NOT NULL,
    admin_profile_id UUID REFERENCES profiles(id) NOT NULL,
    license_tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    admin_revenue_share_percent NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    welcome_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Community commissions table
CREATE TABLE IF NOT EXISTS community_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES community_groups(id) NOT NULL,
    admin_profile_id UUID REFERENCES profiles(id) NOT NULL,
    txn_id UUID REFERENCES transactions(id) NOT NULL,
    amount NUMERIC(20,8) NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add group_id to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES community_groups(id);

-- 4. Platform settings for community revenue share tiers
INSERT INTO platform_settings (key, value) VALUES
    ('community_free_revenue_share', '10'),
    ('community_pro_revenue_share', '25'),
    ('community_enterprise_revenue_share', '40')
ON CONFLICT (key) DO NOTHING;
