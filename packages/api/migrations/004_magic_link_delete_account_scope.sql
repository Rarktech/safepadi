-- Allow 'delete_account' as a magic_link_tokens.scope value (self-requested step-up
-- confirmation for the Profile/Settings "Delete account" flow).
ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_scope_check;

ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_scope_check CHECK (scope IN (
    'withdraw', 'kyc', 'payout_method', 'view_dashboard',
    'reviews', 'dispute', 'delivery_confirm', 'unlink', 'delete_account'));
