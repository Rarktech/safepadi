import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { buildMagicLink } from './utils/magicLink';
import { getCommentPrompt, pickRandom, FEEDBACK_SUCCESS_MESSAGES } from '@safepal/shared';

// Handle Environment Variables relative to the root .env
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

function formatAccountAge(createdAt: string): string {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''}`;
}

Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || process.env.APPLE_PORT || 10003;
const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const FRONTEND_URL = process.env.REVIEWS_URL || 'http://localhost:3001';
const BOT_AUTH_HEADERS = process.env.BOT_API_SECRET
    ? { 'Authorization': `Bearer ${process.env.BOT_API_SECRET}`, 'x-bot-platform': 'apple' }
    : {};

console.log(`🚀 Safeeely Apple Messages for Business Bot (via JivoChat) Starting...`);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('JivoChat Apple Business Bot is Healthy');
});

// --- SESSION MANAGEMENT ---
interface UserState {
    state: 'IDLE' | 'ROLE_SELECTION' | 'PRODUCT_NAME' | 'PRODUCT_DESCRIPTION' | 'ATTACHMENTS' | 'CURRENCY_SELECTION' | 'TRANSACTION_TYPE' | 'PRICE_INPUT' | 'MILESTONE_TITLE' | 'MILESTONE_AMOUNT' | 'MILESTONE_ADD_MORE' | 'FEE_ALLOCATION' | 'COUNTERPARTY_SAFETAG' | 'CONFIRMATION' | 'INVOICE_PROMPT' | 'DISPUTE_CATEGORY' | 'DISPUTE_REASON' | 'REVIEW_RATING' | 'REVIEW_COMMENT' | 'FEEDBACK_RATING' | 'FEEDBACK_COMMENT' | 'REPORT_SAFETAG' | 'REPORT_REASON' | 'REPORT_DESCRIPTION' | 'SELLER_MILESTONE_SELECT' | 'SELLER_MILESTONE_CONFIRM' | 'BUYER_MILESTONE_SELECT' | 'BUYER_MILESTONE_CONFIRM';
    formData: {
        role?: 'buyer' | 'seller';
        product_name?: string;
        description?: string;
        amount?: number;
        currency?: string;
        transaction_type?: 'ONE_TIME' | 'MILESTONE';
        milestones?: Array<{ title: string; amount: number }>;
        current_milestone_title?: string;
        fee_allocation?: 'buyer' | 'seller' | 'split';
        other_safetag?: string;
        other_id?: string;
        other_rating?: string;
        dispute_txn_id?: string;
        dispute_safetag?: string;
        dispute_category?: string;
        review_txn_id?: string;
        review_other?: string;
        review_rating?: number;
        feedback_source?: string;
        feedback_ref_id?: string;
        feedback_rating?: number;
        send_invoice?: boolean;
        report_safetag?: string;
        report_reason?: string;
        settlement_txn_id?: string;
        settlement_milestones?: Array<{ id: string; title: string; amount: number; status: string }>;
        settlement_milestone_id?: string;
        settlement_milestone_title?: string;
        settlement_milestone_amount?: number;
    };
}

const sessions = new Map<string, UserState>();

function getSession(clientId: string): UserState {
    if (!sessions.has(clientId)) {
        sessions.set(clientId, { state: 'IDLE', formData: {} });
    }
    return sessions.get(clientId)!;
}

function resetSession(clientId: string) {
    sessions.set(clientId, { state: 'IDLE', formData: {} });
}

const JIVO_PROVIDER_ID = process.env.JIVO_PROVIDER_ID;
const JIVO_TOKEN = process.env.JIVO_TOKEN;

// Helper: Send Message to JivoChat Bot API
async function sendJivoChatMessage(clientId: string, chatId: string, messagePayload: any) {
    if (!JIVO_PROVIDER_ID || !JIVO_TOKEN) {
        console.warn('⚠️ JivoChat credentials missing. Message logged to console only.');
        return;
    }

    try {
        const url = `https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`;
        const uuid = crypto.randomUUID();

        // Jivo confirmed: client_id and chat_id MUST be strings. site_id is not required.
        const payload: any = {
            event: "BOT_MESSAGE",
            id: uuid,
            client_id: String(clientId),
            chat_id: String(chatId),
            message: messagePayload
        };

        console.log(`📤 [BOT REPLY] Sending to Chat: ${chatId}...`);

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ Message sent to JivoChat chat ${chatId}. Status: ${response.status}`);
    } catch (err: any) {
        console.error(`❌ Failed to send JivoChat message.`);
        console.error(`- Status:`, err.response?.status);
        console.error(`- Payload:`, JSON.stringify(err.config?.data));
    }
}

// JivoChat Webhook Endpoint
app.post('/webhook/:token', (req, res) => {
    const { token } = req.params;

    // Fail-closed: reject all requests if JIVO_TOKEN is not configured
    if (!JIVO_TOKEN) {
        console.error('❌ JIVO_TOKEN not configured — rejecting webhook request');
        return res.status(503).send('Webhook token not configured');
    }

    // Constant-time comparison to prevent timing attacks
    if (token.length !== JIVO_TOKEN.length ||
        !require('crypto').timingSafeEqual(Buffer.from(token), Buffer.from(JIVO_TOKEN))) {
        console.warn(`⚠️ Blocked unauthorized webhook request`);
        return res.status(403).send('Unauthorized');
    }

    // Acknowledge JivoChat IMMEDIATELY (within 3 seconds) to prevent chat transfer/state lock
    res.status(200).send();

    // Process asynchronously in background
    setImmediate(async () => {
        try {
            const body = req.body;
            console.log(`\n🔔 [Webhook Received] Event: ${body.event}`);
            
            let clientId: string | undefined;
            let chatId: string | undefined;
            let messageText: string | undefined;

            // Parse JivoChat CLIENT_MESSAGE
            if (body.event === 'CLIENT_MESSAGE' && body.message) {
                clientId = body.client_id;
                chatId = body.chat_id;
                messageText = body.message.text?.toLowerCase().trim();
            } else {
                return;
            }

            if (!clientId || !chatId || !messageText) {
                return;
            }

            console.log(`💬 [INC] User ${clientId}: ${messageText}`);

            // 1. Check "I need help" (Human Escalation) => Transfer back to JivoChat Agent
            if (messageText === 'i need help' || messageText === 'agent' || messageText === 'support') {
                await sendJivoChatMessage(clientId, chatId, {
                    type: 'TEXT',
                    text: '⏸️ I have paused the bot. An agent has been notified and will review your request shortly.'
                });

                if (JIVO_PROVIDER_ID && JIVO_TOKEN) {
                    try {
                        await axios.post(`https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`, {
                            event: "INVITE_AGENT",
                            id: crypto.randomUUID(),
                            client_id: String(clientId),
                            chat_id: String(chatId)
                        });
                    } catch(e) {}
                }
                return;
            }

            // 2. Check if user is registered via API (we use Jivo client_id as the platform_id)
            try {
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/apple/${clientId}`);
                if (profileRes.data?.is_deactivated) {
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: '⚠️ Your Safeeely account has been deactivated. Please contact support@safeeely.com if you believe this is a mistake.'
                    });
                    return;
                }
                const session = getSession(clientId);
                const safetag = profileRes.data.safetag;
                const profileId = profileRes.data.id;

                const isGreeting = messageText.includes('hello') || messageText.includes('hi') || messageText.includes('menu') || messageText.includes('start');
                const isExplicitBack = messageText === 'back';

                // --- MAIN MENU TRIGGER ---
                // Only trigger global menu keyword if we are NOT in the middle of a transaction wizard
                // or if the user explicitly typed 'back'
                if (isExplicitBack || (isGreeting && (session.state === 'IDLE' || session.state === 'CONFIRMATION'))) {
                    resetSession(clientId);
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: `🏠 Main Menu`,
                        text: `👋 Welcome back, ${safetag}!\nWhat would you like to do today?`,
                        force_reply: true,
                        buttons: [
                            { text: '🛒 Create Transaction', description: 'Start a new secure escrow order', subtitle: 'Start a new secure escrow order', id: 1 },
                            { text: '📋 My Transactions', description: 'View your active and past orders', subtitle: 'View your active and past orders', id: 2 },
                            { text: '💰 Balance & Withdrawals', description: 'Check funds and cash out', subtitle: 'Check funds and cash out', id: 3 },
                            { text: '🎁 Referrals', description: 'Invite friends and earn rewards', subtitle: 'Invite friends and earn rewards', id: 4 },
                            { text: '⭐ Reviews & Ratings', description: 'View your feedback and score', subtitle: 'View your feedback and score', id: 5 },
                            { text: '⚙️ Settings & Profile', description: 'Manage your account details', subtitle: 'Manage your account details', id: 6 }
                        ]
                    });
                    return;
                }

                // --- REFERRALS ---
                if (messageText.includes('referral')) {
                    try {
                        const fmtAmt = (amount: number, currency: string) => {
                            const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
                            return sym[currency]
                                ? `${sym[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${parseFloat(amount.toFixed(8))} ${currency}`;
                        };

                        const statsRes = await axios.get(`${API_URL}/referrals/${encodeURIComponent(safetag)}/stats`);
                        const stats = statsRes.data;

                        const cleanSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                        const referralLink = `${FRONTEND_URL}/${cleanSafetag}`;
                        const withdrawLink = (await buildMagicLink({ platform_id: clientId, scope: 'withdraw', fallbackUrl: `${FRONTEND_URL}/withdraw/${encodeURIComponent(safetag)}` })) + '#referrals';

                        const earningsLines = stats.earningsByCurrency?.length
                            ? stats.earningsByCurrency.map((e: any) => `  • ${fmtAmt(e.totalEarned, e.currency)}`).join('\n')
                            : '  • None yet';

                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `🎁 My Referrals\n\nInvite friends and earn up to 1.5% commission for life on all secured purchases!\n\n🔗 Your Invite Link:\n${referralLink}\n\n📊 Statistics:\n👥 Tier 1 Referrals: ${stats.tier1Count}\n👥 Tier 2 Referrals: ${stats.tier2Count}\n💰 Commissions Earned:\n${earningsLines}\n\n💸 Withdraw your earnings:\n${withdrawLink}`
                        });
                    } catch (e: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Could not load referral stats: ${e.message}` });
                    }
                    return;
                }

                // --- REVIEWS & RATINGS ---
                if (messageText.includes('reviews') || messageText.includes('ratings') || messageText === '5') {
                    try {
                        const cleanSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                        const [statsRes, badgesRes] = await Promise.all([
                            axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(cleanSafetag)}`),
                            axios.get(`${API_URL}/profiles/${encodeURIComponent(cleanSafetag)}/badges`),
                        ]);
                        const { average_rating, review_count } = statsRes.data;
                        const badges = badgesRes.data || [];
                        const rating = Number(average_rating || 0);
                        const starsCount = Math.round(rating);
                        const stars = '⭐'.repeat(starsCount) + '☆'.repeat(Math.max(0, 5 - starsCount));
                        let badgeLine = badges.length > 0 ? `\nBadges: ${badges.map((b: any) => `${b.emoji || ''} ${b.label}`).join(' | ')}` : '';
                        const reviewMsg = `⭐ Reviews & Ratings\n\nYour trust score: ${rating.toFixed(1)}/5 ${stars}\nBased on ${review_count} review${review_count !== 1 ? 's' : ''}.${badgeLine}\n\nTap below to view your full review history.`;
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: reviewMsg });
                        const reviewLink = `${FRONTEND_URL}/reviews/${encodeURIComponent(cleanSafetag)}`;
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: reviewLink });
                    } catch (e: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Could not load review stats: ${e.message}` });
                    }
                    return;
                }

                // --- TRANSACTION WIZARD STATE MACHINE ---

                // Transition: Menu -> Transaction Wizard
                if (messageText.includes('create transaction') || messageText === '1') {
                    session.state = 'ROLE_SELECTION';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '🛒 Create New Transaction',
                        text: 'Are you buying or selling?',
                        force_reply: true,
                        buttons: [
                            { text: '1️⃣ I am a buyer', title: 'I am a buyer', description: 'I want to pay for a product/service', subtitle: 'I want to pay for a product/service', id: 'role_buyer' },
                            { text: '2️⃣ I am a seller', title: 'I am a seller', description: 'I want to receive payment for an item', subtitle: 'I want to receive payment for an item', id: 'role_seller' }
                        ]
                    });
                    return;
                }

                // Step 1: Role Selection -> Step 2: Product Name
                if (session.state === 'ROLE_SELECTION') {
                    const role = messageText.includes('buyer') ? 'buyer' : 'seller';
                    session.formData.role = role;
                    session.state = 'PRODUCT_NAME';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: `🛒 ${role === 'buyer' ? 'Buyer' : 'Seller'} Transaction - Step 1/8\n\nWhat do you want to ${role === 'buyer' ? 'buy' : 'sell'}?\n\nPlease enter the product or service name:`
                    });
                    return;
                }

                // Step 2: Product Name -> Step 3: Description
                if (session.state === 'PRODUCT_NAME') {
                    session.formData.product_name = body.message.text;
                    session.state = 'PRODUCT_DESCRIPTION';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: `🛒 Step 2/8: Description\n\nPlease provide a detailed description:\n\n📝 Include specs, condition, or special requirements:`
                    });
                    return;
                }

                // Step 3: Description -> Step 4: Attachments
                if (session.state === 'PRODUCT_DESCRIPTION') {
                    session.formData.description = body.message.text;
                    session.state = 'ATTACHMENTS';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: '🛒 Step 3/8: Attachments\n\n📎 Upload Attachments (Optional)\n\nYou can upload images/docs via chat now, or type "Skip" to proceed without documents.'
                    });
                    return;
                }

                // Step 4: Attachments Handling
                if (session.state === 'ATTACHMENTS') {
                    const isMedia = body.message.type === 'IMAGE' || body.message.type === 'FILE';
                    const isSkip = messageText === 'skip';

                    if (isMedia || isSkip) {
                        if (isMedia) {
                            console.log(`[Wizard] Attachment received from ${clientId}`);
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✅ Attachment received.' });
                        }
                        
                        session.state = 'CURRENCY_SELECTION';
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: '🛒 Step 4/8: Currency',
                            text: '💱 Choose Currency\nSelect the currency for this transaction:',
                            force_reply: true,
                            buttons: [
                                { text: '🇳🇬 NGN (Naira)', title: 'NGN (Naira)', description: 'Local Nigerian currency', id: 'NGN' },
                                { text: '🇺🇸 USD (Dollar)', title: 'USD (Dollar)', description: 'US Dollars', id: 'USD' },
                                { text: '🪙 USDT (Tether)', title: 'USDT (Tether)', description: 'Crypto stablecoin', id: 'USDT' }
                            ]
                        });
                        return;
                    }
                    // If they send text that isn't skip, remind them
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: 'Please upload a document or type "Skip" to continue.' });
                    return;
                }

                // Step 5: Currency -> Step 6: Transaction Type
                if (session.state === 'CURRENCY_SELECTION') {
                    session.formData.currency = messageText.includes('ngn') ? 'NGN' : (messageText.includes('usdt') ? 'USDT' : 'USD');
                    session.state = 'TRANSACTION_TYPE';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '🛒 Step 5/9: Transaction Type',
                        text: '💡 How would you like to structure this transaction?',
                        force_reply: true,
                        buttons: [
                            { text: '1️⃣ One-Time Payment', title: 'One-Time Payment', description: 'Single payment on delivery', id: 'type_one_time' },
                            { text: '2️⃣ Milestone-Based', title: 'Milestone-Based', description: 'Pay in phases as work progresses', id: 'type_milestone' }
                        ]
                    });
                    return;
                }

                // Step 6a (ONE_TIME): Transaction Type -> Amount
                if (session.state === 'TRANSACTION_TYPE') {
                    const isMilestone = messageText.includes('milestone') || messageText === 'type_milestone';
                    session.formData.transaction_type = isMilestone ? 'MILESTONE' : 'ONE_TIME';
                    if (isMilestone) {
                        session.formData.milestones = [];
                        session.state = 'MILESTONE_TITLE';
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `📍 Milestone Setup — Phase 1\n\nEnter the title for the first milestone:\n(e.g. "Initial Deposit", "Design Phase", "Final Delivery")`
                        });
                    } else {
                        session.state = 'PRICE_INPUT';
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `🛒 Step 6/9: Amount\n\n💰 How much is the price?\n\nEnter the amount in ${session.formData.currency}:`
                        });
                    }
                    return;
                }

                // Milestone: collect phase title
                if (session.state === 'MILESTONE_TITLE') {
                    session.formData.current_milestone_title = body.message.text;
                    session.state = 'MILESTONE_AMOUNT';
                    const phaseNum = (session.formData.milestones?.length || 0) + 1;
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: `📍 Phase ${phaseNum}: "${session.formData.current_milestone_title}"\n\n💰 Enter the amount for this phase in ${session.formData.currency}:`
                    });
                    return;
                }

                // Milestone: collect phase amount
                if (session.state === 'MILESTONE_AMOUNT') {
                    const amt = parseFloat(messageText);
                    if (isNaN(amt) || amt <= 0) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Invalid amount. Please enter a valid number:' });
                        return;
                    }
                    session.formData.milestones = session.formData.milestones || [];
                    session.formData.milestones.push({ title: session.formData.current_milestone_title!, amount: amt });
                    const total = session.formData.milestones.reduce((s, m) => s + m.amount, 0);
                    const list  = session.formData.milestones.map((m, i) => `  ${i + 1}. ${m.title} — ${m.amount} ${session.formData.currency}`).join('\n');
                    session.state = 'MILESTONE_ADD_MORE';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '📍 Milestone Added',
                        text: `✅ Phase added!\n\n${list}\n\n💰 Total so far: ${total} ${session.formData.currency}\n\nAdd another phase or finish setup?`,
                        force_reply: true,
                        buttons: [
                            { text: '➕ Add Another Phase', title: 'Add Another Phase', description: 'Add one more milestone', id: 'add_milestone' },
                            { text: '✅ Finish Setup', title: 'Finish Setup', description: 'Proceed to fee allocation', id: 'finish_milestones' }
                        ]
                    });
                    return;
                }

                // Milestone: add more or finish
                if (session.state === 'MILESTONE_ADD_MORE') {
                    if (messageText === 'add_milestone' || messageText.includes('add')) {
                        session.state = 'MILESTONE_TITLE';
                        const phaseNum = (session.formData.milestones?.length || 0) + 1;
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `📍 Phase ${phaseNum} Title\n\nEnter the title for this milestone:`
                        });
                    } else {
                        // Proceed to fee allocation — total is sum of all milestones
                        const total = session.formData.milestones!.reduce((s, m) => s + m.amount, 0);
                        session.formData.amount = total;
                        const fee = total * 0.05;
                        session.state = 'FEE_ALLOCATION';
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: '🛒 Fee Allocation',
                            text: `💵 Who pays the 5% escrow fee?\n\nTotal: ${total} ${session.formData.currency}\nEscrow Fee: ${fee.toFixed(2)} ${session.formData.currency}`,
                            force_reply: true,
                            buttons: [
                                { text: '👤 Buyer (pays 100%)', title: 'Buyer (pays 100%)', description: 'Buyer covers the entire fee', id: 'buyer' },
                                { text: '👤 Seller (pays 100%)', title: 'Seller (pays 100%)', description: 'Seller covers the entire fee', id: 'seller' },
                                { text: '🤝 Split (50/50)', title: 'Split (50/50)', description: 'Both parties share the fee', id: 'split' }
                            ]
                        });
                    }
                    return;
                }

                // Step 6b (ONE_TIME): Amount -> Step 7: Fee Allocation
                if (session.state === 'PRICE_INPUT') {
                    const amount = parseFloat(messageText);
                    if (isNaN(amount) || amount <= 0) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Invalid amount. Please enter a valid number (e.g. 5000):' });
                        return;
                    }
                    session.formData.amount = amount;
                    const fee = amount * 0.05;
                    session.state = 'FEE_ALLOCATION';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '🛒 Step 7/9: Fee Allocation',
                        text: `💵 Who pays the 5% transaction fee?\n\nAmount: ${amount} ${session.formData.currency}\nEscrow Fee: ${fee.toFixed(2)} ${session.formData.currency}`,
                        force_reply: true,
                        buttons: [
                            { text: '👤 Buyer (pays 100%)', title: 'Buyer (pays 100%)', description: 'Buyer covers the entire fee', id: 'buyer' },
                            { text: '👤 Seller (pays 100%)', title: 'Seller (pays 100%)', description: 'Seller covers the entire fee', id: 'seller' },
                            { text: '🤝 Split (50/50)', title: 'Split (50/50)', description: 'Both parties share the fee', id: 'split' }
                        ]
                    });
                    return;
                }

                // Fee Allocation -> Counterparty Safetag
                if (session.state === 'FEE_ALLOCATION') {
                    session.formData.fee_allocation = messageText.includes('buyer') ? 'buyer' : (messageText.includes('split') ? 'split' : 'seller');
                    session.state = 'COUNTERPARTY_SAFETAG';
                    const role = session.formData.role;
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: `👤 Counterparty\n\nEnter the ${role === 'buyer' ? 'seller' : 'buyer'}'s Safetag (e.g., @user_123):`
                    });
                    return;
                }

                // Step 8: Counterparty Safetag -> Profile Preview -> Confirmation
                if (session.state === 'COUNTERPARTY_SAFETAG') {
                    const otherTag = messageText.startsWith('@') ? messageText : `@${messageText}`;
                    try {
                        const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(otherTag)}`);
                        session.formData.other_safetag = res.data.safetag;
                        session.formData.other_id = res.data.id;

                        const role = session.formData.role;
                        const isVerified = res.data.kyc_status === 'VERIFIED';
                        const verifiedLabel = isVerified ? '✅ Verified' : '❌ Unverified';

                        // Fetch completed trades count for counterparty preview
                        let completedTrades = 0;
                        try {
                            const statsRes = await axios.get(`${API_URL}/profiles/${encodeURIComponent(otherTag)}/stats`);
                            completedTrades = statsRes.data.completed_trades ?? 0;
                        } catch (_) {}

                        const accountAgeLine = res.data.created_at ? `\n📅 Member for: ${formatAccountAge(res.data.created_at)}` : '';
                        const tradesLine = `\n${completedTrades === 0 ? '⚠️' : '✅'} Completed trades: ${completedTrades}`;

                        // 1. Text Summary
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `👤 Counterparty Found: ${res.data.safetag}\nStatus: ${verifiedLabel}${accountAgeLine}${tradesLine}\n\nReviewing their reputation before we proceed:`
                        });

                        // 2. Standalone Profile Preview Link (Integrated Browser trigger)
                        const profileLink = `${FRONTEND_URL}/reviews/${encodeURIComponent(res.data.safetag)}`;
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: profileLink
                        });

                        // 3. Risk-factor warning system
                        try {
                            const buyerSafetag = role === 'buyer' ? safetag : res.data.safetag;
                            const sellerSafetag = role === 'seller' ? safetag : res.data.safetag;
                            const [pairRes, sellerStatsRes, sellerReviewRes] = await Promise.all([
                                axios.get(`${API_URL}/transactions/pair-history?buyer=${encodeURIComponent(buyerSafetag)}&seller=${encodeURIComponent(sellerSafetag)}`),
                                axios.get(`${API_URL}/profiles/${encodeURIComponent(sellerSafetag)}/stats`),
                                axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(sellerSafetag)}`),
                            ]);

                            const pairCount = pairRes.data.completed_count ?? 0;
                            const sellerCompletedTrades = sellerStatsRes.data.completed_trades ?? 0;
                            const memberDays = Math.floor((Date.now() - new Date(sellerStatsRes.data.member_since).getTime()) / 86_400_000);
                            const reviewCount = sellerReviewRes.data.review_count ?? 0;

                            const risks: string[] = [];
                            if (sellerCompletedTrades === 0) risks.push('⚠️ Seller has no completed trades on Safeeely');
                            if (memberDays < 14) risks.push(`⚠️ Seller joined only ${memberDays} day${memberDays !== 1 ? 's' : ''} ago`);
                            if (reviewCount === 0) risks.push('⚠️ Seller has no reviews yet');
                            if (pairCount === 0) risks.push('⚠️ You have never completed a trade with this person before');

                            if (risks.length >= 2) {
                                await sendJivoChatMessage(clientId, chatId, {
                                    type: 'TEXT',
                                    text: `🚨 Risk Factors Detected\n\n${risks.join('\n')}\n\nThese are common patterns in scam attempts. Only proceed if you have verified this seller independently.`
                                });
                            }
                        } catch (_) {
                            // Fail silently — risk checks are non-critical
                        }

                        // 4. Review & Confirm Buttons
                        const { product_name, description, amount, currency, fee_allocation, transaction_type, milestones } = session.formData;
                        const fee = amount! * 0.05;
                        const total = fee_allocation === 'buyer' ? amount! + fee : (fee_allocation === 'split' ? amount! + (fee / 2) : amount!);

                        const milestoneSection = transaction_type === 'MILESTONE' && milestones?.length
                            ? '\n\n📍 Milestones:\n' + milestones.map((m, i) => `  ${i + 1}. ${m.title} — ${m.amount} ${currency}`).join('\n')
                            : '';

                        session.state = 'CONFIRMATION';
                        const summary = `📋 Transaction Summary\n\n🛒 Product: ${product_name}\n📝 Description: ${description}${milestoneSection}\n\n💰 Total: ${amount} ${currency}\n💵 Fee: ${fee.toFixed(2)} ${currency} (${fee_allocation})\n💳 You Pay: ${total.toFixed(2)} ${currency}\n👤 ${role === 'buyer' ? 'Seller' : 'Buyer'}: ${otherTag}`;

                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: '📋 Review & Confirm',
                            text: summary,
                            force_reply: true,
                            buttons: [
                                { text: '✅ Confirm & Create', title: 'Confirm & Create', description: 'Submit order to counterparty', id: 'confirm' },
                                { text: '❌ Cancel', title: 'Cancel', description: 'Abort and go to menu', id: 'cancel' }
                            ]
                        });
                    } catch (e) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ User not found\n\nThe Safetag "${otherTag}" doesn't exist. Please check and try again:` });
                    }
                    return;
                }

                // Step 7: Invoice prompt (before finalizing)
                if (session.state === 'CONFIRMATION') {
                    if (messageText.includes('confirm')) {
                        const { role, product_name, amount, currency, other_safetag } = session.formData;
                        const isSeller = role === 'seller';
                        const invoiceText = isSeller
                            ? `📄 Smart Invoice\n\nWant to send your buyer a professional invoice?\n\nA branded invoice PDF will be emailed to your buyer:\n  📦 Item: ${product_name}\n  💰 Amount: ${amount} ${currency}\n  👤 Buyer: @${other_safetag}\n\nIncludes a Pay with Safeeely button for easy payment.`
                            : `📄 Smart Invoice\n\nWould you like an invoice for this transaction?\n\nA professional invoice from your seller, emailed to you:\n  📦 Item: ${product_name}\n  💰 Amount: ${amount} ${currency}\n  🏪 Seller: @${other_safetag}\n\nPerfect for your records or expense tracking.`;
                        const yesLabel = isSeller ? '📧 Send Invoice' : '📧 Get Invoice';
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTON',
                            title: '📄 Smart Invoice',
                            text: invoiceText,
                            force_reply: true,
                            buttons: [
                                { text: yesLabel, title: yesLabel, description: 'Send a professional invoice PDF', id: 'invoice_yes' },
                                { text: '❌ No, Skip', title: 'No, Skip', description: 'Skip the invoice', id: 'invoice_no' }
                            ]
                        });
                        session.state = 'INVOICE_PROMPT';
                    } else {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Transaction cancelled.' });
                        resetSession(clientId);
                    }
                    return;
                }

                // Finalize after invoice choice
                if (session.state === 'INVOICE_PROMPT') {
                    if (messageText === 'invoice_yes' || messageText === 'invoice_no') {
                        session.formData.send_invoice = messageText === 'invoice_yes';
                        try {
                            const { role, product_name, description, amount, currency, fee_allocation, other_safetag, send_invoice, transaction_type, milestones } = session.formData;
                            const res = await axios.post(`${API_URL}/transactions/create`, {
                                buyer_safetag: role === 'buyer' ? safetag : other_safetag,
                                seller_safetag: role === 'seller' ? safetag : other_safetag,
                                product_name,
                                description,
                                amount,
                                currency,
                                fee_allocation,
                                initiator_safetag: safetag,
                                send_invoice: send_invoice || false,
                                ...(transaction_type === 'MILESTONE' && milestones?.length ? { transaction_type: 'MILESTONE', milestones } : {}),
                            });
                            const txnCode = res.data.txn_code;
                            await sendJivoChatMessage(clientId, chatId, {
                                type: 'TEXT',
                                text: `✅ *Transaction Created!*\n\nYour transaction has been sent to the ${role === 'buyer' ? 'seller' : 'buyer'}.\n\n📋 Transaction ID: ${txnCode}\n💰 Amount: ${amount} ${currency}\n\nYou'll be notified of any updates.` +
                                    (send_invoice ? '\n\n📧 Invoice emailed to buyer!' : '')
                            });
                            const txnLink = `${FRONTEND_URL}/transactions/${res.data.id}`;
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: txnLink });
                            resetSession(clientId);
                        } catch (err: any) {
                            const errData = err.response?.data;
                            if (errData?.error === 'AMOUNT_LIMIT_EXCEEDED') {
                                const kycUrl = await buildMagicLink({ platform_id: clientId, scope: 'kyc', fallbackUrl: `${FRONTEND_URL}/kyc` }).catch(() => `${FRONTEND_URL}/kyc`);
                                await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `⚠️ Transaction Limit Exceeded\n\n${errData.message || 'Your unverified account has a transaction limit. Complete identity verification to unlock higher amounts.'}\n\nTap to verify: ${kycUrl}` });
                            } else {
                                await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Error creating transaction: ${errData?.error || err.message}` });
                            }
                            resetSession(clientId);
                        }
                    }
                    return;
                }

                // --- SELLER_MILESTONE_SELECT: seller types number to pick which milestone to mark complete ---
                if (session.state === 'SELLER_MILESTONE_SELECT') {
                    const pending = (session.formData.settlement_milestones || []).filter((m: any) => m.status === 'PENDING');
                    const idx = parseInt(messageText, 10) - 1;
                    if (isNaN(idx) || idx < 0 || idx >= pending.length) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Please type a number between 1 and ${pending.length}.` });
                        return;
                    }
                    const chosen = pending[idx];
                    session.formData.settlement_milestone_id = chosen.id;
                    session.formData.settlement_milestone_title = chosen.title;
                    session.formData.settlement_milestone_amount = chosen.amount;
                    session.state = 'SELLER_MILESTONE_CONFIRM';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '📦 Confirm Milestone Delivery',
                        text: `You're marking this milestone as delivered:\n\n📍 ${chosen.title}\n💰 ${chosen.amount} ${session.formData.currency || ''}\n\nConfirm?`,
                        force_reply: true,
                        buttons: [
                            { text: '✅ Confirm Delivery', title: 'Confirm Delivery', description: 'Mark this milestone complete', id: 'confirm_milestone' },
                            { text: '❌ Cancel', title: 'Cancel', description: 'Go back', id: 'cancel_milestone' }
                        ]
                    });
                    return;
                }

                // --- SELLER_MILESTONE_CONFIRM: seller confirms the delivery ---
                if (session.state === 'SELLER_MILESTONE_CONFIRM') {
                    if (messageText === 'confirm_milestone') {
                        const { settlement_txn_id, settlement_milestone_id } = session.formData;
                        try {
                            await axios.patch(`${API_URL}/transactions/${settlement_txn_id}/milestones/${settlement_milestone_id}/status`, { status: 'COMPLETED', updater_safetag: safetag }, { headers: BOT_AUTH_HEADERS });
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `📦 Milestone "${session.formData.settlement_milestone_title}" marked as complete! The buyer has been notified to review and release funds.` });
                        } catch (err: any) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to mark milestone complete.'}` });
                        }
                        session.state = 'IDLE';
                        session.formData.settlement_txn_id = undefined;
                        session.formData.settlement_milestones = undefined;
                        session.formData.settlement_milestone_id = undefined;
                    } else {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Action cancelled.' });
                        session.state = 'IDLE';
                    }
                    return;
                }

                // --- BUYER_MILESTONE_SELECT: buyer types number to pick which milestone to release ---
                if (session.state === 'BUYER_MILESTONE_SELECT') {
                    const completed = (session.formData.settlement_milestones || []).filter((m: any) => m.status === 'COMPLETED');
                    const idx = parseInt(messageText, 10) - 1;
                    if (isNaN(idx) || idx < 0 || idx >= completed.length) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Please type a number between 1 and ${completed.length}.` });
                        return;
                    }
                    const chosen = completed[idx];
                    session.formData.settlement_milestone_id = chosen.id;
                    session.formData.settlement_milestone_title = chosen.title;
                    session.formData.settlement_milestone_amount = chosen.amount;
                    session.state = 'BUYER_MILESTONE_CONFIRM';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '💸 Confirm Milestone Release',
                        text: `You're releasing funds for this milestone:\n\n📍 ${chosen.title}\n💰 ${chosen.amount} ${session.formData.currency || ''}\n\nThis will transfer the funds to the seller immediately.`,
                        force_reply: true,
                        buttons: [
                            { text: '💸 Release Funds', title: 'Release Funds', description: 'Send funds to seller', id: 'confirm_release' },
                            { text: '❌ Cancel', title: 'Cancel', description: 'Go back', id: 'cancel_release' }
                        ]
                    });
                    return;
                }

                // --- BUYER_MILESTONE_CONFIRM: buyer confirms the release ---
                if (session.state === 'BUYER_MILESTONE_CONFIRM') {
                    if (messageText === 'confirm_release') {
                        const { settlement_txn_id, settlement_milestone_id } = session.formData;
                        try {
                            await axios.patch(`${API_URL}/transactions/${settlement_txn_id}/milestones/${settlement_milestone_id}/status`, { status: 'RELEASED', updater_safetag: safetag }, { headers: BOT_AUTH_HEADERS });
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `💸 Funds released for "${session.formData.settlement_milestone_title}"! The seller has been notified.` });
                        } catch (err: any) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to release milestone.'}` });
                        }
                        session.state = 'IDLE';
                        session.formData.settlement_txn_id = undefined;
                        session.formData.settlement_milestones = undefined;
                        session.formData.settlement_milestone_id = undefined;
                    } else {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Action cancelled.' });
                        session.state = 'IDLE';
                    }
                    return;
                }

                // --- DISPUTE_CATEGORY state input ---
                if (session.state === 'DISPUTE_CATEGORY') {
                    const categoryMap: Record<string, string> = {
                        dispute_cat_NOT_DELIVERED:    'NOT_DELIVERED',
                        dispute_cat_NOT_AS_DESCRIBED: 'NOT_AS_DESCRIBED',
                        dispute_cat_CREDENTIALS:      'CREDENTIALS_ACCESS',
                        dispute_cat_INCOMPLETE:       'SERVICE_INCOMPLETE',
                        dispute_cat_PAYMENT:          'PAYMENT_ISSUE',
                        dispute_cat_OTHER:            'OTHER'
                    };
                    const category = categoryMap[messageText];
                    if (!category) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '⚠️ Please tap one of the category buttons above.' });
                        return;
                    }
                    session.formData.dispute_category = category;
                    session.state = 'DISPUTE_REASON';
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✏️ Step 2 of 2: Describe the Issue\n\nPlease describe the reason for your dispute:\n\n(e.g., "The item was not delivered", "The credentials did not work")' });
                    return;
                }

                // --- DISPUTE_REASON state input ---
                if (session.state === 'DISPUTE_REASON') {
                    const txnId = session.formData.dispute_txn_id!;
                    const disputeSafetag = session.formData.dispute_safetag || '';
                    try {
                        await axios.post(`${API_URL}/disputes/raise`, { transaction_id: txnId, reason: messageText, raised_by: profileId, category: session.formData.dispute_category }, { headers: BOT_AUTH_HEADERS });
                        const disputeUrl = await buildMagicLink({ platform_id: clientId, scope: 'dispute', txn_id: txnId, fallbackUrl: `${FRONTEND_URL}/withdraw/${encodeURIComponent(disputeSafetag)}?view=dispute_details&txnId=${txnId}` });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '⚖️ Dispute raised. Transaction frozen. An AI mediator will review shortly and may ask for evidence.' });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `👁️ View your dispute details:\n${disputeUrl}` });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to raise dispute.'}` });
                    }
                    resetSession(clientId);
                    return;
                }

                // --- REVIEW_RATING state — expects button id like 'review_5' ---
                if (session.state === 'REVIEW_RATING') {
                    const match = messageText.match(/^review_(\d)$/);
                    if (match) {
                        session.formData.review_rating = parseInt(match[1], 10);
                        session.state = 'REVIEW_COMMENT';
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '💬 Please leave a comment about your experience (or type "skip" to skip):' });
                    }
                    return;
                }

                // --- REVIEW_COMMENT state ---
                if (session.state === 'REVIEW_COMMENT') {
                    const txnId = session.formData.review_txn_id!;
                    const other = session.formData.review_other!;
                    const rating = session.formData.review_rating || 5;
                    const remark = messageText === 'skip' ? '' : messageText;
                    try {
                        await axios.post(`${API_URL}/reviews/create`, { transaction_id: txnId, reviewer_safetag: safetag, reviewee_safetag: other, rating, remark });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '🎉 Thank you for leaving a review! This helps make buying and selling safer for everyone.' });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to submit review.'}` });
                    }
                    resetSession(clientId);
                    return;
                }

                // --- FEEDBACK_RATING state — expects button id like 'fb_rate_5' ---
                if (session.state === 'FEEDBACK_RATING') {
                    const match = messageText.match(/^fb_rate_(\d)$/);
                    if (match) {
                        const rating = parseInt(match[1], 10);
                        session.formData.feedback_rating = rating;
                        session.state = 'FEEDBACK_COMMENT';
                        const commentPrompt = getCommentPrompt(rating);
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `${commentPrompt}\n\n(or type "skip" to skip)` });
                    }
                    return;
                }

                // --- FEEDBACK_COMMENT state ---
                if (session.state === 'FEEDBACK_COMMENT') {
                    const comment = messageText === 'skip' ? '' : messageText;
                    try {
                        await axios.post(`${API_URL}/feedback`, {
                            reviewer_safetag: safetag,
                            rating:           session.formData.feedback_rating || 5,
                            comment,
                            source:           session.formData.feedback_source || 'menu',
                            source_ref_id:    session.formData.feedback_ref_id || undefined,
                            platform:         'apple',
                        });
                        const successMsg = pickRandom(FEEDBACK_SUCCESS_MESSAGES);
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `✅ feedback received!\n\n${successMsg}` });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to submit feedback.'}` });
                    }
                    resetSession(clientId);
                    return;
                }

                // --- NOTIFICATION ACTION BUTTONS ---
                if (messageText.startsWith('txn_action_accept|')) {
                    const txnId = messageText.replace('txn_action_accept|', '');
                    try {
                        await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'accept', updater_safetag: safetag }, { headers: BOT_AUTH_HEADERS });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✅ Transaction accepted! The buyer will be notified to make payment.' });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to accept.'}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_action_decline|')) {
                    const txnId = messageText.replace('txn_action_decline|', '');
                    try {
                        await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'decline', updater_safetag: safetag }, { headers: BOT_AUTH_HEADERS });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Transaction declined.' });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to decline.'}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_action_complete_prompt|')) {
                    const txnId = messageText.replace('txn_action_complete_prompt|', '');
                    const uploadUrl = `${FRONTEND_URL}/upload/${txnId}`;
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '📦 Mark as Delivered',
                        text: 'Have you uploaded proof of delivery? Tap the link below to upload, then confirm.',
                        force_reply: true,
                        buttons: [
                            { text: '✅ Yes, Mark as Delivered', id: `txn_action_complete_yes|${txnId}`, description: 'Mark delivery as done', subtitle: 'Mark delivery as done' },
                            { text: '📎 Upload via Web',         id: `noop`, description: uploadUrl, subtitle: uploadUrl }
                        ]
                    });
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `📎 Upload proof of delivery here:\n${uploadUrl}` });
                    return;
                }

                if (messageText.startsWith('txn_action_complete_yes|')) {
                    const txnId = messageText.replace('txn_action_complete_yes|', '');
                    try {
                        await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_confirmed', updater_safetag: safetag }, { headers: BOT_AUTH_HEADERS });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✅ Delivery marked! The buyer has been notified to confirm receipt.' });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to mark complete.'}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_action_confirm_receipt|')) {
                    const txnId = messageText.replace('txn_action_confirm_receipt|', '');
                    try {
                        const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'confirm_receipt', updater_safetag: safetag }, { headers: BOT_AUTH_HEADERS });
                        const msg = (res.data.follow_up_msg || '🎉 Receipt confirmed! Funds have been released to the seller.').replace(/<[^>]*>/g, '');
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: msg });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to confirm receipt.'}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_refund_initiate|')) {
                    const txnId = messageText.replace('txn_refund_initiate|', '');
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '💸 Refund Buyer',
                        text: 'Why are you cancelling this transaction? The buyer will receive a full refund. Your seller cancellation count will increase.',
                        force_reply: true,
                        buttons: [
                            { text: '📦 Out of stock',      id: `txn_refund_reason|${txnId}|out_of_stock`,  description: 'Item no longer available', subtitle: 'Item no longer available' },
                            { text: '🚫 Cannot fulfil',     id: `txn_refund_reason|${txnId}|cannot_fulfil`, description: 'Unable to fulfil order',    subtitle: 'Unable to fulfil order' },
                            { text: '🤝 Mutual cancel',     id: `txn_refund_reason|${txnId}|mutual_cancel`, description: 'Agreed to cancel',          subtitle: 'Agreed to cancel' },
                        ]
                    });
                    return;
                }

                if (messageText.startsWith('txn_refund_reason|')) {
                    const parts = messageText.split('|');
                    const txnId = parts[1];
                    const reason = parts[2];
                    try {
                        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                        const txn = res.data;
                        const reasonLabels: Record<string, string> = {
                            out_of_stock: 'Item no longer available / out of stock',
                            cannot_fulfil: 'Unable to fulfil this order',
                            mutual_cancel: 'Mutually agreed to cancel with buyer',
                        };
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: '⚠️ Confirm Cancellation',
                            text: `You are about to return ${txn.amount} ${txn.currency} to ${txn.buyer?.safetag}.\n\nReason: ${reasonLabels[reason] || reason}\n\nThis cannot be undone. Your seller cancellation count will increase.`,
                            force_reply: true,
                            buttons: [
                                { text: '✅ Yes, Refund Buyer', id: `txn_refund_confirm|${txnId}|${reason}`, description: 'Issue full refund', subtitle: 'Issue full refund' },
                                { text: '❌ Cancel',            id: 'menu_main',                              description: 'Go back',           subtitle: 'Go back' },
                            ]
                        });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Could not load transaction: ${err.response?.data?.error || err.message}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_refund_confirm|')) {
                    const parts = messageText.split('|');
                    const txnId = parts[1];
                    const reason = parts[2];
                    try {
                        await axios.patch(
                            `${API_URL}/transactions/${txnId}/status`,
                            { status: 'seller_cancel', updater_safetag: safetag, cancellation_reason: reason },
                            { headers: BOT_AUTH_HEADERS }
                        );
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✅ Cancellation confirmed. A full refund has been issued to the buyer. The transaction has been cancelled.' });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Refund failed: ${err.response?.data?.error || err.message}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_pay_')) {
                    const txnId = messageText.replace('txn_pay_', '');
                    try {
                        await axios.post(`${API_URL}/transactions/${txnId}/initialize-payment`, { safetag }, { headers: BOT_AUTH_HEADERS });
                    } catch (err: any) {
                        if (err?.response?.data?.error === 'ALREADY_PAID') {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✅ Payment already confirmed for this transaction.' });
                            return;
                        }
                        // Non-ALREADY_PAID errors are non-fatal — still show the pay link
                    }
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `💳 Tap the link below to complete your secure payment:\n${FRONTEND_URL}/pay/${txnId}` });
                    return;
                }

                if (messageText.startsWith('view_txn_details|')) {
                    const txnId = messageText.replace('view_txn_details|', '');
                    try {
                        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                        const t = res.data;
                        const isBuyer = safetag === t.buyer.safetag;
                        const other = isBuyer ? t.seller.safetag : t.buyer.safetag;
                        const isMilestone = t.transaction_type === 'MILESTONE';
                        const statusLabels: Record<string, string> = {
                            PENDING_SELLER_ACCEPTANCE: '⏳ Awaiting Acceptance', ACCEPTED: '✅ Accepted',
                            PAID: '💳 Paid', AWAITING_PROOF: '📎 Awaiting Proof',
                            COMPLETED_BY_SELLER: '📦 Marked Complete', COMPLETED: '✅ Completed',
                            DISPUTED: '⚠️ Disputed', CANCELLED: '❌ Cancelled', FINALIZED: '🎉 Finalized'
                        };
                        let milestoneText = '';
                        if (t.milestones?.length) {
                            milestoneText = '\n\n📍 Milestones:\n' + t.milestones.map((m: any, i: number) => {
                                const emoji = m.status === 'RELEASED' ? '✅' : m.status === 'COMPLETED' ? '📦' : '⏳';
                                return `${emoji} ${i + 1}. ${m.title} — ${m.amount} ${t.currency}`;
                            }).join('\n');
                        }
                        const detail = `📋 Transaction Details\n\n🆔 ID: ${t.txn_code}\n📦 Product: ${t.product_name}\n📝 Description: ${t.description || 'N/A'}\n💰 Amount: ${t.amount} ${t.currency}\n👤 ${isBuyer ? 'Seller' : 'Buyer'}: ${other}\n📊 Status: ${statusLabels[t.status] || t.status}${milestoneText}`;
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: detail });
                        if (t.status === 'PENDING_SELLER_ACCEPTANCE' && !isBuyer) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'BUTTONS', title: 'Actions', text: 'What would you like to do?', force_reply: true, buttons: [
                                { text: '✅ Accept', id: `txn_action_accept|${txnId}`, description: 'Accept this transaction', subtitle: 'Accept this transaction' },
                                { text: '❌ Decline', id: `txn_action_decline|${txnId}`, description: 'Decline this transaction', subtitle: 'Decline this transaction' }
                            ]});
                        } else if (t.status === 'ACCEPTED' && isBuyer) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `💳 Make your payment here:\n${FRONTEND_URL}/pay/${txnId}` });
                        } else if (isMilestone && !isBuyer && t.status === 'PAID') {
                            const pending = (t.milestones || []).filter((m: any) => m.status === 'PENDING');
                            if (pending.length > 0) {
                                session.formData.settlement_txn_id = txnId;
                                session.formData.settlement_milestones = t.milestones;
                                session.formData.currency = t.currency;
                                session.state = 'SELLER_MILESTONE_SELECT';
                                const list = pending.map((m: any, i: number) => `${i + 1}. ${m.title} — ${m.amount} ${t.currency}`).join('\n');
                                await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `📦 Which milestone have you delivered?\n\n${list}\n\nType the number to mark it complete:` });
                            } else {
                                await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: 'ℹ️ All milestones are awaiting buyer release.' });
                            }
                        } else if (isMilestone && isBuyer && ['PAID', 'COMPLETED_BY_SELLER'].includes(t.status)) {
                            const completed = (t.milestones || []).filter((m: any) => m.status === 'COMPLETED');
                            if (completed.length > 0) {
                                session.formData.settlement_txn_id = txnId;
                                session.formData.settlement_milestones = t.milestones;
                                session.formData.currency = t.currency;
                                session.state = 'BUYER_MILESTONE_SELECT';
                                const list = completed.map((m: any, i: number) => `${i + 1}. ${m.title} — ${m.amount} ${t.currency}`).join('\n');
                                await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `💸 Which milestone would you like to release funds for?\n\n${list}\n\nType the number to release:` });
                            } else {
                                await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: 'ℹ️ No milestones are ready to release yet. Ask the seller to mark a milestone as delivered first.' });
                            }
                        } else if (!isMilestone && t.status === 'PAID' && !isBuyer) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'BUTTONS', title: 'Actions', text: 'Ready to deliver? You can also refund the buyer if you cannot fulfil.', force_reply: true, buttons: [
                                { text: '📦 Mark as Delivered', id: `txn_action_complete_prompt|${txnId}`, description: 'Mark order as complete', subtitle: 'Mark order as complete' },
                                { text: '💸 Refund Buyer',      id: `txn_refund_initiate|${txnId}`,        description: 'Cancel and refund',      subtitle: 'Cancel and refund' }
                            ]});
                        } else if (!isMilestone && t.status === 'COMPLETED_BY_SELLER' && isBuyer) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'BUTTONS', title: 'Actions', text: 'Have you received the delivery?', force_reply: true, buttons: [
                                { text: '✅ Confirm Receipt', id: `txn_action_confirm_receipt|${txnId}`, description: 'Confirm you received the item', subtitle: 'Confirm you received the item' },
                                { text: '❌ Raise Dispute', id: `txn_dispute_${txnId}`, description: 'Report a problem', subtitle: 'Report a problem' }
                            ]});
                        }
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Could not load transaction.'}` });
                    }
                    return;
                }

                if (messageText.startsWith('txn_dispute_')) {
                    const txnId = messageText.replace('txn_dispute_', '');
                    session.state = 'DISPUTE_CATEGORY';
                    session.formData.dispute_txn_id = txnId;
                    session.formData.dispute_safetag = safetag;
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '⚠️ Raise Dispute',
                        text: 'Step 1 of 2: Select the category that best describes your issue:',
                        force_reply: true,
                        buttons: [
                            { text: '📦 Not Delivered',    id: 'dispute_cat_NOT_DELIVERED',    description: 'Item/service never delivered' },
                            { text: '🔍 Not As Described', id: 'dispute_cat_NOT_AS_DESCRIBED', description: 'Item differs from listing' },
                            { text: '🔑 Credentials',      id: 'dispute_cat_CREDENTIALS',      description: 'Account or credentials issue' },
                            { text: '🔧 Incomplete',       id: 'dispute_cat_INCOMPLETE',       description: 'Work was partial or stopped' },
                            { text: '💳 Payment Issue',    id: 'dispute_cat_PAYMENT',          description: 'Funds not released' },
                            { text: '❓ Other',            id: 'dispute_cat_OTHER',            description: 'Doesn\'t fit above' }
                        ]
                    });
                    return;
                }

                if (messageText.startsWith('dispute_return_buyer_') || messageText.startsWith('dispute_return_seller_')) {
                    const role = messageText.startsWith('dispute_return_buyer_') ? 'BUYER' : 'SELLER';
                    const disputeId = role === 'BUYER'
                        ? messageText.replace('dispute_return_buyer_', '')
                        : messageText.replace('dispute_return_seller_', '');
                    try {
                        await axios.post(`${API_URL}/disputes/${disputeId}/confirm-return`, { confirmer_id: profileId, role });
                        const msg = role === 'BUYER'
                            ? '📦 Shipping confirmed! The seller has been notified. Awaiting their receipt confirmation.'
                            : '✅ Receipt confirmed! A refund credit has been issued to the buyer.';
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: msg });
                    } catch (err: any) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ ${err.response?.data?.error || 'Failed to confirm return. Please try again.'}` });
                    }
                    return;
                }

                if (messageText.startsWith('view_docs_')) {
                    const txnId = messageText.replace('view_docs_', '');
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `📎 View delivery documents here:\n${FRONTEND_URL}/delivery/${txnId}` });
                    return;
                }

                if (messageText.toLowerCase() === 'feedback' || messageText.startsWith('pf_rate_menu|')) {
                    let feedbackSource = 'menu';
                    let feedbackRefId: string | undefined;
                    if (messageText.startsWith('pf_rate_menu|')) {
                        const parts = messageText.split('|');
                        feedbackSource = parts[1];
                        feedbackRefId  = parts[2];
                    }
                    session.state = 'FEEDBACK_RATING';
                    session.formData.feedback_source = feedbackSource;
                    session.formData.feedback_ref_id = feedbackRefId;
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '💭 Rate Safeeely',
                        text: 'how many stars would you give us? 👇',
                        force_reply: true,
                        buttons: [
                            { text: '⭐⭐⭐⭐⭐ 5 Stars', id: 'fb_rate_5', description: 'absolutely loved it' },
                            { text: '⭐⭐⭐⭐ 4 Stars',  id: 'fb_rate_4', description: 'pretty good'         },
                            { text: '⭐⭐⭐ 3 Stars',    id: 'fb_rate_3', description: 'it was okay'         }
                        ]
                    });
                    return;
                }

                // --- REPORT FLOW: keyword trigger ---
                if (messageText === 'report' && session.state === 'IDLE') {
                    session.state = 'REPORT_SAFETAG';
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: 'Please enter the @safetag of the user you want to report:' });
                    return;
                }

                // --- REPORT_SAFETAG state ---
                if (session.state === 'REPORT_SAFETAG') {
                    const reportedTag = messageText.startsWith('@') ? messageText : `@${messageText}`;
                    session.formData.report_safetag = reportedTag;
                    session.state = 'REPORT_REASON';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'BUTTONS',
                        title: '🚩 Report User',
                        text: 'What is the reason for this report?',
                        force_reply: true,
                        buttons: [
                            { text: 'Scam',        id: 'report_reason_scam',        description: 'Attempted or completed scam' },
                            { text: 'Fake Proof',  id: 'report_reason_fake_proof',  description: 'Submitted forged evidence' },
                            { text: 'Harassment',  id: 'report_reason_harassment',  description: 'Abusive or threatening behaviour' },
                            { text: 'Other',       id: 'report_reason_other',       description: 'Other policy violation' }
                        ]
                    });
                    return;
                }

                // --- REPORT_REASON state ---
                if (session.state === 'REPORT_REASON') {
                    const reasonMap: Record<string, string> = {
                        report_reason_scam:        'Scam',
                        report_reason_fake_proof:  'Fake Proof',
                        report_reason_harassment:  'Harassment',
                        report_reason_other:       'Other'
                    };
                    const reason = reasonMap[messageText];
                    if (!reason) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '⚠️ Please tap one of the reason buttons above.' });
                        return;
                    }
                    session.formData.report_reason = reason;
                    session.state = 'REPORT_DESCRIPTION';
                    await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: "Please briefly describe the issue (optional — type 'skip' to skip):" });
                    return;
                }

                // --- REPORT_DESCRIPTION state ---
                if (session.state === 'REPORT_DESCRIPTION') {
                    const description = messageText === 'skip' ? '' : body.message.text;
                    try {
                        await axios.post(`${API_URL}/reports`, {
                            reporter_safetag: safetag,
                            reported_safetag: session.formData.report_safetag,
                            reason: session.formData.report_reason,
                            description
                        }, { headers: BOT_AUTH_HEADERS });
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '✅ Report submitted. Our trust & safety team will review it within 24 hours.' });
                    } catch (err: any) {
                        if (err?.response?.data?.error === 'REPORT_ALREADY_SUBMITTED') {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: "You've already reported this user recently. Our team is reviewing it." });
                        } else {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Failed to submit report. Please try again.' });
                        }
                    }
                    resetSession(clientId);
                    return;
                }

                if (messageText.startsWith('leave_review_')) {
                    const txnId = messageText.replace('leave_review_', '');
                    try {
                        const txnRes = await axios.get(`${API_URL}/transactions/${txnId}`);
                        const t = txnRes.data;
                        const other = safetag === t.buyer.safetag ? t.seller.safetag : t.buyer.safetag;
                        session.state = 'REVIEW_RATING';
                        session.formData.review_txn_id = txnId;
                        session.formData.review_other = other;
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: '⭐ Leave a Review',
                            text: `Rate your experience with ${other}:`,
                            force_reply: true,
                            buttons: [
                                { text: '⭐⭐⭐⭐⭐ 5 Stars', id: 'review_5', description: 'Excellent', subtitle: 'Excellent' },
                                { text: '⭐⭐⭐⭐ 4 Stars', id: 'review_4', description: 'Good', subtitle: 'Good' },
                                { text: '⭐⭐⭐ 3 Stars', id: 'review_3', description: 'Average', subtitle: 'Average' }
                            ]
                        });
                    } catch (_) {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Could not start review.' });
                    }
                    return;
                }

                // Default Fallback
                await sendJivoChatMessage(clientId, chatId, {
                    type: 'TEXT',
                    text: 'Type "Menu" to see your available options.'
                });
            } catch (apiErr: any) {
                if (apiErr.response?.status === 404) {
                    const isPolicyAgreed = messageText.includes('agree') || messageText.includes('continue') || messageText.includes('okay') || messageText.includes('ok');
                    const isLoginSelect = messageText === 'login' || messageText.includes('🔐');
                    const isRegisterSelect = messageText === 'register' || messageText.includes('📝');

                    if (isLoginSelect || isRegisterSelect) {
                        const mode = isLoginSelect ? 'login' : 'register';
                        console.log(`[BOT STEP] 3: User ${clientId} selected ${mode}. Sending direct link.`);
                        
                        // Sign the apple_id + mode + expiry so it can't be replayed or forged
                        const exp = Date.now() + 5 * 60 * 1000; // 5 min
                        const secret = process.env.JIVO_TOKEN || process.env.BOT_API_SECRET || 'change-me';
                        const payload = `${clientId}:${mode}:${exp}`;
                        const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
                        const magicLink = `${FRONTEND_URL}/apple-auth?tok=${encodeURIComponent(payload)}&sig=${encodeURIComponent(sig)}`;
                        
                        // To trigger the 'Integrated Browser' (Safari View Controller) in iMessage,
                        // we send the URL as a standalone TEXT message. iOS will auto-expand this 
                        // into a Rich Link card which stays inside the chat.
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: magicLink
                        });
                    } else if (isPolicyAgreed) {
                        console.log(`[BOT STEP] 2: User ${clientId} agreed to policy. Sending Buttons.`);
                        
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: "🚀 Let's get you started",
                            text: 'Please select an option to secure your account:',
                            force_reply: true,
                            buttons: [
                                { text: '🔐 Login', id: 1 },
                                { text: '📝 Register', id: 2 }
                            ]
                        });
                    } else {
                        console.log(`[BOT STEP] 1: User ${clientId} is new. Sending Privacy Policy.`);

                        let statsLine = '';
                        try {
                            const statsRes = await axios.get(`${API_URL}/profiles/stats/public`);
                            const { total_users, total_completed_trades } = statsRes.data;
                            statsLine = `\n\n🌍 You've joined ${total_users.toLocaleString()} users who've safely completed ${total_completed_trades.toLocaleString()} trades on Safeeely.`;
                        } catch (_) {}

                        // Message 1: The Text Greeting
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `👋 Welcome to Safeeely!\nYour trusted escrow service for secure social media transactions.\n\nBefore we begin, please review our Privacy Policy.${statsLine}`
                        });

                        // Message 2: Standalone URL to trigger the integrated browser preview
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: 'https://safeeely.com/privacy'
                        });

                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: '👉 Reply with "Agree" to continue.'
                        });
                    }
                } else {
                    console.error(`⚠️ API Error (non-404): ${apiErr.message}`);
                }
            }
        } catch (err: any) {
            console.error('🔥 Error processing JivoChat webhook payload asynchronously:', err.message);
        }
    });
});

app.listen(PORT, () => {
    console.log(`🌐 JivoChat Apple Business Webhook listener on port ${PORT}`);
});
