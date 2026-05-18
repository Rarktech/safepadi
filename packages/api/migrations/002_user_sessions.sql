-- User sessions — revocable JWT registry for end-user sessions.
-- jti (JWT ID) claim in the token is checked against this table on every request.
CREATE TABLE IF NOT EXISTS user_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    jti         TEXT NOT NULL UNIQUE,
    platform    TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NULL,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_jti      ON user_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_sessions_profile  ON user_sessions(profile_id) WHERE revoked_at IS NULL;
