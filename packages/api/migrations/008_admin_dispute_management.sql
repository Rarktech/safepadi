-- Migration 008: Admin Dispute Management Infrastructure
-- Run this in your Supabase SQL editor or via psql

-- 1. Dispute assignment audit trail
CREATE TABLE IF NOT EXISTS dispute_assignments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id    UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    assigned_to   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    assigned_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,  -- NULL = system auto-route
    reason        TEXT,  -- 'AUTO_ROUTE' | 'USER_ESCALATION' | 'MANUAL_REASSIGN' | 'ESCALATE_SENIOR'
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ  -- set when next assignment supersedes this one
);

CREATE INDEX IF NOT EXISTS idx_dispute_assignments_dispute_id ON dispute_assignments(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_assignments_assigned_to ON dispute_assignments(assigned_to);

-- 2. Cron run history for system health monitoring
CREATE TABLE IF NOT EXISTS cron_run_history (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name          TEXT NOT NULL,
    started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at      TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'RUNNING'
                      CHECK (status IN ('RUNNING', 'SUCCESS', 'ERROR')),
    records_processed INT NOT NULL DEFAULT 0,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_run_history_job_name ON cron_run_history(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_run_history_started_at ON cron_run_history(started_at DESC);

-- 3. Broadcast campaigns table (for marketing campaign history)
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message         TEXT NOT NULL,
    platforms       TEXT[] NOT NULL,
    attachment_url  TEXT,
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    total_targeted  INT NOT NULL DEFAULT 0,
    success_count   INT NOT NULL DEFAULT 0,
    fail_count      INT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED')),
    segment_filters JSONB,
    created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Message templates for broadcast composer
CREATE TABLE IF NOT EXISTS message_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    content     TEXT NOT NULL,
    platforms   TEXT[] NOT NULL DEFAULT '{}',
    created_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add featured column to marketplace_listings (if table exists)
ALTER TABLE marketplace_listings
    ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

-- 6. Add flagging columns to reviews
ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS flagged        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

-- 7. Add trust score override audit log to profile_reputation
ALTER TABLE profile_reputation
    ADD COLUMN IF NOT EXISTS trust_score_overrides JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 8. Platform settings rows for cron enable/disable toggles
INSERT INTO platform_settings (key, value) VALUES
    ('cron_enabled_weekly_digest',       'true'),
    ('cron_enabled_license_expiry',      'true'),
    ('cron_enabled_transaction_reminders','true'),
    ('cron_enabled_onboarding_drip',     'true'),
    ('cron_enabled_re_engagement',       'true'),
    ('cron_enabled_referral_summary',    'true'),
    ('cron_enabled_dispute_enforcement', 'true'),
    ('cron_enabled_fraud_enforcement',   'true'),
    ('cron_enabled_payout_reconciliation','true')
ON CONFLICT (key) DO NOTHING;
