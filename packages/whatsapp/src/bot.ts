import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { FlowCrypto } from './utils/crypto';
import { processSmartTransaction, SmartTransactionDraft } from '../../shared/src/ai/smartTransaction';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const app = express();
app.use(express.json());

const WHATSAPP_TOKEN   = process.env.WHATSAPP_TOKEN   || '';
const PHONE_NUMBER_ID  = process.env.PHONE_NUMBER_ID  || '';
const HUB_VERIFY_TOKEN = process.env.HUB_VERIFY_TOKEN || 'SAFEO_VERIFY_123';
const VERSION          = 'v17.0';
const API_URL          = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const PUBLIC_API_URL   = process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL      = process.env.REVIEWS_URL || 'https://safeeely.com';

// ─── Flow security (RSA for WhatsApp Flows) ───────────────────────────────────
const PRIVATE_KEY_PATH = path.resolve(__dirname, '../private.pem');
let flowCrypto: FlowCrypto | null = null;
try {
    if (fs.existsSync(PRIVATE_KEY_PATH)) {
        flowCrypto = new FlowCrypto(fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'));
        console.log('🛡️ WhatsApp Flow Security Initialized');
    } else {
        console.warn('⚠️ Private key not found:', PRIVATE_KEY_PATH);
    }
} catch (e: any) {
    console.error('❌ Flow Security init failed:', e.message);
}

console.log(`🚀 Safeeely WhatsApp Bot Starting...`);

// ─── Session state ────────────────────────────────────────────────────────────
const loginSessions:   Map<string, { step: string; safetag?: string }> = new Map();
const smartTxnSessions: Map<string, SmartTransactionDraft>              = new Map();
const txnSessions:     Map<string, { step: string; formData: any }>    = new Map();
const reviewSessions:  Map<string, { step: string; formData: any }>    = new Map();
const disputeSessions: Map<string, { txnId: string; raisedBy: string }> = new Map();
const refSessions:     Map<string, string>                               = new Map();

// ─── Message helpers ──────────────────────────────────────────────────────────

async function sendMsg(to: string, payload: any) {
    try {
        await axios.post(
            `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`,
            { messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload },
            { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
        );
    } catch (err: any) {
        console.error('❌ WA API Error:', err.response?.data || err.message);
    }
}

const sendText = (to: string, text: string) =>
    sendMsg(to, { type: 'text', text: { body: text } });

function sendButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>, header?: string) {
    return sendMsg(to, {
        type: 'interactive',
        interactive: {
            type: 'button',
            ...(header ? { header: { type: 'text', text: header } } : {}),
            body: { text: body },
            action: { buttons: buttons.slice(0, 3).map(b => ({ type: 'reply', reply: { id: b.id, title: b.title.substring(0, 20) } })) }
        }
    });
}

function sendList(to: string, header: string, body: string, sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>, footer?: string, btnText = 'Open Menu') {
    return sendMsg(to, {
        type: 'interactive',
        interactive: {
            type: 'list',
            header: { type: 'text', text: header },
            body: { text: body },
            ...(footer ? { footer: { text: footer } } : {}),
            action: { button: btnText, sections }
        }
    });
}

function sendCTAUrl(to: string, body: string, btnText: string, url: string, header?: string) {
    return sendMsg(to, {
        type: 'interactive',
        interactive: {
            type: 'cta_url',
            ...(header ? { header: { type: 'text', text: header } } : {}),
            body: { text: body },
            action: { name: 'cta_url', parameters: { display_text: btnText.substring(0, 20), url } }
        }
    });
}

const sendImage = (to: string, imageUrl: string, caption?: string) =>
    sendMsg(to, { type: 'image', image: { link: imageUrl, ...(caption ? { caption } : {}) } });

// ─── Shared menus ─────────────────────────────────────────────────────────────

function sendMainMenu(to: string, headerText = '🏠 Main Menu') {
    return sendList(to, headerText, "What would you like to do today?", [
        {
            title: 'Transactions',
            rows: [
                { id: 'CREATE_TXN', title: '🛒 Create Transaction', description: 'Start a new escrow deal' },
                { id: 'MY_TXNS',    title: '📋 My Transactions',    description: 'View and manage your deals' }
            ]
        },
        {
            title: 'Account',
            rows: [
                { id: 'BALANCE',  title: '💰 Balance & Withdrawals', description: 'Check your earnings' },
                { id: 'REFERRAL', title: '🎁 Referral',              description: 'Invite friends, earn commission' },
                { id: 'REVIEWS',  title: '⭐ Reviews & Ratings',     description: 'Your trust score' },
                { id: 'SETTINGS', title: '⚙️ Settings & Account',   description: 'Manage your account' }
            ]
        }
    ], undefined, 'Open Menu');
}

function sendCurrencyList(to: string) {
    return sendList(to, '💱 Select Currency', 'Choose the currency for this transaction:', [{
        title: 'Currencies',
        rows: [
            { id: 'CURRENCY_NGN',  title: '🇳🇬 NGN',  description: 'Nigerian Naira' },
            { id: 'CURRENCY_USD',  title: '🇺🇸 USD',  description: 'US Dollar' },
            { id: 'CURRENCY_USDT', title: '🔷 USDT', description: 'Tether Stablecoin' }
        ]
    }], undefined, 'Select');
}

function sendTxnFilter(to: string) {
    return sendList(to, '📋 My Transactions', 'Filter by status:', [{
        title: 'Status',
        rows: [
            { id: 'FILTER_ONGOING',   title: '🔄 Ongoing',   description: 'Active transactions' },
            { id: 'FILTER_COMPLETED', title: '✅ Completed', description: 'Finished transactions' },
            { id: 'FILTER_DISPUTED',  title: '⚠️ Disputed',  description: 'In dispute' },
            { id: 'FILTER_ALL',       title: '📋 All',       description: 'View all' }
        ]
    }], undefined, 'Select');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number, currency: string) {
    const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    return sym[currency]
        ? `${sym[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${parseFloat(amount.toFixed(8))} ${currency}`;
}

function statusLabel(status: string) {
    const map: Record<string, string> = {
        PENDING_SELLER_ACCEPTANCE: '⏳ Awaiting Acceptance',
        ACCEPTED: '✅ Accepted', PAID: '💳 Paid',
        AWAITING_PROOF: '📎 Awaiting Proof', COMPLETED_BY_SELLER: '📦 Marked Complete',
        COMPLETED: '✅ Completed', DISPUTED: '⚠️ Disputed',
        CANCELLED: '❌ Cancelled', REFUNDED: '💸 Refunded'
    };
    return map[status] || status;
}

async function getProfile(from: string) {
    const res = await axios.get(`${API_URL}/profiles/by_platform/whatsapp/${from}`);
    return res.data;
}

// ─── Flow: balance ────────────────────────────────────────────────────────────

async function showBalance(from: string) {
    try {
        const p = await getProfile(from);
        const balRes = await axios.get(`${API_URL}/profiles/${p.safetag}/balance`);
        const { balances } = balRes.data;

        let msg = '💰 *Available Balance*\n\n';
        if (!balances?.length) {
            msg += 'You currently have no available balance. Complete transactions to earn!';
        } else {
            balances.forEach((b: any) => {
                const flag = b.currency === 'NGN' ? '🇳🇬' : b.currency === 'USD' ? '🇺🇸' : '🪙';
                msg += `${flag} *${b.amount.toLocaleString()} ${b.currency}*\n`;
            });
            msg += '\n_Balances are calculated from your completed (finalized) sales._';
        }

        const withdrawUrl = `${REVIEWS_URL}/withdraw/${encodeURIComponent(p.safetag)}?viewer=${encodeURIComponent(p.safetag)}`;
        await sendText(from, msg);
        await sendCTAUrl(from, 'Withdraw your earnings securely:', '💸 Withdraw Funds', withdrawUrl);
        await sendButtons(from, 'Need anything else?', [{ id: 'MAIN_MENU', title: '🔙 Main Menu' }]);
    } catch (err: any) {
        await sendText(from, '❌ Could not load your balance. Please try again.');
    }
}

// ─── Flow: referral ───────────────────────────────────────────────────────────

async function showReferral(from: string) {
    try {
        const p = await getProfile(from);
        const statsRes = await axios.get(`${API_URL}/referrals/${p.safetag}/stats`);
        const stats = statsRes.data;

        const cleanSafetag = p.safetag.startsWith('@') ? p.safetag : `@${p.safetag}`;
        const referralLink = `${REVIEWS_URL}/${cleanSafetag}`;
        const withdrawUrl  = `${REVIEWS_URL}/withdraw/${encodeURIComponent(p.safetag)}?viewer=${encodeURIComponent(p.safetag)}#referrals`;

        const earningsLines = stats.earningsByCurrency?.length
            ? stats.earningsByCurrency.map((e: any) => `  • *${fmtCurrency(e.totalEarned, e.currency)}*`).join('\n')
            : '  • None yet';

        const caption =
            `🎁 *My Referrals*\n\n` +
            `Invite friends and earn up to *1.5% commission for life* on all secured purchases!\n\n` +
            `🔗 *Your Invite Link:*\n${referralLink}\n\n` +
            `📊 *Statistics:*\n` +
            `👥 Tier 1 Referrals: *${stats.tier1Count}*\n` +
            `👥 Tier 2 Referrals: *${stats.tier2Count}*\n` +
            `💰 *Commissions Earned:*\n${earningsLines}`;

        const cardUrl = `${PUBLIC_API_URL}/referrals/${p.safetag}/card`;
        try { await sendImage(from, cardUrl); } catch (_) {}

        await sendText(from, caption);
        await sendCTAUrl(from, 'Withdraw your referral earnings:', '💸 Withdraw Earnings', withdrawUrl);
        await sendButtons(from, 'Need anything else?', [{ id: 'MAIN_MENU', title: '🔙 Main Menu' }]);
    } catch (err: any) {
        await sendText(from, '❌ Could not load referral info. Please try again.');
    }
}

// ─── Flow: settings ───────────────────────────────────────────────────────────

async function showSettings(from: string) {
    try {
        const p = await getProfile(from);
        const safetag = p.safetag || 'N/A';
        const email   = p.email   || 'N/A';
        const name    = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'N/A';

        await sendButtons(from,
            `⚙️ *Account Settings*\n\n👤 Safetag: ${safetag}\n📧 Email: ${email}\n👤 Name: ${name}\n\nManage your account and privacy preferences below:`,
            [
                { id: 'START_DELETION', title: '❌ Delete Account'  },
                { id: 'OTHER_SETTINGS', title: '⚙️ Other Settings'  },
                { id: 'MAIN_MENU',      title: '🏠 Main Menu'       }
            ]
        );
    } catch (err: any) {
        await sendText(from, '❌ Could not load settings. Please try again.');
    }
}

async function showOtherSettings(from: string) {
    try {
        const p = await getProfile(from);
        const kycUrl = `${REVIEWS_URL}/kyc?viewer=${encodeURIComponent(p.safetag)}`;
        await sendButtons(from,
            '⚙️ *Other Settings*\n\nManage your linked accounts and identity verification:',
            [
                { id: 'LINKED_ACCOUNTS', title: '🔗 Linked Accounts' },
                { id: 'SETTINGS',        title: '🔙 Back'            }
            ]
        );
        await sendCTAUrl(from, 'Complete your identity verification:', '🛡️ KYC Verification', kycUrl);
    } catch (_) {
        await sendText(from, '❌ Could not load settings.');
    }
}

// ─── Flow: my transactions ────────────────────────────────────────────────────

async function showTransactions(from: string, filter: string) {
    try {
        const p = await getProfile(from);
        const filterMap: Record<string, string> = {
            FILTER_ONGOING: 'ongoing', FILTER_COMPLETED: 'completed',
            FILTER_DISPUTED: 'disputed', FILTER_ALL: 'all'
        };
        const res = await axios.get(`${API_URL}/transactions?safetag=${p.safetag}&status=${filterMap[filter] || 'all'}`);
        const txns: any[] = res.data?.transactions || res.data || [];

        if (!txns.length) {
            return sendButtons(from, '📋 You have no transactions yet.',
                [{ id: 'CREATE_TXN', title: '🛒 Create One' }, { id: 'MAIN_MENU', title: '🔙 Main Menu' }]);
        }

        // Show as list message (up to 10 rows)
        const rows = txns.slice(0, 10).map((t: any) => {
            const isBuyer = t.buyer_safetag === p.safetag;
            const other   = isBuyer ? t.seller_safetag : t.buyer_safetag;
            return {
                id:          `VIEW_TXN_${t.id}`,
                title:       (t.product_name || 'Transaction').substring(0, 24),
                description: `${statusLabel(t.status)} | w/ ${other}`.substring(0, 72)
            };
        });

        await sendList(from, '📋 My Transactions', 'Tap a transaction to view details:', [{ title: 'Transactions', rows }], undefined, 'View');
    } catch (err: any) {
        await sendText(from, '❌ Could not load transactions. Please try again.');
    }
}

async function showTransactionDetail(from: string, txnId: string) {
    try {
        const p = await getProfile(from);
        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
        const t   = res.data;
        const isBuyer = t.buyer_safetag === p.safetag;
        const role    = isBuyer ? 'buyer' : 'seller';
        const other   = isBuyer ? t.seller_safetag : t.buyer_safetag;

        let milestoneText = '';
        if (t.milestones?.length) {
            milestoneText = '\n\n📍 *Milestones:*\n' + t.milestones.map((m: any, i: number) =>
                `${i + 1}. ${m.title} — ${m.amount} ${t.currency} [${m.status}]`
            ).join('\n');
        }

        const detail =
            `📋 *Transaction Details*\n\n` +
            `🆔 ID: ${t.txn_code || t.id}\n` +
            `📦 Product: ${t.product_name}\n` +
            `📝 Description: ${t.description || 'N/A'}\n` +
            `💰 Amount: ${t.amount} ${t.currency}\n` +
            `👤 ${isBuyer ? 'Seller' : 'Buyer'}: ${other}\n` +
            `📊 Status: ${statusLabel(t.status)}` +
            milestoneText;

        await sendText(from, detail);

        // Contextual buttons (max 3)
        const buttons: Array<{ id: string; title: string }> = [];
        if (t.status === 'PENDING_SELLER_ACCEPTANCE' && role === 'seller') {
            buttons.push({ id: `ACCEPT_TXN_${t.id}`, title: '✅ Accept' });
            buttons.push({ id: `DECLINE_TXN_${t.id}`, title: '❌ Decline' });
        } else if (t.status === 'PAID' && role === 'seller') {
            buttons.push({ id: `COMPLETE_TXN_${t.id}`, title: '📦 Mark Complete' });
        } else if (t.status === 'AWAITING_PROOF' && role === 'buyer') {
            buttons.push({ id: `RECEIVED_TXN_${t.id}`, title: '✅ Mark Received' });
        } else if (t.status === 'COMPLETED') {
            buttons.push({ id: `REVIEW_TXN_${t.id}_${other}`, title: '⭐ Leave Review' });
        }
        if (!['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(t.status) && buttons.length < 3) {
            buttons.push({ id: `DISPUTE_TXN_${t.id}`, title: '🚩 Dispute' });
        }
        buttons.push({ id: 'MY_TXNS', title: '🔙 Back' });

        if (t.status === 'ACCEPTED' && role === 'buyer') {
            const payUrl = `${REVIEWS_URL}/pay/${t.id}`;
            await sendCTAUrl(from, 'Make your payment to activate the escrow:', '💳 Pay Now', payUrl);
            await sendButtons(from, 'Other actions:', [
                { id: `DISPUTE_TXN_${t.id}`, title: '🚩 Dispute' },
                { id: 'MY_TXNS', title: '🔙 Back' }
            ]);
        } else {
            await sendButtons(from, 'Choose an action:', buttons.slice(0, 3));
        }
    } catch (err: any) {
        await sendText(from, '❌ Could not load transaction details. Please try again.');
    }
}

// ─── Flow: counterparty preview ───────────────────────────────────────────────

async function showCounterpartyPreview(from: string, safetag: string, profile: any) {
    let ratingStr = 'No reviews yet';
    let badgeList = '';
    try {
        const statsRes = await axios.get(`${API_URL}/reviews/stats/${profile.safetag}`);
        if (statsRes.data.review_count > 0) {
            ratingStr = `${statsRes.data.average_rating.toFixed(1)}/5 ⭐ (${statsRes.data.review_count} reviews)`;
        }
    } catch (_) {}
    try {
        const badgesRes = await axios.get(`${API_URL}/profiles/${profile.safetag}/badges`);
        if (badgesRes.data?.length) {
            badgeList = '\n🏆 Badges: ' + badgesRes.data.map((b: any) => `${b.emoji} ${b.label}`).join(' | ');
        }
    } catch (_) {}

    await sendButtons(from,
        `👤 *Counterparty Profile*\n\nSafetag: ${safetag}\n⭐ Rating: ${ratingStr}${badgeList}\n\nDo you want to proceed with this transaction?`,
        [
            { id: 'CONFIRM_COUNTERPARTY', title: '✅ Confirm'  },
            { id: 'CANCEL_TXN',           title: '❌ Cancel'   }
        ]
    );
    const reviewsUrl = `${REVIEWS_URL}/${safetag.startsWith('@') ? safetag : '@' + safetag}`;
    await sendCTAUrl(from, 'View their full reviews and ratings:', '👁️ View Reviews ↗️', reviewsUrl);
}

// ─── Flow: transaction summary + creation ─────────────────────────────────────

async function showTransactionSummary(from: string) {
    const session = txnSessions.get(from)!;
    const fd      = session.formData;

    let milestoneText = '';
    if (fd.transaction_type === 'MILESTONE' && fd.milestones?.length) {
        const total = fd.milestones.reduce((s: number, m: any) => s + Number(m.amount), 0);
        milestoneText = '\n📍 *Milestones:*\n' + fd.milestones.map((m: any, i: number) =>
            `  ${i + 1}. ${m.title} — ${m.amount} ${fd.currency}`
        ).join('\n') + `\n💰 Total: ${total} ${fd.currency}`;
    }

    const summary =
        `📋 *Transaction Summary*\n\n` +
        `📦 Product: ${fd.product_name}\n` +
        `📝 Description: ${fd.description || 'N/A'}\n` +
        `💠 Type: ${fd.transaction_type === 'MILESTONE' ? 'Milestone' : 'One-Time'}\n` +
        (fd.transaction_type === 'ONE_TIME' ? `💰 Amount: ${fd.amount} ${fd.currency}\n` : milestoneText + '\n') +
        `💵 Fee: ${fd.fee_allocation === 'buyer' ? 'Buyer Pays' : fd.fee_allocation === 'seller' ? 'Seller Pays' : 'Split 50/50'}\n` +
        `👤 ${fd.role === 'buyer' ? 'Seller' : 'Buyer'}: ${fd.counterparty_safetag}\n` +
        `💠 Your Role: ${fd.role === 'buyer' ? 'Buyer 🛒' : 'Seller 🤝'}`;

    await sendButtons(from, summary, [
        { id: 'CREATE_TXN_CONFIRM', title: '✅ Create' },
        { id: 'CANCEL_TXN',        title: '❌ Cancel'  }
    ]);
    session.step = 'AWAITING_FINAL';
}

async function createTransaction(from: string) {
    const session = txnSessions.get(from)!;
    const fd      = session.formData;
    try {
        const p    = await getProfile(from);
        const totalAmount = fd.transaction_type === 'ONE_TIME'
            ? Number(fd.amount)
            : (fd.milestones || []).reduce((s: number, m: any) => s + Number(m.amount), 0);
        const body: any = {
            buyer_safetag:    fd.role === 'buyer'  ? p.safetag : fd.counterparty_safetag,
            seller_safetag:   fd.role === 'seller' ? p.safetag : fd.counterparty_safetag,
            product_name:     fd.product_name,
            description:      fd.description || '',
            currency:         fd.currency,
            fee_allocation:   fd.fee_allocation,
            transaction_type: fd.transaction_type,
            initiator_safetag: p.safetag,
            amount:           totalAmount,
            send_invoice:     fd.send_invoice || false,
        };
        if (fd.transaction_type === 'MILESTONE') body.milestones = fd.milestones;
        if (fd.attachment_url) body.attachment_url = fd.attachment_url;

        const res = await axios.post(`${API_URL}/transactions/create`, body);
        const txn = res.data;
        txnSessions.delete(from);

        const displayAmount = `${totalAmount} ${fd.currency}`;
        const counterpartyRole = fd.role === 'buyer' ? 'Seller' : 'Buyer';

        await sendButtons(from,
            `✅ *Transaction Created!*\n\n` +
            `Your transaction has been created and sent to the ${counterpartyRole.toLowerCase()}.\n\n` +
            `📋 *Transaction ID:* ${txn.txn_code || txn.id}\n` +
            `👤 *${counterpartyRole}:* ${fd.counterparty_safetag}\n` +
            `💰 *Amount:* ${displayAmount}\n\n` +
            `📬 *You'll be notified when:*\n` +
            `• ${counterpartyRole} accepts your request\n` +
            `• Payment is required\n` +
            `• Delivery is confirmed\n\n` +
            `⏳ *Current Status:* Awaiting ${counterpartyRole} Acceptance` +
            (fd.send_invoice ? '\n\n📧 *Invoice emailed to buyer!*' : ''),
            [
                { id: `VIEW_TXN_${txn.id}`, title: '👁️ View Transaction' },
                { id: 'MAIN_MENU',           title: '🔙 Main Menu'        }
            ]
        );
    } catch (err: any) {
        txnSessions.delete(from);
        await sendText(from, `❌ Failed to create transaction: ${err.response?.data?.error || err.message}`);
    }
}

// ─── Text input handlers ──────────────────────────────────────────────────────

async function handleTxnText(from: string, rawText: string, message: any) {
    const session = txnSessions.get(from)!;
    const text    = rawText.toLowerCase().trim();

    if (session.step === 'ASK_PRODUCT') {
        session.formData.product_name = rawText.trim();
        session.step = 'ASK_DESCRIPTION';
        await sendButtons(from, '📝 Enter a description or terms for this transaction:', [{ id: 'SKIP_DESCRIPTION', title: '⏭️ Skip' }]);

    } else if (session.step === 'ASK_DESCRIPTION') {
        session.formData.description = rawText.trim();
        session.step = 'ASK_ATTACHMENT';
        await sendButtons(from, '📎 Send a photo or file as an attachment (optional):', [{ id: 'SKIP_ATTACHMENT', title: '⏭️ Skip' }]);

    } else if (session.step === 'ASK_ATTACHMENT') {
        if (message?.image?.link) session.formData.attachment_url = message.image.link;
        session.step = 'AWAITING_CURRENCY';
        await sendCurrencyList(from);

    } else if (session.step === 'ASK_AMOUNT') {
        const amt = parseFloat(rawText.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) { await sendText(from, '❌ Please enter a valid positive amount:'); return; }
        session.formData.amount = amt;
        session.step = 'AWAITING_FEE';
        await sendButtons(from, '💵 Who pays the 5% escrow fee?', [
            { id: 'FEE_BUYER',  title: 'Buyer Pays 💳'   },
            { id: 'FEE_SELLER', title: 'Seller Pays 🤝'  },
            { id: 'FEE_SPLIT',  title: 'Split 50/50 ⚖️' }
        ]);

    } else if (session.step === 'MILESTONE_TITLE') {
        session.formData._milestoneTitle = rawText.trim();
        session.step = 'MILESTONE_AMOUNT';
        const count = (session.formData.milestones?.length || 0) + 1;
        await sendText(from, `🪜 Phase ${count}: Enter the amount for "${rawText.trim()}":`);

    } else if (session.step === 'MILESTONE_AMOUNT') {
        const amt = parseFloat(rawText.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) { await sendText(from, '❌ Please enter a valid positive amount:'); return; }
        if (!session.formData.milestones) session.formData.milestones = [];
        session.formData.milestones.push({ title: session.formData._milestoneTitle, amount: amt });
        delete session.formData._milestoneTitle;
        const total = session.formData.milestones.reduce((s: number, m: any) => s + m.amount, 0);
        await sendButtons(from,
            `✅ Milestone added!\nTotal so far: ${total} ${session.formData.currency}\n\nAdd another milestone or finish?`,
            [
                { id: 'MILESTONE_ADD_MORE', title: '➕ Add Another' },
                { id: 'MILESTONE_DONE',     title: '✅ Finish'     }
            ]
        );

    } else if (session.step === 'ASK_COUNTERPARTY') {
        const safetag = rawText.trim().startsWith('@') ? rawText.trim() : `@${rawText.trim()}`;
        try {
            const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(safetag)}`);
            session.formData.counterparty_safetag = safetag;
            session.formData.counterparty_profile = res.data;
            session.step = 'AWAITING_CONFIRM';
            await showCounterpartyPreview(from, safetag, res.data);
        } catch (e: any) {
            await sendText(from, e.response?.status === 404
                ? `❌ Safetag ${safetag} not found. Please check and try again:`
                : '❌ Could not look up that safetag. Please try again:'
            );
        }
    }
}

async function handleReviewText(from: string, rawText: string, message: any) {
    const session = reviewSessions.get(from)!;

    if (session.step === 'ASK_COMMENT') {
        session.formData.comment = rawText.trim();
        session.step = 'ASK_PROOF';
        await sendButtons(from, '📎 Send a photo as proof (optional):', [{ id: 'SKIP_PROOF', title: '⏭️ Skip' }]);

    } else if (session.step === 'ASK_PROOF') {
        const proofUrl = message?.image?.link;
        await submitReview(from, proofUrl);
    }
}

async function submitReview(from: string, proofUrl?: string) {
    const session = reviewSessions.get(from)!;
    const fd = session.formData;
    try {
        await axios.post(`${API_URL}/reviews`, {
            transaction_id:   fd.txnId,
            reviewer_safetag: fd.reviewerSafetag,
            reviewee_safetag: fd.revieweeSafetag,
            rating:           fd.rating,
            comment:          fd.comment || '',
            proof_url:        proofUrl
        });
        reviewSessions.delete(from);
        await sendButtons(from,
            '⭐ Thanks for your review! Your feedback helps build trust in the Safeeely community.',
            [{ id: 'MAIN_MENU', title: '🏠 Main Menu' }]
        );
    } catch (err: any) {
        reviewSessions.delete(from);
        await sendText(from, `❌ Failed to submit review: ${err.response?.data?.error || err.message}`);
    }
}

// ─── Main incoming handler ────────────────────────────────────────────────────

async function handleIncoming(from: string, msgType: string, rawText: string, textBody: string, interactiveId: string, message: any) {

    // ── Referral code capture (wa.me pre-filled text like "ref_johndoe") ────────
    if (msgType === 'text' && textBody.startsWith('ref_')) {
        const code = rawText.trim().substring(4);
        if (code) {
            refSessions.set(from, code);
            await sendButtons(from,
                '👋 *Welcome to Safeeely!*\n\nReferral code noted! Register now and your friend will earn a lifetime commission on your trades.',
                [{ id: 'AGREE_POLICY', title: '✅ Register Now' }]
            );
        }
        return;
    }

    // ── Login flow (always intercepts text) ───────────────────────────────────
    if (msgType === 'text' && loginSessions.has(from)) {
        const loginState = loginSessions.get(from)!;
        if (loginState.step === 'ASK_SAFETAG') {
            const safetag = rawText.trim().startsWith('@') ? rawText.trim() : `@${rawText.trim()}`;
            loginState.safetag = safetag;
            try {
                await axios.post(`${API_URL}/auth/otp/send`, { safetag, platform: 'whatsapp', platform_id: from });
                loginState.step = 'VERIFY_OTP';
                await sendButtons(from,
                    `🔐 *OTP Verification*\n\nWe've sent a 6-digit code to your email and linked accounts.\n\nPlease type the code below:`,
                    [{ id: 'RESEND_LOGIN_OTP', title: '🔄 Resend Code' }]
                );
            } catch (err: any) {
                loginSessions.delete(from);
                await sendText(from, `❌ ${err.response?.data?.error || 'Safetag not found. Please check and try again.'}`);
            }
        } else if (loginState.step === 'VERIFY_OTP') {
            try {
                const result = await axios.post(`${API_URL}/auth/otp/verify`, {
                    safetag: loginState.safetag, platform: 'whatsapp', platform_id: from, otp: rawText.trim()
                });
                loginSessions.delete(from);
                const profile = result.data.profile;
                await sendMainMenu(from, `👋 Welcome back, ${profile.first_name || 'there'}!`);
            } catch (err: any) {
                await sendText(from, `❌ ${err.response?.data?.error || 'Invalid code. Please try again.'}`);
            }
        }
        return;
    }

    // ── Transaction creation text steps ───────────────────────────────────────
    if (msgType === 'text' && txnSessions.has(from) && ['ASK_PRODUCT','ASK_DESCRIPTION','ASK_ATTACHMENT','ASK_AMOUNT','MILESTONE_TITLE','MILESTONE_AMOUNT','ASK_COUNTERPARTY'].includes(txnSessions.get(from)!.step)) {
        await handleTxnText(from, rawText, message);
        return;
    }

    // ── Attachment during transaction attachment step ──────────────────────────
    if (['image', 'document', 'video'].includes(msgType) && txnSessions.has(from) && txnSessions.get(from)!.step === 'ASK_ATTACHMENT') {
        const session = txnSessions.get(from)!;
        session.formData.attachment_url = message[msgType]?.link || message[msgType]?.id;
        session.step = 'AWAITING_CURRENCY';
        await sendCurrencyList(from);
        return;
    }

    // ── Review text steps ─────────────────────────────────────────────────────
    if (msgType === 'text' && reviewSessions.has(from) && ['ASK_COMMENT', 'ASK_PROOF'].includes(reviewSessions.get(from)!.step)) {
        await handleReviewText(from, rawText, message);
        return;
    }
    if (msgType === 'image' && reviewSessions.has(from) && reviewSessions.get(from)!.step === 'ASK_PROOF') {
        await handleReviewText(from, '', message);
        return;
    }

    // ── Delivery proof upload (seller sends image/doc/video while no other session active) ──
    if (['image', 'document', 'video'].includes(msgType) && !txnSessions.has(from) && !reviewSessions.has(from)) {
        const proofUrl = message[msgType]?.link;
        if (proofUrl) {
            try {
                const profile = await getProfile(from);
                const mySafetag = profile?.safetag;
                if (mySafetag) {
                    const txnsRes = await axios.get(`${API_URL}/transactions`, {
                        params: { safetag: mySafetag, status: 'AWAITING_PROOF' }
                    });
                    const awaitingTxns = (txnsRes.data || []).filter((t: any) => t.seller?.safetag === mySafetag || t.seller_id === profile.id);
                    if (awaitingTxns.length > 0) {
                        const txn = awaitingTxns[0];
                        await axios.post(`${API_URL}/transactions/${txn.id}/upload-proof`, {
                            proof_url: proofUrl,
                            file_name: `WhatsApp ${msgType}`,
                        });
                        await sendText(from, `✅ *Proof uploaded* for *${txn.txn_code}*!\n\nThe buyer has been notified and can now review your delivery.`);
                        return;
                    }
                }
            } catch (err: any) {
                console.error('WhatsApp proof upload error:', err.message);
            }
        }
    }

    // ── Dispute text step ─────────────────────────────────────────────────────
    if (msgType === 'text' && disputeSessions.has(from)) {
        const ds = disputeSessions.get(from)!;
        try {
            await axios.post(`${API_URL}/disputes/raise`, { transaction_id: ds.txnId, reason: rawText.trim(), raised_by: ds.raisedBy });
            disputeSessions.delete(from);
            await sendButtons(from,
                '⚠️ Dispute raised. Transaction frozen. Our team will review within 24h.',
                [{ id: 'MAIN_MENU', title: '🏠 Main Menu' }]
            );
        } catch (err: any) {
            disputeSessions.delete(from);
            await sendText(from, `❌ Failed to raise dispute: ${err.response?.data?.error || err.message}`);
        }
        return;
    }

    // ── Smart transaction (audio or free text) ────────────────────────────────
    const isBasicCommand = ['hello', 'hi', 'start'].includes(textBody) || !!interactiveId;
    if ((msgType === 'audio' || (msgType === 'text' && !isBasicCommand && !txnSessions.has(from))) && rawText) {
        await sendText(from, '🎙️ Processing your request...');
        try {
            let audioBuffer: Buffer | undefined;
            let mimeType: string | undefined;
            if (msgType === 'audio') {
                const mediaId  = message.audio.id;
                const mediaRes = await axios.get(`https://graph.facebook.com/${VERSION}/${mediaId}`, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
                const bufferRes = await axios.get(mediaRes.data.url, { responseType: 'arraybuffer', headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
                audioBuffer = Buffer.from(bufferRes.data);
                mimeType    = message.audio.mime_type || 'audio/ogg';
            }
            const existingDraft = smartTxnSessions.get(from);
            const aiResult = await processSmartTransaction(msgType === 'text' ? rawText : '', audioBuffer, mimeType, existingDraft);
            smartTxnSessions.set(from, aiResult.draft);

            if (aiResult.is_complete) {
                const draft = aiResult.draft;
                let milestoneText = '';
                if (draft.transaction_type === 'MILESTONE' && draft.milestones?.length) {
                    milestoneText = '\n\n🪜 *Milestones:*\n' + draft.milestones.map((m, i) => `   ${i+1}. ${m.title} (${m.amount} ${draft.currency})`).join('\n');
                }
                const draftText =
                    `✨ *Smart Transaction Draft*\n\nPlease review your transaction details:\n\n` +
                    `📦 Type: ${draft.transaction_type || 'ONE_TIME'}\n` +
                    `🛒 Product: ${draft.product_name}\n` +
                    `📝 Description: ${draft.description || 'No description'}${milestoneText}\n` +
                    `👤 Counterparty: @${draft.counterparty_safetag}\n` +
                    `💰 Amount: ${draft.amount} ${draft.currency}\n` +
                    `💵 Fee Allocation: ${draft.fee_allocation}\n` +
                    `💠 Your Role: ${draft.role}\n\n` +
                    `Does this look correct? Reply to edit or tap confirm.`;
                await sendButtons(from, draftText, [
                    { id: 'SMART_TXN_CONFIRM', title: '✅ Confirm'  },
                    { id: 'SMART_TXN_CANCEL',  title: '❌ Cancel'   }
                ]);
            } else {
                await sendText(from, aiResult.follow_up_question || 'Please provide the missing details.');
            }
        } catch (e: any) {
            console.error('Smart Txn Error:', e.message);
            await sendText(from, '❌ Sorry, I had trouble processing that. Please try again or use the menu.');
        }
        return;
    }

    // ── Greeting ──────────────────────────────────────────────────────────────
    if (textBody === 'hello' || textBody === 'hi' || textBody === 'start') {
        let isRegistered = false;
        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/whatsapp/${from}`);
            if (profileRes.data?.safetag && !profileRes.data?.is_deactivated) {
                isRegistered = true;
                await sendMainMenu(from, `👋 Welcome back, ${profileRes.data.first_name || 'there'}!`);
            } else if (profileRes.data?.is_deactivated) {
                isRegistered = true;
                await sendText(from, '⚠️ Your Safeeely account has been deactivated. Please contact support@safeeely.com if you believe this is a mistake.');
            }
        } catch (e: any) {
            if (e.response?.status !== 404) console.error('WA profile check error:', e.message);
        }
        if (!isRegistered) {
            await sendButtons(from,
                '👋 *Welcome to Safeeely!*\n\nYour trusted escrow service for secure social media transactions.\n\n🔒 Secure | 🌍 Cross-Platform | ⚡ Fast\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data: https://safeeely.com/privacy',
                [{ id: 'AGREE_POLICY', title: '✅ Agree & Continue' }]
            );
        }
        return;
    }

    // ── Interactive handlers (button_reply + list_reply) ──────────────────────
    if (!interactiveId) return;

    // Auth
    if (interactiveId === 'AGREE_POLICY') {
        await sendButtons(from,
            "🚀 *Let's get started!*\n\nDo you already have a Safeeely account from another platform?",
            [{ id: 'CHOICE_REGISTER', title: '🆕 Register' }, { id: 'CHOICE_LOGIN', title: '🔗 Log In' }]
        );

    } else if (interactiveId === 'CHOICE_REGISTER') {
        await sendMsg(from, {
            type: 'interactive',
            interactive: {
                type: 'flow',
                header: { type: 'text', text: 'Safeeely Registration' },
                body:   { text: 'Please click below to securely register your account.' },
                footer: { text: 'End-to-end encrypted' },
                action: {
                    name: 'flow',
                    parameters: {
                        flow_message_version: '3',
                        flow_token:           `reg_session_${from}`,
                        flow_id:              process.env.REGISTRATION_FLOW_ID || 'PLACEHOLDER_ID',
                        flow_cta:             'Open Form',
                        flow_action:          'navigate',
                        flow_action_payload:  { screen: 'REGISTRATION_SCREEN' }
                    }
                }
            }
        });

    } else if (interactiveId === 'CHOICE_LOGIN') {
        loginSessions.set(from, { step: 'ASK_SAFETAG' });
        await sendText(from, '🔗 *Safeeely Login*\n\nPlease type your Safetag (e.g. @john_doe):');

    } else if (interactiveId === 'RESEND_LOGIN_OTP') {
        const loginState = loginSessions.get(from);
        if (!loginState?.safetag) { await sendText(from, "❌ Session expired. Type 'Hi' to start over."); return; }
        try {
            await axios.post(`${API_URL}/auth/otp/send`, { safetag: loginState.safetag, platform: 'whatsapp', platform_id: from });
            await sendText(from, '✅ New code sent to your email and linked accounts.');
        } catch (err: any) {
            await sendText(from, `❌ ${err.response?.data?.error || 'Failed to resend.'}`);
        }

    // Navigation
    } else if (interactiveId === 'MAIN_MENU') {
        txnSessions.delete(from);
        reviewSessions.delete(from);
        disputeSessions.delete(from);
        await sendMainMenu(from, '🏠 Main Menu');

    // Balance, referral, settings
    } else if (interactiveId === 'BALANCE') {
        await showBalance(from);

    } else if (interactiveId === 'REFERRAL') {
        await showReferral(from);

    } else if (interactiveId === 'SETTINGS') {
        await showSettings(from);

    } else if (interactiveId === 'OTHER_SETTINGS') {
        await showOtherSettings(from);

    } else if (interactiveId === 'LINKED_ACCOUNTS') {
        try {
            const p = await getProfile(from);
            const linked = p.linked_platforms || [];
            const list   = linked.length ? linked.map((l: any) => `• ${l.platform}: ${l.platform_id}`).join('\n') : 'No linked accounts yet.';
            await sendButtons(from,
                `🔗 *Linked Accounts*\n\n${list}\n\nLink more accounts by logging in from other platforms.`,
                [{ id: 'OTHER_SETTINGS', title: '🔙 Back' }]
            );
        } catch (_) { await sendText(from, '❌ Could not load linked accounts.'); }

    } else if (interactiveId === 'START_DELETION') {
        await sendButtons(from,
            '⚠️ *Delete Account*\n\nThis will:\n• Remove your Safeeely profile\n• Unlink all platforms\n• Keep transaction records for legal purposes\n\nThis cannot be undone.',
            [{ id: 'CONFIRM_DELETE', title: '⚠️ Confirm Delete' }, { id: 'SETTINGS', title: '❌ Cancel' }]
        );

    } else if (interactiveId === 'CONFIRM_DELETE') {
        try {
            const p = await getProfile(from);
            await axios.delete(`${API_URL}/profiles/${p.safetag}`);
            await sendText(from, "✅ Your account has been deleted. We're sorry to see you go.");
        } catch (err: any) {
            await sendText(from, `❌ Failed to delete account: ${err.response?.data?.error || err.message}`);
        }

    } else if (interactiveId === 'REVIEWS') {
        try {
            const p = await getProfile(from);
            const reviewsUrl = `${REVIEWS_URL}/${p.safetag.startsWith('@') ? p.safetag : '@' + p.safetag}`;
            await sendCTAUrl(from, '⭐ View your trust score, reviews, and leave feedback for completed transactions:', '⭐ View My Reviews', reviewsUrl);
        } catch (_) { await sendText(from, '❌ Could not load reviews.'); }

    // My transactions
    } else if (interactiveId === 'MY_TXNS') {
        await sendTxnFilter(from);

    } else if (['FILTER_ONGOING', 'FILTER_COMPLETED', 'FILTER_DISPUTED', 'FILTER_ALL'].includes(interactiveId)) {
        await showTransactions(from, interactiveId);

    } else if (interactiveId.startsWith('VIEW_TXN_')) {
        await showTransactionDetail(from, interactiveId.replace('VIEW_TXN_', ''));

    // Transaction actions
    } else if (interactiveId.startsWith('ACCEPT_TXN_') || interactiveId.startsWith('txn_action_accept|')) {
        const txnId = interactiveId.startsWith('ACCEPT_TXN_') ? interactiveId.replace('ACCEPT_TXN_', '') : interactiveId.replace('txn_action_accept|', '');
        try {
            const p = await getProfile(from);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'accept', updater_safetag: p.safetag });
            await sendButtons(from, '✅ Transaction accepted! The buyer will be notified to make payment.', [{ id: 'MY_TXNS', title: '📋 My Txns' }, { id: 'MAIN_MENU', title: '🏠 Main Menu' }]);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed to accept.'}`); }

    } else if (interactiveId.startsWith('DECLINE_TXN_') || interactiveId.startsWith('txn_action_decline|')) {
        const txnId = interactiveId.startsWith('DECLINE_TXN_') ? interactiveId.replace('DECLINE_TXN_', '') : interactiveId.replace('txn_action_decline|', '');
        try {
            const p = await getProfile(from);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'decline', updater_safetag: p.safetag });
            await sendButtons(from, '❌ Transaction declined.', [{ id: 'MAIN_MENU', title: '🏠 Main Menu' }]);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('COMPLETE_TXN_')) {
        const txnId = interactiveId.replace('COMPLETE_TXN_', '');
        try {
            const p = await getProfile(from);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_prompt', updater_safetag: p.safetag });
            const opts: any[] = res.data.follow_up_options || [];
            const replyOpts = opts.filter((o: any) => !o.url);
            const urlOpts = opts.filter((o: any) => o.url);
            if (replyOpts.length > 0) await sendButtons(from, res.data.follow_up_msg?.replace(/<[^>]*>/g, '') || 'Mark delivery as completed?', replyOpts.slice(0, 3).map((o: any) => ({ id: o.customId, title: o.label.substring(0, 20) })));
            for (const u of urlOpts) await sendCTAUrl(from, u.label, u.label.substring(0, 20), u.url);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('RECEIVED_TXN_')) {
        const txnId = interactiveId.replace('RECEIVED_TXN_', '');
        try {
            const p = await getProfile(from);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'confirm_receipt', updater_safetag: p.safetag });
            await sendButtons(from, '✅ Transaction completed! Funds will be released to the seller.', [{ id: 'MAIN_MENU', title: '🏠 Main Menu' }]);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('txn_action_complete_prompt|')) {
        const txnId = interactiveId.replace('txn_action_complete_prompt|', '');
        try {
            const p = await getProfile(from);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_prompt', updater_safetag: p.safetag });
            const opts: any[] = res.data.follow_up_options || [];
            const replyOpts = opts.filter((o: any) => !o.url);
            const urlOpts = opts.filter((o: any) => o.url);
            if (replyOpts.length > 0) await sendButtons(from, res.data.follow_up_msg?.replace(/<[^>]*>/g, '') || 'Mark delivery as completed?', replyOpts.slice(0, 3).map((o: any) => ({ id: o.customId, title: o.label.substring(0, 20) })));
            for (const u of urlOpts) await sendCTAUrl(from, u.label, u.label.substring(0, 20), u.url);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('txn_action_complete_yes|')) {
        const txnId = interactiveId.replace('txn_action_complete_yes|', '');
        try {
            const p = await getProfile(from);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_yes', updater_safetag: p.safetag });
            const opts: any[] = res.data.follow_up_options || [];
            const replyOpts = opts.filter((o: any) => !o.url);
            const urlOpts = opts.filter((o: any) => o.url);
            const msg = res.data.follow_up_msg?.replace(/<[^>]*>/g, '') || '📎 Please upload proof of delivery.';
            if (replyOpts.length > 0) await sendButtons(from, msg, replyOpts.slice(0, 3).map((o: any) => ({ id: o.customId, title: o.label.substring(0, 20) })));
            else await sendText(from, msg);
            for (const u of urlOpts) await sendCTAUrl(from, u.label, u.label.substring(0, 20), u.url);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('txn_action_complete_skip|')) {
        const txnId = interactiveId.replace('txn_action_complete_skip|', '');
        try {
            const p = await getProfile(from);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_skip', updater_safetag: p.safetag });
            await sendButtons(from, res.data.follow_up_msg?.replace(/<[^>]*>/g, '') || '📦 Marked as complete! The buyer will be notified to confirm receipt.', [{ id: 'MY_TXNS', title: '📋 My Txns' }, { id: 'MAIN_MENU', title: '🏠 Main Menu' }]);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('txn_action_confirm_receipt|')) {
        const txnId = interactiveId.replace('txn_action_confirm_receipt|', '');
        try {
            const p = await getProfile(from);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'confirm_receipt', updater_safetag: p.safetag });
            const msg = (res.data.follow_up_msg || '✅ Transaction completed! Funds will be released to the seller.').replace(/<[^>]*>/g, '');
            await sendButtons(from, msg, [{ id: 'MAIN_MENU', title: '🏠 Main Menu' }]);
        } catch (err: any) { await sendText(from, `❌ ${err.response?.data?.error || 'Failed.'}`); }

    } else if (interactiveId.startsWith('txn_pay_')) {
        const txnId = interactiveId.replace('txn_pay_', '');
        const payUrl = `${REVIEWS_URL}/pay/${txnId}`;
        await sendCTAUrl(from, 'Tap below to complete your secure payment:', '💳 Pay Now', payUrl);

    } else if (interactiveId.startsWith('view_txn_details|')) {
        await showTransactionDetail(from, interactiveId.replace('view_txn_details|', ''));

    } else if (interactiveId.startsWith('view_docs_')) {
        const txnId = interactiveId.replace('view_docs_', '');
        await sendCTAUrl(from, 'Tap below to review the delivery documents:', '📎 View Documents', `${REVIEWS_URL}/delivery/${txnId}`);

    } else if (interactiveId.startsWith('leave_review_')) {
        const txnId = interactiveId.replace('leave_review_', '');
        try {
            const p = await getProfile(from);
            const txnRes = await axios.get(`${API_URL}/transactions/${txnId}`);
            const t = txnRes.data;
            const revieweeSafetag = t.buyer.safetag === p.safetag ? t.seller.safetag : t.buyer.safetag;
            reviewSessions.set(from, { step: 'ASK_RATING', formData: { txnId, reviewerSafetag: p.safetag, revieweeSafetag, rating: 0 } });
            await sendList(from, '⭐ Leave a Review', 'How would you rate this transaction?', [{
                title: 'Rating',
                rows: [
                    { id: 'RATING_5', title: '⭐⭐⭐⭐⭐ 5 Stars' },
                    { id: 'RATING_4', title: '⭐⭐⭐⭐ 4 Stars' },
                    { id: 'RATING_3', title: '⭐⭐⭐ 3 Stars' },
                    { id: 'RATING_2', title: '⭐⭐ 2 Stars' },
                    { id: 'RATING_1', title: '⭐ 1 Star' }
                ]
            }]);
        } catch (_) { await sendText(from, '❌ Could not start review.'); }

    } else if (interactiveId.startsWith('txn_dispute_') || interactiveId.startsWith('DISPUTE_TXN_')) {
        const txnId = interactiveId.startsWith('txn_dispute_') ? interactiveId.replace('txn_dispute_', '') : interactiveId.replace('DISPUTE_TXN_', '');
        try {
            const p = await getProfile(from);
            disputeSessions.set(from, { txnId, raisedBy: p.safetag });
            await sendText(from, '⚠️ *Raise Dispute*\n\nPlease describe the issue with this transaction:');
        } catch (_) { await sendText(from, '❌ Could not start dispute.'); }

    } else if (interactiveId.startsWith('REVIEW_TXN_')) {
        const parts          = interactiveId.replace('REVIEW_TXN_', '').split('_');
        const txnId          = parts[0];
        const revieweeSafetag = parts.slice(1).join('_');
        try {
            const p = await getProfile(from);
            reviewSessions.set(from, { step: 'ASK_RATING', formData: { txnId, reviewerSafetag: p.safetag, revieweeSafetag, rating: 0 } });
            await sendList(from, '⭐ Leave a Review', 'How would you rate this transaction?', [{
                title: 'Rating',
                rows: [
                    { id: 'RATING_1', title: '⭐ 1 Star',     description: 'Poor' },
                    { id: 'RATING_2', title: '⭐⭐ 2 Stars',  description: 'Below average' },
                    { id: 'RATING_3', title: '⭐⭐⭐ 3 Stars', description: 'Average' },
                    { id: 'RATING_4', title: '⭐⭐⭐⭐ 4',   description: 'Good' },
                    { id: 'RATING_5', title: '⭐⭐⭐⭐⭐ 5', description: 'Excellent' }
                ]
            }], undefined, 'Rate');
        } catch (_) { await sendText(from, '❌ Could not start review.'); }

    } else if (interactiveId.startsWith('RATING_')) {
        const session = reviewSessions.get(from);
        if (session?.step === 'ASK_RATING') {
            session.formData.rating = parseInt(interactiveId.replace('RATING_', ''), 10);
            session.step = 'ASK_COMMENT';
            await sendButtons(from, '💬 Add a comment about your experience (or tap skip):', [{ id: 'SKIP_COMMENT', title: '⏭️ Skip' }]);
        }

    } else if (interactiveId === 'SKIP_COMMENT') {
        const session = reviewSessions.get(from);
        if (session) { session.formData.comment = ''; session.step = 'ASK_PROOF'; }
        await sendButtons(from, '📎 Send a photo as proof (optional):', [{ id: 'SKIP_PROOF', title: '⏭️ Skip' }]);

    } else if (interactiveId === 'SKIP_PROOF') {
        await submitReview(from);

    // Create transaction flow
    } else if (interactiveId === 'CREATE_TXN') {
        txnSessions.set(from, { step: 'AWAITING_ROLE', formData: {} });
        await sendButtons(from, '🛒 *Create Transaction*\n\nWhat is your role?', [
            { id: 'ROLE_BUYER',  title: '🛒 Buyer'  },
            { id: 'ROLE_SELLER', title: '🤝 Seller' }
        ]);

    } else if (interactiveId === 'ROLE_BUYER' || interactiveId === 'ROLE_SELLER') {
        const session = txnSessions.get(from);
        if (!session) return;
        session.formData.role = interactiveId === 'ROLE_BUYER' ? 'buyer' : 'seller';
        session.step = 'AWAITING_TYPE';
        await sendButtons(from, '📦 Transaction type:', [
            { id: 'TYPE_ONE_TIME',  title: '💸 One-Time'  },
            { id: 'TYPE_MILESTONE', title: '🪜 Milestone' }
        ]);

    } else if (interactiveId === 'TYPE_ONE_TIME' || interactiveId === 'TYPE_MILESTONE') {
        const session = txnSessions.get(from);
        if (!session) return;
        session.formData.transaction_type = interactiveId === 'TYPE_ONE_TIME' ? 'ONE_TIME' : 'MILESTONE';
        session.step = 'ASK_PRODUCT';
        await sendText(from, '📦 Enter the product or service name:');

    } else if (interactiveId === 'SKIP_DESCRIPTION') {
        const session = txnSessions.get(from);
        if (session) { session.formData.description = ''; session.step = 'ASK_ATTACHMENT'; }
        await sendButtons(from, '📎 Send a photo or file as an attachment (optional):', [{ id: 'SKIP_ATTACHMENT', title: '⏭️ Skip' }]);

    } else if (interactiveId === 'SKIP_ATTACHMENT') {
        const session = txnSessions.get(from);
        if (session) { session.step = 'AWAITING_CURRENCY'; }
        await sendCurrencyList(from);

    } else if (['CURRENCY_NGN', 'CURRENCY_USD', 'CURRENCY_USDT'].includes(interactiveId)) {
        const session = txnSessions.get(from);
        if (!session) return;
        session.formData.currency = interactiveId.replace('CURRENCY_', '');
        if (session.formData.transaction_type === 'ONE_TIME') {
            session.step = 'ASK_AMOUNT';
            await sendText(from, `💰 Enter the amount (in ${session.formData.currency}):`);
        } else {
            session.step = 'MILESTONE_TITLE';
            await sendText(from, '🪜 *Milestone Setup*\n\nEnter the title for Phase 1 (e.g. "Initial Deposit"):');
        }

    } else if (interactiveId === 'MILESTONE_ADD_MORE') {
        const session = txnSessions.get(from);
        if (session) { const count = (session.formData.milestones?.length || 0) + 1; session.step = 'MILESTONE_TITLE'; await sendText(from, `🪜 Enter the title for Phase ${count}:`); }

    } else if (interactiveId === 'MILESTONE_DONE') {
        const session = txnSessions.get(from);
        if (session) { session.step = 'AWAITING_FEE'; }
        await sendButtons(from, '💵 Who pays the 5% escrow fee?', [
            { id: 'FEE_BUYER',  title: 'Buyer Pays 💳'   },
            { id: 'FEE_SELLER', title: 'Seller Pays 🤝'  },
            { id: 'FEE_SPLIT',  title: 'Split 50/50 ⚖️' }
        ]);

    } else if (['FEE_BUYER', 'FEE_SELLER', 'FEE_SPLIT'].includes(interactiveId)) {
        const session = txnSessions.get(from);
        if (!session) return;
        session.formData.fee_allocation = interactiveId === 'FEE_BUYER' ? 'buyer' : interactiveId === 'FEE_SELLER' ? 'seller' : 'split';
        session.step = 'ASK_COUNTERPARTY';
        const other = session.formData.role === 'buyer' ? 'seller' : 'buyer';
        await sendText(from, `👤 Enter the safetag of the ${other} (e.g. @their_tag):`);

    } else if (interactiveId === 'CONFIRM_COUNTERPARTY') {
        const session = txnSessions.get(from);
        if (session) await showTransactionSummary(from);

    } else if (interactiveId === 'CANCEL_TXN') {
        txnSessions.delete(from);
        await sendButtons(from, '❌ Transaction cancelled.', [{ id: 'CREATE_TXN', title: '🛒 Try Again' }, { id: 'MAIN_MENU', title: '🏠 Main Menu' }]);

    } else if (interactiveId === 'CREATE_TXN_CONFIRM') {
        const session = txnSessions.get(from);
        if (!session) return;
        const fd = session.formData;
        const isSeller = fd.role === 'seller';
        const displayAmt = fd.transaction_type === 'ONE_TIME'
            ? `${fd.amount} ${fd.currency}`
            : `${(fd.milestones || []).reduce((s: number, m: any) => s + Number(m.amount), 0)} ${fd.currency}`;
        const invoiceMsg = isSeller
            ? `📄 *Smart Invoice*\n\nWant to send your buyer a professional invoice?\n\nA branded invoice PDF will be emailed to your buyer with the full transaction details:\n  📦 *Item:* ${fd.product_name}\n  💰 *Amount:* ${displayAmt}\n  👤 *Buyer:* ${fd.counterparty_safetag}\n\n_It includes a Pay with Safeeely button so they can settle directly from their inbox._`
            : `📄 *Smart Invoice*\n\nWould you like an invoice for this transaction?\n\nA professional invoice from your seller will be emailed straight to you with full details:\n  📦 *Item:* ${fd.product_name}\n  💰 *Amount:* ${displayAmt}\n  🏪 *Seller:* ${fd.counterparty_safetag}\n\n_Perfect for your records or expense tracking._`;
        await sendButtons(from, invoiceMsg, [
            { id: 'INVOICE_YES', title: isSeller ? '📧 Send Invoice' : '📧 Get Invoice' },
            { id: 'INVOICE_NO',  title: '❌ No, Skip' }
        ]);
        session.step = 'INVOICE_PROMPT';

    } else if (interactiveId === 'INVOICE_YES' || interactiveId === 'INVOICE_NO') {
        const session = txnSessions.get(from);
        if (!session) return;
        session.formData.send_invoice = interactiveId === 'INVOICE_YES';
        await createTransaction(from);

    // Smart transaction
    } else if (interactiveId === 'SMART_TXN_CONFIRM') {
        const draft = smartTxnSessions.get(from);
        if (!draft) { await sendText(from, '❌ Session expired. Please start over.'); return; }
        const safetag = (draft.counterparty_safetag || '').startsWith('@') ? draft.counterparty_safetag! : `@${draft.counterparty_safetag}`;
        try {
            const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(safetag)}`);
            txnSessions.set(from, {
                step: 'AWAITING_CONFIRM',
                formData: {
                    role: draft.role, transaction_type: draft.transaction_type || 'ONE_TIME',
                    product_name: draft.product_name, description: draft.description || '',
                    currency: draft.currency, amount: draft.amount,
                    milestones: draft.milestones, fee_allocation: draft.fee_allocation,
                    counterparty_safetag: safetag, counterparty_profile: res.data
                }
            });
            smartTxnSessions.delete(from);
            await showCounterpartyPreview(from, safetag, res.data);
        } catch (err: any) {
            smartTxnSessions.delete(from);
            await sendText(from, `❌ Could not find counterparty ${safetag}. Please create the transaction manually.`);
            await sendMainMenu(from, '🏠 Main Menu');
        }

    } else if (interactiveId === 'SMART_TXN_CANCEL') {
        smartTxnSessions.delete(from);
        await sendButtons(from, '❌ Transaction cancelled.', [{ id: 'MAIN_MENU', title: '🏠 Main Menu' }]);
    }
}

// ─── WhatsApp Flows endpoint ──────────────────────────────────────────────────

app.post('/flow', async (req, res) => {
    if (!flowCrypto) return res.status(500).json({ error: 'Flow security not initialized' });
    try {
        const { encrypted_payload, initial_vector, encrypted_aes_key } = req.body;
        const { data, aesKey, initialVector } = flowCrypto.decryptRequest(encrypted_payload, initial_vector, encrypted_aes_key);
        console.log('🧊 Flow Action:', data.action);
        let responsePayload: any = {};

        switch (data.action) {
            case 'ping':
                responsePayload = { data: { status: 'healthy' } };
                break;

            case 'send_otp':
                try { await axios.post(`${API_URL}/auth/email-otp/send`, { email: data.email }); }
                catch (e: any) { console.error('OTP send error:', e.response?.data?.error || e.message); }
                responsePayload = { screen: 'OTP_SCREEN', data: { display_email: data.email } };
                break;

            case 'complete_registration': {
                const email   = data.email;
                const otpCode = data.otp_code;
                try {
                    await axios.post(`${API_URL}/auth/email-otp/verify`, { email, code: otpCode });
                } catch (err: any) {
                    responsePayload = { screen: 'OTP_SCREEN', data: { display_email: `❌ ${err.response?.data?.error || 'Invalid code. Please try again.'}` } };
                    break;
                }
                const safetag     = data.safetag.startsWith('@') ? data.safetag : `@${data.safetag}`;
                const phone_number = data.flow_token.split('_')[2];
                try {
                    const refCode = refSessions.get(phone_number);
                    await axios.post(`${API_URL}/profiles/register`, {
                        first_name: data.first_name, last_name: data.last_name,
                        email, safetag, primary_platform: 'whatsapp', platform_id: phone_number,
                        ...(refCode ? { referral_code: refCode } : {})
                    });
                    refSessions.delete(phone_number);
                } catch (err: any) {
                    const errMsg = err.response?.data?.error || 'Registration failed';
                    responsePayload = errMsg.toLowerCase().includes('safetag')
                        ? { screen: 'REGISTRATION_SCREEN', data: { safetag: { error: `❌ ${errMsg}` } } }
                        : { screen: 'OTP_SCREEN', data: { display_email: `❌ ${errMsg}` } };
                    break;
                }
                responsePayload = { data: { extension_message_response: { params: { flow_token: data.flow_token, result: 'success' } } } };
                if (phone_number) {
                    setTimeout(async () => {
                        await sendText(phone_number, `🎉 Registration Complete!\n\n✅ You're all set!\n\nYour Safetag: ${safetag}\n📧 Email: ${email}\n\n🔐 Your account is secure and ready to use`);
                        setTimeout(() => sendMainMenu(phone_number), 800);
                    }, 1500);
                }
                break;
            }

            case 'lookup_user': {
                const otherTag = data.other_safetag.startsWith('@') ? data.other_safetag : `@${data.other_safetag}`;
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(otherTag)}`);
                    const p = profileRes.data;
                    let ratingStr = 'No reviews yet';
                    try {
                        const statsRes = await axios.get(`${API_URL}/reviews/stats/${p.safetag}`);
                        if (statsRes.data.review_count > 0) ratingStr = `${statsRes.data.average_rating.toFixed(1)}/5 Stars (${statsRes.data.review_count} reviews)`;
                    } catch (_) {}
                    responsePayload = { screen: 'TRANSACTION_SCREEN_2_LOOKUP', data: { profile_card: p.safetag, rating: ratingStr, safetag: p.safetag.replace('@', '') } };
                } catch (_) {
                    responsePayload = { screen: 'TRANSACTION_SCREEN_1_INPUTS', data: { other_safetag: { error: '❌ Safetag not found.' } } };
                }
                break;
            }

            case 'view_summary': {
                const amount     = parseFloat(data.amount);
                const fee        = amount * 0.05;
                const allocation = data.who_pays_fee;
                const total      = allocation === 'buyer' ? amount + fee : allocation === 'split' ? amount + fee / 2 : amount;
                responsePayload  = {
                    screen: 'TRANSACTION_SCREEN_3_SUMMARY',
                    data: {
                        summary_text: `📋 *Order Summary*\n\n🛒 Product: ${data.product_name}\n📝 Description: ${data.description}\n💰 Price: ${amount} ${data.currency}\n💵 Escrow Fee: ${fee.toFixed(2)} ${data.currency} (${allocation})\n👤 Counterparty: ${data.other_safetag}`,
                        total_amount: `${total.toFixed(2)} ${data.currency}`
                    }
                };
                break;
            }

            default:
                responsePayload = { data: { status: 'unknown' } };
        }

        res.status(200).send(flowCrypto.encryptResponse(responsePayload, aesKey, initialVector));
    } catch (err: any) {
        console.error('🔥 Flow Error:', err.message);
        res.status(500).send('Error');
    }
});

// ─── Webhook routes ───────────────────────────────────────────────────────────

app.get('/webhook', (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === HUB_VERIFY_TOKEN) res.status(200).send(challenge);
    else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes) {
            const changes = body.entry[0].changes[0].value;
            if (changes.messages?.length) {
                const message = changes.messages[0];
                const from    = message.from;
                const msgType = message.type;
                axios.patch(`${API_URL}/profiles/platform-activity`, { platform: 'whatsapp', platform_id: from }).catch(() => {});

                let rawText      = '';
                let textBody     = '';
                let interactiveId = '';

                if (msgType === 'text') {
                    rawText  = message.text.body.trim();
                    textBody = rawText.toLowerCase();
                } else if (msgType === 'interactive') {
                    if (message.interactive.type === 'button_reply') {
                        interactiveId = message.interactive.button_reply.id;
                    } else if (message.interactive.type === 'list_reply') {
                        interactiveId = message.interactive.list_reply.id;
                    }
                }

                console.log(`📩 WA from ${from}: [${msgType}] text="${textBody}" id="${interactiveId}"`);
                await handleIncoming(from, msgType, rawText, textBody, interactiveId, message);
            }
        }
        res.sendStatus(200);
    } catch (error: any) {
        console.error('🔥 Webhook Error:', error.response?.data || error.message);
        res.sendStatus(200);
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 10001;
app.listen(PORT, () => console.log(`🌐 WhatsApp Webhook listener on port ${PORT}`));
