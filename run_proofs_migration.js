const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running Proofs Migration...');
    try {
        const migration = fs.readFileSync(path.resolve(__dirname, './proofs_migration.sql'), 'utf-8');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: migration });
        if (error) {
            console.error('❌ Migration failed:', error);
        } else {
            console.log('✅ Migration complete!', data);
        }
    } catch (err) {
        console.error('💥 Unexpected error:', err.message);
    }
}

runMigration();
