const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('🔍 Checking for auth_otps table...');
    const { error: otpError } = await supabase.from('auth_otps').select('id').limit(1);
    
    if (otpError) {
        if (otpError.code === '42P01') {
            console.error('❌ Table "auth_otps" NOT FOUND.');
        } else {
            console.error('⚠️ Table "auth_otps" check error:', otpError.message);
        }
    } else {
        console.log('✅ Table "auth_otps" is PRESENT.');
    }

    console.log('🔍 Checking for binding_bans table...');
    const { error: banError } = await supabase.from('binding_bans').select('id').limit(1);
    
    if (banError) {
        if (banError.code === '42P01') {
            console.error('❌ Table "binding_bans" NOT FOUND.');
        } else {
            console.error('⚠️ Table "binding_bans" check error:', banError.message);
        }
    } else {
        console.log('✅ Table "binding_bans" is PRESENT.');
    }
}

verify();
