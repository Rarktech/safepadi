const axios = require('axios');

async function test() {
    console.log('Testing localhost:3000/api/debug-version...');
    try {
        const res = await axios.get('http://localhost:3000/api/debug-version', { timeout: 5000 });
        console.log('✅ Localhost success:', res.data);
    } catch (e) {
        console.error('❌ Localhost failure:', e.message);
    }

    console.log('\nTesting ngrok URL...');
    const ngrokUrl = 'https://3575-105-120-128-191.ngrok-free.app/api/debug-version';
    try {
        const res = await axios.get(ngrokUrl, { timeout: 10000, headers: { 'ngrok-skip-browser-warning': '1' } });
        console.log('✅ Ngrok success:', res.data);
    } catch (e) {
        console.error('❌ Ngrok failure:', e.message);
    }
}

test();
