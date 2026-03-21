const { supabase } = require('./packages/shared/dist/index');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function inspectSchema() {
    console.log('🔍 Inspecting Disputes Table Schema...');
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'disputes' });
    
    if (error) {
        // Fallback: try a direct query and inspect keys
        console.log('RPC failed, trying sample query...');
        const { data: sample, error: sampleError } = await supabase
            .from('disputes')
            .select('*')
            .limit(1)
            .single();
            
        if (sampleError) {
            console.error('❌ Error fetching sample:', sampleError);
            return;
        }
        console.log('Columns found:', Object.keys(sample));
    } else {
        console.log('Columns:', data);
    }
}

inspectSchema();
