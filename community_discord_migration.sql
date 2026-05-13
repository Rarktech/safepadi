-- Phase: Discord community bot parity
-- Adds platform column and discord_guild_id to community_groups

ALTER TABLE community_groups ALTER COLUMN telegram_group_id DROP NOT NULL;
ALTER TABLE community_groups ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'telegram';
ALTER TABLE community_groups ADD COLUMN IF NOT EXISTS discord_guild_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS community_groups_discord_guild_id_key
    ON community_groups(discord_guild_id)
    WHERE discord_guild_id IS NOT NULL;
