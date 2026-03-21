const axios = require('axios');
require('dotenv').config();

async function trigger() {
    const txnCode = 'TXN-20260321-63E210'; // Valid from logs
    const webhookUrl = 'http://localhost:3000/api/payments/flutterwave/webhook';
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH || 'Godisalwaysgoodnew1@';

    const payload = {
        event: 'charge.completed',
        data: {
            id: Date.now(),
            tx_ref: `${txnCode}_${Date.now()}`,
            status: 'successful'
        }
    };

    console.log(`🚀 Triggering webhook for ${txnCode}...`);
    try {
        const res = await axios.post(webhookUrl, payload, {
            headers: { 'verif-hash': secretHash }
        });
        console.log('✅ Response:', res.status, res.data);
    } catch (err) {
        console.error('❌ Error hitting webhook:', err.response ? err.response.data : err.message);
    }
}

trigger();
