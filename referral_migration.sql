-- Migration: Add Referral System Support

-- 1. Add 'referred_by_id' to existing 'profiles' table
ALTER TABLE profiles 
ADD COLUMN referred_by_id UUID REFERENCES profiles(id);

-- 2. Create the 'referral_commissions' table for tracking payouts
CREATE TABLE referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES profiles(id) NOT NULL,
    referred_id UUID REFERENCES profiles(id) NOT NULL,
    amount DECIMAL NOT NULL,
    currency TEXT NOT NULL,
    tier INTEGER NOT NULL CHECK (tier IN (1, 2)),
    txn_id UUID REFERENCES transactions(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: RLS (Row Level Security) and other advanced configurations 
-- can be added later if needed. For now, we assume service role usage.
