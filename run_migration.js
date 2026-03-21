const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('🔄 Checking if referred_by_id column exists...');

        // 1. Check if column exists by trying to select it
        const { error: checkError } = await supabase.from('profiles').select('referred_by_id').limit(1);

        if (checkError && checkError.code === '42703') {
            console.log('✨ Column referred_by_id does not exist. Creating it via RPC (requires execution from SQL editor if no RPC exists).');
            console.log('\n======================================================');
            console.log('⚠️ PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD: ⚠️');
            console.log('======================================================\n');
            console.log(fs.readFileSync(path.resolve(__dirname, 'referral_migration.sql'), 'utf-8'));
            console.log('\n======================================================\n');
        } else if (checkError) {
            console.error('❌ Error checking column:', checkError);
        } else {
            console.log('✅ referred_by_id column already exists. Checking for referral_commissions table...');

            const { error: tableError } = await supabase.from('referral_commissions').select('id').limit(1);
            if (tableError && tableError.code === '42P01') {
                console.log('✨ Table referral_commissions does not exist.');
                console.log('\n======================================================');
                console.log('⚠️ PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD: ⚠️');
                console.log('======================================================\n');
                console.log(fs.readFileSync(path.resolve(__dirname, 'referral_migration.sql'), 'utf-8'));
                console.log('\n======================================================\n');
            } else if (tableError) {
                console.error('❌ Error checking table:', tableError);
            } else {
                console.log('✅ referral_commissions table already exists! Migration is complete.');
            }
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

runMigration();
