const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBySafetag(safetag) {
    console.log(`Checking safetag: ${safetag}`);

    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('safetag', safetag)
        .maybeSingle();

    if (pError) {
        console.error('Profile error:', pError.message);
        return;
    }

    if (!profile) {
        console.log('No profile found with that safetag');
        return;
    }

    console.log(`Profile found:`, JSON.stringify(profile, null, 2));

    const { data: linked, error: lError } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('profile_id', profile.id);

    if (lError) {
        console.error('Linked accounts error:', lError.message);
    } else {
        console.log(`Found ${linked.length} linked accounts:`);
        linked.forEach(l => {
            console.log(`- ${l.platform}: ${l.platform_id} (Primary: ${l.is_primary})`);
        });
    }
}

const targetSafetag = '@Discord';
checkBySafetag(targetSafetag);
