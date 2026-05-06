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
        console.log('🔄 Checking if transaction_type column exists...');

        // 1. Check if column exists by trying to select it
        const { error: checkError } = await supabase.from('transactions').select('transaction_type').limit(1);

        if (checkError && checkError.code === '42703') {
            console.log('✨ Column transaction_type does not exist. Creating it via RPC (requires execution from SQL editor if no RPC exists).');
            console.log('\n======================================================');
            console.log('⚠️ PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD: ⚠️');
            console.log('======================================================\n');
            console.log(fs.readFileSync(path.resolve(__dirname, 'milestones_migration.sql'), 'utf-8'));
            console.log('\n======================================================\n');
        } else if (checkError) {
            console.error('❌ Error checking column:', checkError);
        } else {
            console.log('✅ transaction_type column already exists. Checking for transaction_milestones table...');

            const { error: tableError } = await supabase.from('transaction_milestones').select('id').limit(1);
            if (tableError && tableError.code === '42P01') {
                console.log('✨ Table transaction_milestones does not exist.');
                console.log('\n======================================================');
                console.log('⚠️ PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD: ⚠️');
                console.log('======================================================\n');
                console.log(fs.readFileSync(path.resolve(__dirname, 'milestones_migration.sql'), 'utf-8'));
                console.log('\n======================================================\n');
            } else if (tableError) {
                console.error('❌ Error checking table:', tableError);
            } else {
                console.log('✅ transaction_milestones table already exists! Migration is complete.');
            }
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

runMigration();
