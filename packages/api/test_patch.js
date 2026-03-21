
const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

async function test() {
    try {
        const id = 'fe0ee840-88c5-4578-96f8-6b90e484934f';
        console.log(`Patching txn ${id}...`);
        const res = await axios.patch(`${API_URL}/transactions/${id}/status`, {
            status: 'confirm_receipt'
        });
        console.log('Success:', res.data);
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

test();
