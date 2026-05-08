-- Migration: add missing dispute columns
-- Run this against your Supabase project via the SQL editor or CLI

ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS restricted_to TEXT DEFAULT 'ALL' CHECK (restricted_to IN ('ALL', 'BUYER', 'SELLER')),
    ADD COLUMN IF NOT EXISTS is_ai_paused BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS ai_rounds INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dispute_type TEXT,
    ADD COLUMN IF NOT EXISTS processing_locked_at TIMESTAMPTZ;

-- Index to speed up the SLA cron query
CREATE INDEX IF NOT EXISTS idx_disputes_open_ai ON disputes (status, is_ai_paused)
    WHERE status = 'OPEN' AND is_ai_paused = FALSE;

-- Ensure transaction metadata column exists (used for SPLIT amounts)
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS metadata JSONB;
