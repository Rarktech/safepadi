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
async function sendJivoChatMessage(clientId: string, chatId: string, messagePayload: any) {
    if (!JIVO_PROVIDER_ID || !JIVO_TOKEN) {
        console.warn('⚠️ JivoChat credentials missing. Message logged to console only.');
        console.log(`📤 [LOG ONLY] Chat: ${chatId}, Client: ${clientId}:`, JSON.stringify(messagePayload, null, 2));
        return;
    }

    try {
        const url = `https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`;
        const uuid = crypto.randomUUID(); // Strict UUID is required by JivoChat

        const payload = {
            event: "BOT_MESSAGE",
            id: uuid,
            client_id: clientId,
            chat_id: chatId,
            message: messagePayload
        };

        console.log(`📤 Sending payload to JivoChat asynchronously:`, JSON.stringify(payload, null, 2));

        await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Message sent to JivoChat chat ${chatId}`);
    } catch (err: any) {
        console.error(`❌ Failed to send JivoChat message:`, err.response?.data || err.message);
    }
}

// JivoChat Webhook Endpoint
app.post('/webhook/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Security check: Ignore if the token doesn't match
        if (JIVO_TOKEN && token !== JIVO_TOKEN) {
            console.warn(`⚠️ Blocked unauthorized webhook request with token: ${token}`);
            return res.status(403).send('Unauthorized');
        }

        const body = req.body;
        console.log(`\n🔔 [Webhook Received] Event: ${body.event}`);
        console.log(JSON.stringify(body, null, 2));
        
        let clientId: string | undefined;
        let chatId: string | undefined;
        let messageText: string | undefined;

        // Parse JivoChat CLIENT_MESSAGE
        if (body.event === 'CLIENT_MESSAGE' && body.message) {
            clientId = body.client_id;
            chatId = body.chat_id;
            messageText = body.message.text?.toLowerCase().trim();
        } 
        // We can safely ignore other events like AGENT_JOINED etc for simple bot functionality.
        else {
            return res.status(200).send();
        }

        if (!clientId || !chatId || !messageText) {
            return res.status(200).send();
        }

        console.log(`💬 Message from [Client: ${clientId} | Chat: ${chatId}]: ${messageText}`);

        // 1. Check "I need help" (Human Escalation) => Transfer back to JivoChat Agent
        if (messageText === 'i need help' || messageText === 'agent' || messageText === 'support') {
            
            // But let's send a polite text first:
            await sendJivoChatMessage(clientId, chatId, {
                type: 'TEXT',
                text: '⏸️ I have paused the bot. An agent has been notified and will review your request shortly.',
                timestamp: Math.floor(Date.now() / 1000)
            });

            // Hand off to JivoChat human
            if (JIVO_PROVIDER_ID && JIVO_TOKEN) {
                try {
                    await axios.post(`https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`, {
                        event: "INVITE_AGENT",
                        id: crypto.randomUUID(),
                        client_id: clientId,
                        chat_id: chatId
                    });
                } catch(e) {}
            }

            return res.status(200).send();
        }

        // 2. Check if user is registered via API (we use Jivo client_id as the platform_id)
        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/apple/${clientId}`);
            const safetag = profileRes.data.safetag;

            // User is fully authenticated, permanently remembered!
            if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('menu') || messageText.includes('start')) {
                await sendJivoChatMessage(clientId, chatId, {
                    type: "TEXT",
                    text: `👋 Welcome back, ${safetag}!\n\nWhat would you like to do today?\nReply with an option number:\n\n1. 🛒 Create Transaction\n2. 📋 My Transactions\n3. 💰 Balance & Withdrawals\n4. 🎁 Referral\n5. ⭐ Reviews & Ratings\n6. ⚙️ Settings & Account`,
                    timestamp: Math.floor(Date.now() / 1000)
                });
            } else {
                await sendJivoChatMessage(clientId, chatId, {
                    type: 'TEXT',
                    text: 'Type "Menu" to see your available options.',
                    timestamp: Math.floor(Date.now() / 1000)
                });
            }

        } catch (apiErr: any) {
            // User not found (404) -> They are NEW or Unlinked
            if (apiErr.response?.status === 404) {
                
                const isPolicyAgreed = messageText.includes('agree') || messageText.includes('continue');

                if (isPolicyAgreed) {
                    // STEP 2: User Agreed to Policy -> Send Magic Link using MARKDOWN type
                    console.log(`✅ User ${clientId} agreed to policy. Sending Magic Link.`);
                    const magicLink = `${FRONTEND_URL}/apple-auth?apple_id=${encodeURIComponent(clientId)}`;

                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'MARKDOWN',
                        content: '🚀 Let\'s get started! Authenticate your account to continue.',
                        text: `🚀 Let's get started! Authenticate your account to continue:\n[Sign In / Register](${magicLink})`,
                        timestamp: Math.floor(Date.now() / 1000)
                    });
                } else {
                    // STEP 1: Initial greeting -> Require Privacy Policy
                    console.log(`⚠️ User ${clientId} is new. Sending Privacy Policy.`);
                    await sendJivoChatMessage(clientId, chatId, {
                        type: 'TEXT',
                        text: '👋 Welcome to Safeeely!\nYour trusted escrow service for secure social media transactions.\n\nBefore we begin, please review our Privacy Policy.\n\n👉 Reply with "Agree" to continue.',
                        timestamp: Math.floor(Date.now() / 1000)
                    });
                }
            } else {
                console.error(`API Error: ${apiErr.message}`);
                
                // Fallback for API offline 
                await sendJivoChatMessage(clientId, chatId, {
                   type: 'TEXT',
                   text: 'Sorry, the service is currently experiencing issues. Please try again later.',
                   timestamp: Math.floor(Date.now() / 1000)
                });
            }
        }

        res.status(200).send();
    } catch (err: any) {
        console.error('🔥 Error parsing JivoChat webhook:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`🌐 JivoChat Apple Business Webhook listener on port ${PORT}`);
});
