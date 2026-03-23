const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAll() {
    try {
        console.log('🔍 Listing tables by querying sample data from various possible tables...');
        const tables = [
            'profiles', 'admin_users', 'withdrawals', 'disputes', 'referral_commissions',
            'kyc_submissions', 'transaction_proofs', 'auth_otps', 'binding_bans',
            'payout_methods', 'transactions', 'reviews', 'review_replies', 'review_votes',
            'admin_notifications', 'dispute_messages'
        ];
        
        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                if (error.code === '42P01') {
                    console.log(`❌ Table ${table} does NOT exist.`);
                } else {
                    console.log(`⚠️ Error accessing table ${table}:`, error.message);
                }
            } else {
                console.log(`✅ Table ${table} EXISTS. Columns:`, data.length > 0 ? Object.keys(data[0]) : 'No data to inspect columns');
            }
        }
    } catch (e) {
        console.error('🔥 Error listing:', e);
    }
}

listAll();
