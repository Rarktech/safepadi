-- Migration 011: disputes.assigned_at was never added, even though
-- checkAssignedCaseSLA() (packages/api/src/cron/disputeEnforcement.ts) has
-- always queried it directly off the disputes table, causing every 10-minute
-- SLA-reminder cron tick to fail with "column disputes.assigned_at does not exist".

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
