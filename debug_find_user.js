const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findUser() {
    const query = process.argv[2] || 'Goodie';
    console.log(`🔍 Searching for profiles matching "${query}"...`);

    // Search both ilike and simple check
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`safetag.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('❓ No users found.');
    } else {
        console.log(`✅ Found ${data.length} users:`);
        data.forEach(u => {
            console.log(`- ID: ${u.id} | Safetag: "${u.safetag}" | Name: ${u.first_name} ${u.last_name}`);
        });
    }
}

findUser();
