import { supabase } from './packages/shared/src';
async function run() {
    const { data, error } = await supabase.from('transactions').select('*').limit(5);
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}
run();
