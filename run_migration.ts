import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const migration = fs.readFileSync(path.resolve(__dirname, '../../withdrawals_migration.sql'), 'utf-8');
    const { error } = await supabase.rpc('exec_sql', { sql_query: migration });
    if (error) {
        console.error('❌ Migration failed:', error);
        // Fallback for when exec_sql RPc doesn't exist
        console.log('💡 Trying individual commands if possible...');
    } else {
        console.log('✅ Migration complete!');
    }
}

runMigration();
