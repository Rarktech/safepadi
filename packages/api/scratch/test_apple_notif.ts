import * as dotenv from 'dotenv';
import * as path from 'path';
import { sendNotification } from '../src/services/notifications';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runTest() {
    console.log('🧪 Starting Apple Notification Handshake Test...');
    console.log(`📡 Using JIVO_PROVIDER_ID: ${process.env.JIVO_PROVIDER_ID}`);
    
    // Using a placeholder platformId (Jivo client_id)
    // Even if the ID is dummy, Jivo should return a 200 OK or a specific "Session Not Found" error.
    // A 403 or 500 would indicate a middleware/credential issue.
    const testClientId = 'test_device_123'; 
    
    try {
        await sendNotification(
            'apple', 
            testClientId, 
            '🧪 This is a synthetic delivery test from the Safeeely Notification Engine.',
            [
                { label: '✅ I Received This', customId: 'test_ok' },
                { label: '📋 View Website', url: 'https://safeeely.com' }
            ],
            'https://tunhrbkwzrfpuckbgckc.supabase.co/storage/v1/object/public/receipts/test-receipt.png'
        );
        console.log('\n✨ Test execution finished. Check the debug_notification.log for details.');
    } catch (err: any) {
        console.error('\n❌ Test Script Fatal Error:', err.message);
    }
}

runTest();
