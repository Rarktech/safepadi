const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(profileId) {
    console.log(`Checking profile: ${profileId}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

    if (profile) {
        console.log('Profile found:', JSON.stringify(profile, null, 2));
    } else {
        console.log('Profile not found');
    }

    const { data: linked } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('profile_id', profileId);

    console.log(`Found ${linked ? linked.length : 0} linked accounts:`);
    if (linked) {
        linked.forEach(l => {
            console.log(`- ${l.platform}: ${l.platform_id} (Primary: ${l.is_primary})`);
        });
    }
}

const sellerId = '568d3158-bebe-457c-8d31-0e0cdf04fab6';
checkUser(sellerId);
