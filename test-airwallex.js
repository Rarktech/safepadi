const axios = require('axios');

async function testAirwallex() {
    const clientId = '5oqlTV87Q0y8cvdT7UM2Qw';
    const apiKey = '854abf7d25594530366eabffc5f02ba193475e26f0fc27d8990915a779e2cfaad1119f5930e51ff4986cdfacc9b8bc72';

    try {
        // 1. Authenticate
        console.log('Authenticating...');
        const authRes = await axios.post('https://api-demo.airwallex.com/api/v1/authentication/login', {}, {
            headers: {
                'x-client-id': clientId,
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const token = authRes.data.token;
        console.log('Token received:', token.substring(0, 10) + '...');

        // 2. Create Payment Intent
        console.log('Creating Payment Intent...');
        const piRes = await axios.post('https://api-demo.airwallex.com/api/v1/pa/payment_intents/create', {
            request_id: 'test_' + Date.now(),
            amount: 100.00,
            currency: 'USD',
            merchant_order_id: 'ORDER_' + Date.now(),
            return_url: 'https://example.com/success'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Payment Intent Response:', JSON.stringify(piRes.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

testAirwallex();
