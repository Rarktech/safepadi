import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

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

console.log(`🚀 Safeeely Apple Messages for Business Bot Starting...`);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Apple Business Chat Bot is Healthy');
});

const ZENDESK_APP_ID = process.env.ZENDESK_APP_ID;
const ZENDESK_KEY_ID = process.env.ZENDESK_KEY_ID;
const ZENDESK_SECRET = process.env.ZENDESK_SECRET;

// Helper: Send Message to Zendesk Sunshine API
async function sendZendeskMessage(appUserId: string, messagePayload: any) {
    if (!ZENDESK_APP_ID || !ZENDESK_KEY_ID || !ZENDESK_SECRET) {
        console.warn('⚠️ Zendesk credentials missing. Message logged to console only.');
        console.log(`📤 [LOG ONLY] User: ${appUserId}:`, JSON.stringify(messagePayload, null, 2));
        return;
    }

    try {
        const auth = Buffer.from(`${ZENDESK_KEY_ID}:${ZENDESK_SECRET}`).toString('base64');
        const url = `https://api.smooch.io/v1.1/apps/${ZENDESK_APP_ID}/appusers/${appUserId}/messages`;

        await axios.post(url, {
            author: { type: 'business' },
            ...messagePayload
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Message sent to user ${appUserId}`);
    } catch (err: any) {
        console.error(`❌ Failed to send Zendesk message:`, err.response?.data || err.message);
    }
}

// Zendesk Webhook Endpoint
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        
        let appUserId: string | undefined;
        let messageText: string | undefined;

        // 1. Check for standard Zendesk Messaging Event (The ones in your screenshot)
        if (body.event && body.event.message) {
            appUserId = body.event.message.author_id;
            messageText = body.event.message.content?.text?.toLowerCase().trim();
        } 
        // 2. Fallback for Sunshine Conversations (Smooch) or our local test script
        else if (body.events?.[0]) {
            const ev = body.events[0];
            appUserId = ev.payload?.appUser?._id;
            messageText = ev.payload?.message?.text?.toLowerCase().trim();
        }

        if (!appUserId || !messageText) {
            return res.status(200).send();
        }

        console.log(`💬 Message from [${appUserId}]: ${messageText}`);

        // 2. Check "I need help" (Human Escalation)
        if (messageText === 'i need help' || messageText === 'agent' || messageText === 'support') {
            await sendZendeskMessage(appUserId, {
                type: 'text',
                text: '⏸️ I have paused the bot. An agent has been notified and will review your request shortly.'
            });
            return res.status(200).send();
        }

        // 3. Check if user is registered via API
        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/apple/${appUserId}`);
            const safetag = profileRes.data.safetag;

            // User is fully authenticated, permanently remembered!
            if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('menu')) {
                await sendZendeskMessage(appUserId, {
                    type: "text",
                    text: `👋 Welcome back, ${safetag}!\n\nWhat would you like to do today?`,
                    actions: [
                        { type: "reply", text: "🛒 Create Transaction", payload: "MENU_CREATE" },
                        { type: "reply", text: "📋 My Transactions", payload: "MENU_TXNS" },
                        { type: "reply", text: "💰 Balance & Withdrawals", payload: "MENU_BALANCE" },
                        { type: "reply", text: "🎁 Referral", payload: "MENU_REFERRAL" },
                        { type: "reply", text: "⭐ Reviews & Ratings", payload: "MENU_REVIEWS" },
                        { type: "reply", text: "⚙️ Settings & Account", payload: "MENU_SETTINGS" }
                    ]
                });
            } else {
                await sendZendeskMessage(appUserId, {
                    type: 'text',
                    text: 'Type "Menu" to see your available options.'
                });
            }

        } catch (apiErr: any) {
            // User not found (404) -> They are NEW or Unlinked
            if (apiErr.response?.status === 404) {
                
                const isPolicyAgreed = messageText.includes('agree') || messageText.includes('continue');

                if (isPolicyAgreed) {
                    // STEP 2: User Agreed to Policy -> Send Magic Link
                    console.log(`✅ User ${appUserId} agreed to policy. Sending Magic Link.`);
                    const magicLink = `${FRONTEND_URL}/apple-auth?apple_id=${encodeURIComponent(appUserId)}`;

                    await sendZendeskMessage(appUserId, {
                        type: 'text',
                        text: '🚀 Let\'s get started! Authenticate your account to continue.',
                        actions: [
                            { type: "link", text: "🔗 Sign In / Register", uri: magicLink }
                        ]
                    });
                } else {
                    // STEP 1: Initial greeting -> Require Privacy Policy
                    console.log(`⚠️ User ${appUserId} is new. Sending Privacy Policy.`);
                    await sendZendeskMessage(appUserId, {
                        type: 'text',
                        text: '👋 Welcome to Safeeely! Your trusted escrow service for secure social media transactions.\n\nBefore we begin, please review and agree to our Privacy Policy.',
                        actions: [
                            { type: "reply", text: "✅ I Agree & Continue", payload: "AGREE_POLICY" }
                        ]
                    });
                }
            } else {
                console.error(`API Error: ${apiErr.message}`);
            }
        }

        res.status(200).send();
    } catch (err: any) {
        console.error('🔥 Error parsing Zendesk webhook:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Apple Business Webhook listener on port ${PORT}`);
});
