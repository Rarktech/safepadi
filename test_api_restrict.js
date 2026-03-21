const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:3000/api';

async function testRestrict() {
    try {
        // Find a dispute ID
        const { data: disputes } = await axios.get(`${API_URL}/admin/disputes`);
        if (!disputes || disputes.length === 0) {
            console.log('No disputes found to test.');
            return;
        }
        
        const id = disputes[0].id;
        console.log(`🧪 Testing restrict on dispute ${id}...`);
        
        const res = await axios.post(`${API_URL}/disputes/${id}/restrict`, {
            restricted_to: 'BUYER'
        });
        
        console.log('✅ Success:', res.data);
    } catch (e) {
        console.error('❌ Failed:', e.response?.data || e.message);
    }
}

testRestrict();
