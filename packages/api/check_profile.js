require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('profiles').select('id, safetag').limit(1).single();
    if (data) {
        console.log("VALID_PROFILE_ID=" + data.id);
        console.log("VALID_SAFETAG=" + data.safetag);
    } else {
        console.log("No profiles found in DB!");
    }
}

check();
