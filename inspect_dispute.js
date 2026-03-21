const axios = require('axios');

async function checkDispute() {
    const API_URL = 'http://localhost:3000/api';
    const disputeId = '14717683-e0b5-45b2-a3bf-24f3a292be37'; // From recent logs
    try {
        const res = await axios.get(`${API_URL}/admin/disputes/${disputeId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        console.log('Dispute Keys:', Object.keys(res.data));
        console.log('Transaction Keys:', Object.keys(res.data.transaction));
        if (res.data.logs) {
            console.log('Logs found:', res.data.logs.length);
            console.log('First Log:', res.data.logs[0]);
        } else {
            console.log('No logs found on dispute object');
        }
        if (res.data.transaction.logs) {
             console.log('Transaction Logs found:', res.data.transaction.logs.length);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkDispute();
