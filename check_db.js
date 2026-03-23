const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const ts = ['profiles', 'admin_users', 'withdrawals', 'disputes', 'referral_commissions', 'kyc_submissions', 'transaction_proofs', 'auth_otps', 'binding_bans', 'payout_methods', 'transactions', 'reviews', 'review_replies', 'review_votes', 'admin_notifications', 'dispute_messages'];
    for (const t of ts) {
        const { error } = await s.from(t).select('id').limit(1);
        if (error) {
            console.log(`Table ${t}: Missing (${error.message})`);
        } else {
            console.log(`Table ${t}: Exists`);
        }
    }
}
run();
