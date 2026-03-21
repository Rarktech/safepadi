import { supabase } from '@safepal/shared';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the root or current dir
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runTest() {
    console.log('🚀 Starting Webhook Test Script...');

    // 1. Find a transaction to test with (or use a placeholder)
    // We'll try to find the one from the logs first
    const testTxnCode = 'TXN-20260321-63E210'; 
    
    console.log(`🔍 Checking status for ${testTxnCode}...`);
    const { data: txn, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('txn_code', testTxnCode)
        .single();

    if (error || !txn) {
        console.error('❌ Transaction not found. Please provide a valid txn_code in the script.');
        process.exit(1);
    }

    console.log(`📦 Transaction found: ${txn.product_name} | Status: ${txn.status}`);

    // 2. Reset status to PENDING so we can trigger the notification logic
    console.log('🔄 Resetting status to PENDING for testing...');
    const { error: upErr } = await supabase
        .from('transactions')
        .update({ status: 'PENDING' })
        .eq('id', txn.id);

    if (upErr) {
        console.error('❌ Failed to reset status:', upErr.message);
        process.exit(1);
    }

    // 3. Prepare Mock Webhook Payload
    const webhookUrl = 'http://localhost:3000/api/payments/flutterwave/webhook';
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!secretHash) {
        console.warn('⚠️ FLUTTERWAVE_WEBHOOK_HASH not found in .env');
    }

    const payload = {
        event: 'charge.completed',
        data: {
            id: 999999,
            tx_ref: `${txn.txn_code}_${Date.now()}`,
            status: 'successful',
            amount: txn.total_amount,
            currency: txn.currency
        }
    };

    console.log('📤 Sending Mock Flutterwave Webhook...');
    console.log(`🔗 URL: ${webhookUrl}`);
    console.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
        const startTime = Date.now();
        const response = await axios.post(webhookUrl, payload, {
            headers: {
                'verif-hash': secretHash || ''
            },
            timeout: 30000 // 30s timeout for notifications to complete
        });
        const duration = (Date.now() - startTime) / 1000;

        console.log(`\n✅ Webhook Result: ${response.status} ${response.statusText}`);
        console.log(`⏱️ Duration: ${duration}s`);
        console.log(`📝 Response Body: ${JSON.stringify(response.data)}`);
        
        console.log('\n✨ TEST COMPLETE. Check your bot and terminal logs for notification activity.');
    } catch (err: any) {
        console.error('\n❌ Webhook POST Failed:');
        if (err.response) {
            console.error(`  Status: ${err.response.status}`);
            console.error(`  Data: ${JSON.stringify(err.response.data)}`);
        } else {
            console.error(`  Error: ${err.message}`);
        }
    }
}

runTest().catch(console.error);
