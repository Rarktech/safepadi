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

const JIVO_PROVIDER_ID = process.env.JIVO_PROVIDER_ID;
const JIVO_TOKEN = process.env.JIVO_TOKEN;

// Helper: Send Message to JivoChat Bot API
async function sendJivoChatMessage(clientId: string, chatId: string, messagePayload: any, siteId?: string) {
    if (!JIVO_PROVIDER_ID || !JIVO_TOKEN) {
        console.warn('⚠️ JivoChat credentials missing. Message logged to console only.');
        return;
    }

    try {
        const url = `https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`;
        const uuid = crypto.randomUUID();

        // Convert to Numbers (Jivo's internal processing often fails with strings in specific slots)
        const numericClientId = parseInt(clientId, 10);
        const numericChatId = parseInt(chatId, 10);
        const numericSiteId = siteId ? parseInt(siteId, 10) : undefined;

        const payload: any = {
            event: "BOT_MESSAGE",
            id: uuid,
            client_id: numericClientId || clientId, // Fallback to string if not numeric
            chat_id: numericChatId || chatId,
            message: messagePayload,
            sender: {
                id: numericClientId || clientId
            }
        };

        if (numericSiteId) {
            payload.site_id = numericSiteId;
        }

        console.log(`📤 [BOT REPLY] Sending structure to Chat ${chatId} (Site ${siteId})...`);

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ Message sent to JivoChat chat ${chatId}. Status: ${response.status}`);
    } catch (err: any) {
        console.error(`❌ Failed to send JivoChat message.`);
        console.error(`- Response Status:`, err.response?.status);
        console.error(`- Error Details:`, JSON.stringify(err.response?.data));
        console.error(`- Payload Sent:`, JSON.stringify(err.config?.data));
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
            let siteId: string | undefined = body.site_id;

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

            console.log(`💬 Message from [Client: ${clientId} | Chat: ${chatId}]: ${messageText}`);

            // 1. Check "I need help" (Human Escalation) => Transfer back to JivoChat Agent
            if (messageText === 'i need help' || messageText === 'agent' || messageText === 'support') {
                await sendJivoChatMessage(clientId, chatId, {
                    type: 'TEXT',
                    text: '⏸️ I have paused the bot. An agent has been notified and will review your request shortly.'
                }, siteId);

                if (JIVO_PROVIDER_ID && JIVO_TOKEN) {
                    try {
                        await axios.post(`https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`, {
                            event: "INVITE_AGENT",
                            id: crypto.randomUUID(),
                            client_id: clientId,
                            chat_id: chatId,
                            site_id: siteId
                        });
                    } catch(e) {}
                }
                return;
            }

            // 2. Check if user is registered via API (we use Jivo client_id as the platform_id)
            try {
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/apple/${clientId}`);
                const safetag = profileRes.data.safetag;

                if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('menu') || messageText.includes('start')) {
                    await sendJivoChatMessage(clientId, chatId, {
                        type: "TEXT",
                        text: `👋 Welcome back, ${safetag}!\n\nWhat would you like to do today?\nReply with an option number:\n\n1. 🛒 Create Transaction\n2. 📋 My Transactions\n3. 💰 Balance & Withdrawals\n4. 🎁 Referral\n5. ⭐ Reviews & Ratings\n6. ⚙️ Settings & Account`
                    }, siteId);
                } else {
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: 'Type "Menu" to see your available options.'
                    }, siteId);
                }
            } catch (apiErr: any) {
                if (apiErr.response?.status === 404) {
                    const isPolicyAgreed = messageText.includes('agree') || messageText.includes('continue') || messageText.includes('okay') || messageText.includes('ok');

                    if (isPolicyAgreed) {
                        console.log(`[BOT STEP] 2: User ${clientId} agreed to policy. Sending Magic Link.`);
                        const magicLink = `${FRONTEND_URL}/apple-auth?apple_id=${encodeURIComponent(clientId)}`;

                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: `🚀 Let's get started! Authenticate your account to continue by clicking the link below:\n\n${magicLink}\n\nSimply log in or register to complete your setup.`
                        }, siteId);
                    } else {
                        console.log(`[BOT STEP] 1: User ${clientId} is new. Sending Privacy Policy.`);
                        await sendJivoChatMessage(clientId, chatId, {
                            type: 'TEXT',
                            text: '👋 Welcome to Safeeely!\nYour trusted escrow service for secure social media transactions.\n\nBefore we begin, please review our Privacy Policy.\n\n👉 Reply with "Agree" to continue.'
                        }, siteId);
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
