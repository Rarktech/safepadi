
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const txnId = '74cb7674-9d62-4cb6-a4a6-c188396be723';
    const { data: txn, error } = await supabase
        .from('transactions')
        .select('*, buyer:buyer_id(*), seller:seller_id(*)')
        .eq('id', txnId)
        .single();

    if (error || !txn) {
        console.error('Txn error:', error?.message);
        return;
    }

    console.log('--- Transaction Info ---');
    console.log('ID:', txn.id);
    console.log('Code:', txn.txn_code);
    console.log('Buyer Profile ID:', txn.buyer_id);
    console.log('Seller Profile ID:', txn.seller_id);

    const { data: accounts } = await supabase
        .from('linked_accounts')
        .select('*')
        .in('profile_id', [txn.buyer_id, txn.seller_id]);

    console.log('\n--- Linked Accounts ---');
    console.table(accounts.map(a => ({
        profile_id: a.profile_id,
        platform: a.platform,
        platform_id: a.platform_id,
        is_primary: a.is_primary
    })));
}

check();
