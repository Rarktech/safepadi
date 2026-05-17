-- Add Discord announcement channel ID to community groups
-- This channel receives social-proof announcements when a trade completes in the server.

ALTER TABLE community_groups ADD COLUMN IF NOT EXISTS discord_announcement_channel_id BIGINT;
