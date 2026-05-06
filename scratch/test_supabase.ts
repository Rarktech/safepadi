import { supabase } from './packages/shared/src/supabase';

async function test() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('❌ Supabase Error:', error);
    } else {
        console.log('✅ Supabase Success:', data);
    }
}

test();
