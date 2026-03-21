
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('🔍 Triggering detailed error on transaction_proofs...');
    const { error } = await supabase.from('transaction_proofs').insert({}).select();
    
    if (error) {
        console.log('--- ERROR START ---');
        console.log('Message:', error.message);
        console.log('Details:', error.details);
        console.log('Hint:', error.hint);
        console.log('--- ERROR END ---');
    } else {
        console.log('✅ Wait, it succeeded with empty object? That means no columns are NOT NULL.');
    }
}

checkTable();
