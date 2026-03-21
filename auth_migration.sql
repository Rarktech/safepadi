-- Migration: Add Auth and Binding Ban Tables

-- 1. Create the 'auth_otps' table for secure session verification
CREATE TABLE IF NOT EXISTS auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, platform, platform_id)
);

-- 2. Create the 'binding_bans' table to prevent unwanted account links
CREATE TABLE IF NOT EXISTS binding_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    platform_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, platform_id)
);

-- Enable RLS (Assume service role for now, but tables should be ready)
ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE binding_bans ENABLE ROW LEVEL SECURITY;
