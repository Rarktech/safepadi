const fs = require('fs');
const path = require('path');

function generateNotification(metadata, content, attachments, disputeData, user, REVIEWS_URL) {
    const txn = disputeData.transaction;
    const cleanMsgContent = content.replace(/\[ADMIN_MSG:.*?\]/g, '').replace(/\[ADMIN_JOINED:.*?\]/g, '').trim();
    
    let msgHeader = '';
    let msgBody = '';
    
    if (metadata.type === 'join_announcement') {
        msgHeader = `🛡️ **Human Support Joined**`;
        msgBody = `Support agent **${metadata.identity || 'Admin'}** has joined the conversation to resolve this dispute personally. AI Mediation is now on standby.`;
    } else if (!cleanMsgContent && (attachments && attachments.length > 0)) {
        msgHeader = `📎 **Admin added an attachment**`;
        msgBody = `**${metadata.identity || 'Admin'}** just added a file to your case context.`;
    } else {
        msgHeader = `💬 **New Message from Support**`;
        msgBody = `**${metadata.identity || 'Admin'}**: ${cleanMsgContent.substring(0, 100)}${cleanMsgContent.length > 100 ? '...' : ''}`;
    }

    const fullMsg = `${msgHeader}\n\n${msgBody}\n\n**Case Context:**\n📦 ${txn.product_name}\n💰 ${txn.amount} ${txn.currency}\n🆔 #${txn.txn_code}`;

    const actionBtn = {
        label: '👁️ View Case',
        url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${disputeData.transaction_id}`
    };

    return { fullMsg, actionBtn };
}

const testDispute = {
    transaction_id: 'txn-123',
    transaction: {
        product_name: 'iPhone 15 Pro',
        amount: 1500,
        currency: 'USD',
        txn_code: 'SAF-9988'
    }
};

const testUser = { safetag: 'buyer123' };
const REVIEWS_URL = 'https://Safeeely.com';

let results = '';

results += 'Test 1: Regular admin message\n';
const t1 = generateNotification({ identity: 'Sarah' }, 'Hello, I am looking into this.', [], testDispute, testUser, REVIEWS_URL);
results += `Msg: ${t1.fullMsg}\n\n`;

results += 'Test 2: Attachment only message\n';
const t2 = generateNotification({ identity: 'Mike' }, '', [{ url: 'foo.png', name: 'receipt.png' }], testDispute, testUser, REVIEWS_URL);
results += `Msg: ${t2.fullMsg}\n\n`;

results += 'Test 3: Join announcement\n';
const t3 = generateNotification({ identity: 'System Admin', type: 'join_announcement' }, '', [], testDispute, testUser, REVIEWS_URL);
results += `Msg: ${t3.fullMsg}\n\n`;

fs.writeFileSync('verify_results.txt', results);
console.log('Results written to verify_results.txt');
