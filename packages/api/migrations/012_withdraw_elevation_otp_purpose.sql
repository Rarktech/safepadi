-- Allow 'withdraw_elevation' as a profile_action_otps.purpose value (self-service
-- emailed OTP that elevates an already-authenticated web session's 'withdraw' scope,
-- as an alternative to the bot-issued magic-link elevation path).
ALTER TABLE profile_action_otps DROP CONSTRAINT IF EXISTS profile_action_otps_purpose_check;

ALTER TABLE profile_action_otps ADD CONSTRAINT profile_action_otps_purpose_check CHECK (purpose IN (
    'web_login', 'block_account', 'unblock_account', 'withdraw_elevation'));
