import { supabase } from '@safepal/shared';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function reset() {
    const txnCode = 'TXN-20260321-63E210';
    console.log(`🔄 Resetting ${txnCode} to PENDING...`);
    const { error } = await supabase
        .from('transactions')
        .update({ status: 'PENDING' })
        .eq('txn_code', txnCode);
    
    if (error) {
        console.error('❌ Error resetting:', error.message);
    } else {
        console.log('✅ Status reset to PENDING.');
    }
    process.exit(0);
}

reset();
