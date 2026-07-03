-- Migration 009: Support Tickets — free, in-house human-agent support inbox
-- Run this in your Supabase SQL editor or via psql

-- 1. Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    safetag             TEXT NOT NULL,
    origin_platform     TEXT NOT NULL,   -- telegram|discord|whatsapp|instagram|messenger|apple
    origin_platform_id  TEXT NOT NULL,
    trigger_phrase      TEXT,            -- raw text that matched the keyword trigger
    status              TEXT NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN', 'RESOLVED', 'HANDLED_EXTERNALLY')),
    assigned_admin_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    resolution_notes    TEXT,
    resolved_at         TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,  -- e.g. { assigned_admin: {...} }
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_profile_id ON support_tickets(profile_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin ON support_tickets(assigned_admin_id);

-- 2. Support ticket message thread
CREATE TABLE IF NOT EXISTS support_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id     UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id     UUID,             -- profiles.id (USER) or admin_users.id (ADMIN); NULL for SYSTEM
    sender_type   TEXT NOT NULL CHECK (sender_type IN ('USER', 'ADMIN', 'SYSTEM')),
    content       TEXT NOT NULL,
    attachments   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id, created_at);

-- 3. Assignment audit trail, mirroring dispute_assignments (migration 008)
CREATE TABLE IF NOT EXISTS support_assignments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id     UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    assigned_to   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    assigned_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,  -- NULL = system auto-route
    reason        TEXT,  -- 'AUTO_ROUTE' | 'MANUAL_REASSIGN'
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_assignments_ticket_id ON support_assignments(ticket_id);
