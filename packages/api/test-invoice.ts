import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { sendTransactionInvoiceEmail } from './src/services/email';

async function main() {
    console.log('Sending test invoice to @Trio (Richardsafeeely@gmail.com)...');
    await sendTransactionInvoiceEmail({
        txnCode: 'TXN-TEST-001',
        txnId:   'edf17df6-0000-0000-0000-000000000001',
        invoiceDate: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
        seller: {
            firstName: 'Jane',
            lastName:  'Seller',
            safetag:   '@janedoe',
            email:     'jane@example.com',
        },
        buyer: {
            firstName: 'Richard',
            lastName:  'Eze',
            safetag:   '@Trio',
            email:     'Richardsafeeely@gmail.com',
        },
        productName:     'Logo Design Package',
        description:     'Full brand identity — primary logo, variations, and style guide PDF.',
        transactionType: 'ONE_TIME',
        amount:          150,
        feeAmount:       7.5,
        totalAmount:     157.5,
        feeAllocation:   'buyer',
        currency:        'USD',
    });
    console.log('✅ Done — check Richardsafeeely@gmail.com');
}

main().catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });
