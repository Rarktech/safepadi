import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (!_client) {
        const url = process.env.SUPABASE_URL || '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        _client = createClient(url, key);
    }
    return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop: string | symbol) {
        return (getClient() as any)[prop];
    }
});
