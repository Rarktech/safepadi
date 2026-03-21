const { supabase } = require('./packages/shared/dist/index');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function inspectSchema() {
    try {
        console.log('🔍 Querying disputes table for structure...');
        const { data, error } = await supabase
            .from('disputes')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('❌ Error:', error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Columns found in existing row:', Object.keys(data[0]));
        } else {
            console.log('⚠️ No rows found in disputes table to inspect keys.');
            // Try to insert a dummy row to see what fails or check if we can get column info
        }
    } catch (e) {
        console.error('🔥 Critical error:', e);
    }
}

inspectSchema();
