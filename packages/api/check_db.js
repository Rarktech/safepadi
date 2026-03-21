
const { supabase } = require('./dist/index'); // Use the dist of shared
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function checkData() {
    console.log('--- Profiles ---');
    const { data: profiles } = await supabase.from('profiles').select('safetag, primary_platform');
    console.log(profiles);

    console.log('--- Transactions ---');
    const { data: txns } = await supabase.from('transactions').select('txn_code, status, total_amount, currency');
    console.log(txns);
}

checkData();
