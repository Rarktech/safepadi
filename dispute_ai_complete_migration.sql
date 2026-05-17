-- ============================================================
-- Safeeely AI Dispute System — Complete Schema Migration
-- Adds all tables/columns referenced by the AI pipeline code
-- but missing from committed migrations.
-- ============================================================

-- ── 1. dispute_sops ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispute_sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    rule_body TEXT NOT NULL,
    dispute_type TEXT,
    applies_to_agent TEXT CHECK (applies_to_agent IN ('investigator', 'judge', 'critic', 'all')),
    severity TEXT DEFAULT 'standard' CHECK (severity IN ('critical', 'high', 'standard', 'low')),
    priority INTEGER DEFAULT 50,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_review')),
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    human_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. dispute_adjudications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS dispute_adjudications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID UNIQUE NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    dispute_type TEXT,
    fact_summary TEXT,
    final_action TEXT CHECK (final_action IN ('REFUND_BUYER', 'PAY_SELLER', 'SPLIT', 'REFUND_AFTER_RETURN')),
    split_pct_buyer NUMERIC,
    utility_location TEXT,
    evidence_tier_top INTEGER DEFAULT 3,
    sops_applied UUID[],
    human_overrode_ai BOOLEAN DEFAULT false,
    low_confidence BOOLEAN DEFAULT false,
    resolution_source TEXT DEFAULT 'AI' CHECK (resolution_source IN ('AI', 'ADMIN', 'SLA', 'RETURN_CONFIRMED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. dispute_forensic_memory ───────────────────────────────
CREATE TABLE IF NOT EXISTS dispute_forensic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    dispute_type TEXT,
    indicators JSONB DEFAULT '[]',
    counter_evidence_needed JSONB DEFAULT '[]',
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    confirmed_fraud_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. profile_reputation ────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_reputation (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    trust_score NUMERIC DEFAULT 50,
    disputes_raised_count INTEGER DEFAULT 0,
    disputes_won_count INTEGER DEFAULT 0,
    disputes_lost_count INTEGER DEFAULT 0,
    disputes_count INTEGER DEFAULT 0,
    ghosted_count INTEGER DEFAULT 0,
    fraud_flags JSONB DEFAULT '[]',
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. disputes — add AI pipeline columns ────────────────────
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS pipeline_tier TEXT DEFAULT 'STANDARD' CHECK (pipeline_tier IN ('LITE', 'STANDARD', 'CONSTITUTIONAL')),
    ADD COLUMN IF NOT EXISTS dispute_type TEXT,
    ADD COLUMN IF NOT EXISTS restricted_to TEXT DEFAULT 'ALL' CHECK (restricted_to IN ('ALL', 'BUYER', 'SELLER')),
    ADD COLUMN IF NOT EXISTS is_ai_paused BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_rounds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS critic_iterations INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS critic_max_iterations INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS processing_locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_judge_payload JSONB,
    ADD COLUMN IF NOT EXISTS evidence_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_1_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_2_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS verdict_action TEXT CHECK (verdict_action IN ('REFUND_BUYER', 'PAY_SELLER', 'SPLIT', 'REFUND_AFTER_RETURN')),
    ADD COLUMN IF NOT EXISTS return_deadline_hours INTEGER DEFAULT 72,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ── 6. dispute_messages — add evidence columns ───────────────
ALTER TABLE dispute_messages
    ADD COLUMN IF NOT EXISTS evidence_tier INTEGER,
    ADD COLUMN IF NOT EXISTS evidence_tags TEXT[],
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS restricted_to TEXT DEFAULT 'ALL';

-- ── 7. transactions — add metadata column ────────────────────
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS group_id UUID;

-- ── 8. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_disputes_open_ai
    ON disputes (status, is_ai_paused, processing_locked_at)
    WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_disputes_evidence_deadline
    ON disputes (evidence_deadline)
    WHERE evidence_deadline IS NOT NULL AND status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_dispute_adjudications_dispute
    ON dispute_adjudications (dispute_id);

CREATE INDEX IF NOT EXISTS idx_profile_reputation_profile
    ON profile_reputation (profile_id);
