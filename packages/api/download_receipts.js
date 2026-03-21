
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadReceipts() {
    const txnCode = 'TXN-20260316-1B1367';
    const artifactDir = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\6938c87e-a4f5-4730-915f-922f63780fd2';
    
    const views = [
        { name: 'buyer_receipt.png', url: `http://localhost:3000/api/receipts/${txnCode}.png?type=completed&role=buyer` },
        { name: 'seller_receipt.png', url: `http://localhost:3000/api/receipts/${txnCode}.png?type=completed&role=seller` }
    ];

    for (const view of views) {
        try {
            console.log(`📡 Fetching ${view.name}...`);
            const response = await axios({
                method: 'get',
                url: view.url,
                responseType: 'arraybuffer'
            });
            const filePath = path.join(artifactDir, view.name);
            fs.writeFileSync(filePath, Buffer.from(response.data));
            console.log(`✅ Saved to ${filePath}`);
        } catch (err) {
            console.error(`❌ Failed to fetch ${view.name}:`, err.message);
        }
    }
}

downloadReceipts();
