import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('📡 Supabase Client initializing...');
console.log('🔗 URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('🔑 Service Key:', supabaseServiceKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('🚨 Supabase configuration is missing. Requests will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
