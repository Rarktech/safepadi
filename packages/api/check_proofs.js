
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProofs() {
    const txnCode = 'TXN-20260316-3E23F7';
    console.log(`🔍 Checking proofs for ${txnCode}...`);

    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('txn_code', txnCode)
        .single();

    if (txnError || !txn) {
        console.error('❌ Transaction not found:', txnError?.message);
        return;
    }

    console.log(`✅ Found Transaction: ${txn.id} (Status: ${txn.status})`);

    const { data: proofs, error: proofError } = await supabase
        .from('transaction_proofs')
        .select('*')
        .eq('transaction_id', txn.id);

    if (proofError) {
        console.error('❌ Error fetching proofs:', proofError.message);
        return;
    }

    console.log(`📊 Found ${proofs.length} proof documents.`);
    proofs.forEach((p, i) => {
        console.log(`  [${i+1}] Name: ${p.file_name}, URL: ${p.file_url}`);
    });
}

checkProofs();
