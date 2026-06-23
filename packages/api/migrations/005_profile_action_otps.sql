-- Profile action OTPs — shared 6-digit email verification used by the web login flow
-- and the self-service account block/unblock flow. Keyed by purpose so one table
-- covers all "prove you own this profile's email" cases without overloading
-- auth_otps (platform-binding-shaped) or email_verifications (registration-only).
CREATE TABLE IF NOT EXISTS profile_action_otps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code        TEXT NOT NULL,
    purpose     TEXT NOT NULL CHECK (purpose IN ('web_login', 'block_account', 'unblock_account')),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_action_otps_lookup ON profile_action_otps(profile_id, purpose);
