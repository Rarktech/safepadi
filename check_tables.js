const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
    console.log('🔍 Checking if tables exist...');
    const tables = ['profiles', 'admin_users', 'withdrawals', 'disputes', 'referral_commissions', 'kyc_submissions', 'transaction_proofs'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) {
            console.log(`❌ Table ${table} does not exist or error:`, error.message);
        } else {
            console.log(`✅ Table ${table} exists!`);
        }
    }
}

checkTables();
