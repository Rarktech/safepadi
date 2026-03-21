const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function linkDiscord(safetag, discordId) {
    console.log(`Linking safetag ${safetag} to Discord ID ${discordId}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('safetag', safetag)
        .single();

    if (!profile) {
        console.error('Profile not found');
        return;
    }

    console.log(`Profile ID: ${profile.id}`);

    const { data, error } = await supabase
        .from('linked_accounts')
        .insert({
            profile_id: profile.id,
            platform: 'discord',
            platform_id: discordId,
            is_primary: true
        })
        .select();

    if (error) {
        console.error('Error linking:', error.message);
    } else {
        console.log('✅ Successfully linked!', data);
    }
}

const targetSafetag = '@Discord';
// Using the same Discord ID as @rarktech for testing purposes, 
// or I can use a dummy one if I just want to see the log in notifications.ts
const dummyDiscordId = '123456789012345678';
linkDiscord(targetSafetag, dummyDiscordId);
