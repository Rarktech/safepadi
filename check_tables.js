const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const tables = ['profiles', 'transactions', 'transaction_proofs', 'disputes'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table}:`, error.message);
        } else {
            console.log(`✅ Table ${table}: OK`);
        }
    }
}

check();
