-- Migration: Badges & Seamless Milestones

-- 1. Create profile_badges table
CREATE TABLE IF NOT EXISTS profile_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, badge_key)
);

-- 2. Modify transactions table
-- Add transaction_type column defaulting to 'ONE_TIME'
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'ONE_TIME';

-- Add check constraint to transaction_type
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('ONE_TIME', 'MILESTONE'));

-- 3. Create transaction_milestones table
CREATE TABLE IF NOT EXISTS transaction_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    index_num INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, RELEASED, DISPUTED
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_milestones_transaction_id ON transaction_milestones(transaction_id);
