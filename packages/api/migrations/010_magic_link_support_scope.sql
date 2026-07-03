-- Migration 010: Allow 'support' as a magic_link_tokens.scope value, and add a
-- ticket_id column so support-ticket magic links can reference support_tickets
-- (txn_id is FK'd to transactions and cannot be reused for this purpose).

ALTER TABLE magic_link_tokens
    ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE;

ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_scope_check;

ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_scope_check CHECK (scope IN (
    'withdraw', 'kyc', 'payout_method', 'view_dashboard',
    'reviews', 'dispute', 'delivery_confirm', 'unlink', 'delete_account', 'support'));
