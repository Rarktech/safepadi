
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const txnId = '2303cabb-52a1-482c-8b6a-c49f945cc3c8'; // TXN-20260316-3E23F7
    console.log(`🧪 Testing insert for ${txnId}...`);

    const { data, error } = await supabase.from('transaction_proofs').insert({
        transaction_id: txnId,
        file_url: 'https://cdn.discordapp.com/attachments/1476258014519365726/1483057600588152916/receipt.png',
        file_name: 'Discord Upload (Image)',
        file_size: 0
    }).select();

    if (error) {
        console.error('❌ Insert FAILED:', error.message);
        console.error('Details:', error.details);
    } else {
        console.log('✅ Insert SUCCEEDED:', data);
    }
}

testInsert();
