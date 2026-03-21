
const axios = require('axios');

async function test() {
    const code = 'TXN-20260316-1B1367'; // From user screenshot
    const url = `http://localhost:3000/api/transactions/${code}/proofs`;
    
    try {
        const res = await axios.get(url);
        console.log('✅ Proofs:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();
