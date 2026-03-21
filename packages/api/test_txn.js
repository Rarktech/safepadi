
const axios = require('axios');

async function testTxn() {
    const code = 'TXN-20260316-3E23F7';
    const url = `http://localhost:3000/api/transactions/${code}`;
    
    console.log(`🌐 Testing endpoint: ${url}`);
    
    try {
        const res = await axios.get(url, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        console.log('✅ Response Status:', res.data.status);
        console.log('✅ Full Details:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('❌ Request failed:', err.message);
    }
}

testTxn();
