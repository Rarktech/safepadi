import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const app = express();
app.use(express.json());

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const HUB_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'SAFEO_IG_123';
const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const VERSION = 'v18.0';

console.log(`📸 Safeeely Instagram Bot Starting...`);

// In-Memory State Machine (for Conversational Registration Flow)
const userStates: Record<string, any> = {};

// --- WEBHOOK VERIFICATION ---
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === HUB_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// --- HANDLE INCOMING MESSAGES ---
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        if (body.entry && body.entry.length > 0) {
            for (const entry of body.entry) {
                if (!entry.messaging) continue;
                
                for (const webhookEvent of entry.messaging) {
                    const senderPsid = webhookEvent.sender.id;

                    if (webhookEvent.message) {
                        await handleMessage(senderPsid, webhookEvent.message);
                    } else if (webhookEvent.postback) {
                        await handlePostback(senderPsid, webhookEvent.postback);
                    }
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

async function handleMessage(senderPsid: string, message: any) {
    const text = message.text?.toLowerCase().trim();
    if (!text) return;

    // Check if user is in an active conversational state
    const state = userStates[senderPsid];
    
    if (!state) {
        // STEP 1: Default Greeting
        if (text === 'hello' || text === 'hi' || text === 'start') {
            await sendInstagramMessage(senderPsid, {
                text: "👋 Welcome to Safeeely!\n\nYour trusted escrow service for secure social media transactions.\n\n🔒 Secure | 🌍 Cross-Platform | ⚡ Fast\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data: https://Safeeely.com/privacy",
                quick_replies: [
                    { content_type: "text", title: "✅ Agree & Continue", payload: "AGREE_POLICY" }
                ]
            });
        } else {
            // Unrecognized text outside flow
            await sendInstagramMessage(senderPsid, { text: "Say 'Hello' to get started!" });
        }
        return;
    }

    // --- REGISTRATION FLOW STATE MACHINE ---
    if (state.mode === 'REGISTER') {
        if (state.step === 'ASK_NAME') {
            state.formData.first_name = text;
            state.step = 'ASK_LAST_NAME';
            await sendInstagramMessage(senderPsid, { text: "📝 Step 2/5\nPlease enter your last name:" });
        } 
        else if (state.step === 'ASK_LAST_NAME') {
            state.formData.last_name = text;
            state.step = 'ASK_EMAIL';
            await sendInstagramMessage(senderPsid, { text: "📝 Step 3/5\nPlease enter your email address:" });
        }
        else if (state.step === 'ASK_EMAIL') {
            if (!text.includes('@')) {
                await sendInstagramMessage(senderPsid, { text: "❌ Invalid email. Please enter a valid email address:" });
                return;
            }
            state.formData.email = text;
            state.step = 'ASK_SAFETAG';
            await sendInstagramMessage(senderPsid, { text: "📝 Step 4/5\nPlease choose your Safetag (e.g. @john_doe):" });
        }
        else if (state.step === 'ASK_SAFETAG') {
            const safetag = text.startsWith('@') ? text : `@${text}`;
            state.formData.safetag = safetag;
            
            // In a full implementation, you would trigger the OTP via API here.
            state.step = 'VERIFY_OTP';
            await sendInstagramMessage(senderPsid, { text: `📧 Step 5/5\nWe've sent an OTP to ${state.formData.email}.\n\nPlease reply with the 6-digit code: (Enter 123456 to test)` });
        }
        else if (state.step === 'VERIFY_OTP') {
            if (text !== '123456') { // Mock OTP check
                await sendInstagramMessage(senderPsid, { text: "❌ Invalid OTP. Please try again (123456):" });
                return;
            }
            
            // Send Registration to API
            try {
                await axios.post(`${API_URL}/profiles/register`, {
                    first_name: state.formData.first_name,
                    last_name: state.formData.last_name,
                    email: state.formData.email,
                    safetag: state.formData.safetag,
                    primary_platform: 'instagram',
                    platform_id: senderPsid
                });
                
                await sendInstagramMessage(senderPsid, {
                    text: "🎉 Registration Complete!\n\n✅ You're all set!\n\n🏠 *Main Menu*\nWhat would you like to do today?",
                    quick_replies: [
                        { content_type: "text", title: "🛒 Create Txn", payload: "CREATE_TXN" },
                        { content_type: "text", title: "📋 My Txns", payload: "MY_TXNS" },
                        { content_type: "text", title: "⚙️ Profile", payload: "SETTINGS" }
                    ]
                });
                delete userStates[senderPsid]; // Clear state
            } catch (err: any) {
                await sendInstagramMessage(senderPsid, { text: `❌ Registration failed: ${err.message}` });
                delete userStates[senderPsid];
            }
        }
        return;
    }

    // --- QUICK REPLIES ROUTING ---
    // If the message contains a Quick Reply payload, it comes through as message.quick_reply.payload
    if (message.quick_reply) {
        await handlePostback(senderPsid, { payload: message.quick_reply.payload });
    }
}

async function handlePostback(senderPsid: string, postback: any) {
    const payload = postback.payload;

    if (payload === 'AGREE_POLICY') {
        await sendInstagramMessage(senderPsid, {
            text: "🚀 Let's get started!\n\nDo you already have a Safeeely account from another platform?",
            quick_replies: [
                { content_type: "text", title: "🆕 Register", payload: "CHOICE_REGISTER" },
                { content_type: "text", title: "🔗 Log In", payload: "CHOICE_LOGIN" }
            ]
        });
    } 
    else if (payload === 'CHOICE_REGISTER') {
        userStates[senderPsid] = { mode: 'REGISTER', step: 'ASK_NAME', formData: {} };
        await sendInstagramMessage(senderPsid, { text: "📝 Registration Step 1/5\n\nPlease enter your first name:" });
    }
    else if (payload === 'CHOICE_LOGIN') {
        // Can build login flow state machine here...
        await sendInstagramMessage(senderPsid, { text: "🔗 *Safeeely Login*\n\nPlease type your **Safetag** (e.g. @john_doe):" });
    }
}

async function sendInstagramMessage(recipientId: string, messagePayload: any) {
    try {
        await axios.post(
            `https://graph.facebook.com/${VERSION}/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`,
            {
                recipient: { id: recipientId },
                message: messagePayload
            }
        );
    } catch (err: any) {
        console.error('❌ Instagram API Error:', err.response?.data?.error?.message || err.message);
    }
}

const PORT = process.env.INSTAGRAM_PORT || 10002;
app.listen(PORT, () => {
    console.log(`📸 Instagram Webhook listener on port ${PORT}`);
});
