const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: linked } = await supabase.from('linked_accounts').select('*');

    console.log('--- Profiles ---');
    profiles.forEach(p => console.log(`${p.id}: ${p.safetag} (Primary: ${p.primary_platform})`));

    console.log('\n--- Linked Accounts ---');
    linked.forEach(l => console.log(`Profile ${l.profile_id} -> ${l.platform}: ${l.platform_id} (Primary: ${l.is_primary})`));
}

listAll();
