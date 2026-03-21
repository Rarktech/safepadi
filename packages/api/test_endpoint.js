
const axios = require('axios');

async function testEndpoint() {
    const code = 'TXN-20260316-3E23F7';
    const url = `http://localhost:3000/api/transactions/${code}/proofs`;
    
    console.log(`🌐 Testing endpoint: ${url}`);
    
    try {
        const res = await axios.get(url, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        console.log('✅ Response:', res.data);
    } catch (err) {
        console.error('❌ Request failed:', err.message);
        if (err.response) {
            console.error('📦 Status:', err.response.status);
            console.error('📦 Data:', err.response.data);
        }
    }
}

testEndpoint();
