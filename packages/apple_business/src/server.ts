import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Handle Environment Variables relative to the root .env
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const app = express();
app.use(express.json());

const PORT = process.env.APPLE_PORT || 10003;
const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
// The frontend URL where the Magic Link modal will be hosted
const FRONTEND_URL = process.env.REVIEWS_URL || 'http://localhost:3001';

console.log(`🚀 Safeeely Apple Messages for Business Bot (via JivoChat) Starting...`);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('JivoChat Apple Business Bot is Healthy');
});

// --- SESSION MANAGEMENT ---
interface UserState {
    state: 'IDLE' | 'ROLE_SELECTION' | 'PRODUCT_NAME' | 'PRODUCT_DESCRIPTION' | 'ATTACHMENTS' | 'CURRENCY_SELECTION' | 'PRICE_INPUT' | 'FEE_ALLOCATION' | 'COUNTERPARTY_SAFETAG' | 'CONFIRMATION';
    formData: {
        role?: 'buyer' | 'seller';
        product_name?: string;
        description?: string;
        amount?: number;
        currency?: string;
        fee_allocation?: 'buyer' | 'seller' | 'split';
        other_safetag?: string;
        other_id?: string;
        other_rating?: string;
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
    
    // Security check: Ignore if the token doesn't match
    if (JIVO_TOKEN && token !== JIVO_TOKEN) {
        console.warn(`⚠️ Blocked unauthorized webhook request with token: ${token}`);
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
                const session = getSession(clientId);
                const safetag = profileRes.data.safetag;

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
                            { text: '🛒 Create Transaction', description: 'Start a new secure escrow order', id: 1 },
                            { text: '📋 My Transactions', description: 'View your active and past orders', id: 2 },
                            { text: '💰 Balance & Withdrawals', description: 'Check funds and cash out', id: 3 },
                            { text: '🎁 Referrals', description: 'Invite friends and earn rewards', id: 4 },
                            { text: '⭐ Reviews & Ratings', description: 'View your feedback and score', id: 5 },
                            { text: '⚙️ Settings & Profile', description: 'Manage your account details', id: 6 }
                        ]
                    });
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
                            { text: '1️⃣ I am a buyer', title: 'I am a buyer', description: 'I want to pay for a product/service', id: 'role_buyer' },
                            { text: '2️⃣ I am a seller', title: 'I am a seller', description: 'I want to receive payment for an item', id: 'role_seller' }
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

                // Step 5: Currency -> Step 6: Amount
                if (session.state === 'CURRENCY_SELECTION') {
                    session.formData.currency = messageText.includes('ngn') ? 'NGN' : (messageText.includes('usdt') ? 'USDT' : 'USD');
                    session.state = 'PRICE_INPUT';
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: `🛒 Step 5/8: Amount\n\n💰 How much is the price?\n\nEnter the amount in ${session.formData.currency}:`
                    });
                    return;
                }

                // Step 6: Amount -> Step 7: Fee Allocation
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
                        title: '🛒 Step 6/8: Fee Allocation',
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

                // Step 7: Fee Allocation -> Step 8: Counterparty Safetag
                if (session.state === 'FEE_ALLOCATION') {
                    session.formData.fee_allocation = messageText.includes('buyer') ? 'buyer' : (messageText.includes('split') ? 'split' : 'seller');
                    session.state = 'COUNTERPARTY_SAFETAG';
                    const role = session.formData.role;
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: `👤 Step 7/8: Counterparty\n\nEnter the ${role === 'buyer' ? 'seller' : 'buyer'}'s Safetag (e.g., @user_123):`
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

                        // 1. Text Summary
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `👤 Counterparty Found: ${res.data.safetag}\nStatus: ${verifiedLabel}\n\nReviewing their reputation before we proceed:`
                        });

                        // 2. Standalone Profile Preview Link (Integrated Browser trigger)
                        const profileLink = `${FRONTEND_URL}/reviews/${encodeURIComponent(res.data.safetag)}?viewer=${encodeURIComponent(safetag)}`;
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: profileLink
                        });

                        // 3. Review & Confirm Buttons
                        const { product_name, description, amount, currency, fee_allocation } = session.formData;
                        const fee = amount! * 0.05;
                        const total = fee_allocation === 'buyer' ? amount! + fee : (fee_allocation === 'split' ? amount! + (fee / 2) : amount!);

                        session.state = 'CONFIRMATION';
                        const summary = `📋 Transaction Summary\n\n🛒 Product: ${product_name}\n📝 Description: ${description}\n💰 Amount: ${amount} ${currency}\n💵 Fee: ${fee.toFixed(2)} ${currency} (${fee_allocation})\n💳 Total: ${total.toFixed(2)} ${currency}\n👤 ${role === 'buyer' ? 'Seller' : 'Buyer'}: ${otherTag}`;

                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'BUTTONS',
                            title: '📋 Step 8/8: Review & Confirm',
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

                // Step 7: Finalize
                if (session.state === 'CONFIRMATION') {
                    if (messageText.includes('confirm')) {
                        try {
                            const { role, product_name, description, amount, currency, fee_allocation, other_safetag } = session.formData;
                            const payload = {
                                buyer_safetag: role === 'buyer' ? safetag : other_safetag,
                                seller_safetag: role === 'seller' ? safetag : other_safetag,
                                product_name,
                                description,
                                amount,
                                currency,
                                fee_allocation,
                                initiator_safetag: safetag
                            };

                            const res = await axios.post(`${API_URL}/transactions/create`, payload);
                            const txnCode = res.data.txn_code;

                            await sendJivoChatMessage(clientId, chatId, {
                                type: 'TEXT',
                                text: `✅ *Transaction Created!*\n\nYour transaction has been sent to the ${role === 'buyer' ? 'seller' : 'buyer'}.\n\n📋 Transaction ID: ${txnCode}\n💰 Amount: ${amount} ${currency}\n\nYou'll be notified of any updates.`
                            });
                            
                            // Rich Link
                            const txnLink = `${FRONTEND_URL}/transactions/${res.data.id}`;
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: txnLink });

                            resetSession(clientId);
                        } catch (err: any) {
                            await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: `❌ Error creating transaction: ${err.response?.data?.error || err.message}` });
                            resetSession(clientId);
                        }
                    } else {
                        await sendJivoChatMessage(clientId, chatId, { type: 'TEXT', text: '❌ Transaction cancelled.' });
                        resetSession(clientId);
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
                        
                        const magicLink = `${FRONTEND_URL}/apple-auth?apple_id=${encodeURIComponent(clientId)}&mode=${mode}`;
                        
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
                        
                        // Message 1: The Text Greeting
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: '👋 Welcome to Safeeely!\nYour trusted escrow service for secure social media transactions.\n\nBefore we begin, please review our Privacy Policy.'
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
