-- Phase 8: Community commission withdrawals
-- Adds group_id to withdrawals table so admins can withdraw community earnings

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES community_groups(id);
CREATE INDEX IF NOT EXISTS withdrawals_group_id_idx ON withdrawals(group_id) WHERE group_id IS NOT NULL;
