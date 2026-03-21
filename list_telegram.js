const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTelegram() {
    const { data: linked } = await supabase
        .from('linked_accounts')
        .select('*, profile:profiles(safetag)')
        .eq('platform', 'telegram');

    console.log('--- Telegram Linked Accounts ---');
    if (!linked || linked.length === 0) {
        console.log('No Telegram accounts found!');
    } else {
        linked.forEach(l => {
            console.log(`Profile ${l.profile_id} (${l.profile?.safetag}) -> telegram: ${l.platform_id} (Primary: ${l.is_primary})`);
        });
    }
}

listTelegram();
