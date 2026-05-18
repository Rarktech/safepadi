-- Magic link tokens — opaque one-time tokens for bot-issued deep links.
-- The raw token is NEVER stored here; only its SHA-256 hash is persisted.
CREATE TABLE IF NOT EXISTS magic_link_tokens (
    token_hash            TEXT PRIMARY KEY,
    profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    safetag               TEXT NOT NULL,
    scope                 TEXT NOT NULL CHECK (scope IN (
                            'withdraw', 'kyc', 'payout_method', 'view_dashboard',
                            'reviews', 'dispute', 'delivery_confirm', 'unlink')),
    txn_id                UUID NULL REFERENCES transactions(id) ON DELETE CASCADE,
    issued_to_platform    TEXT NOT NULL,
    issued_to_platform_id TEXT NOT NULL,
    expires_at            TIMESTAMPTZ NOT NULL,
    used_at               TIMESTAMPTZ NULL,
    consumed_ip           INET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mlt_expiry
    ON magic_link_tokens(expires_at)
    WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mlt_profile
    ON magic_link_tokens(profile_id, scope);
