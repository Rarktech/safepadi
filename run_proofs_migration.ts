import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running Proofs Migration...');
    const migration = fs.readFileSync(path.resolve(__dirname, './proofs_migration.sql'), 'utf-8');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migration });
    if (error) {
        console.error('❌ Migration failed:', error);
    } else {
        console.log('✅ Migration complete!', data);
    }
}

runMigration();
