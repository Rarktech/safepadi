import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { FlowCrypto } from './utils/crypto';

// Handle Environment Variables
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const app = express();
app.use(express.json());

// Load Configurations
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const HUB_VERIFY_TOKEN = process.env.HUB_VERIFY_TOKEN || 'SAFEO_VERIFY_123';
const VERSION = 'v17.0';
const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';

// Security Initialization (RSA Private Key for Flows)
const PRIVATE_KEY_PATH = path.resolve(__dirname, '../private.pem');
let flowCrypto: FlowCrypto | null = null;
try {
    if (fs.existsSync(PRIVATE_KEY_PATH)) {
        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
        flowCrypto = new FlowCrypto(privateKey);
        console.log('🛡️ WhatsApp Flow Security Initialized (RSA Private Key loaded)');
    } else {
        console.warn('⚠️ Private key not found at path:', PRIVATE_KEY_PATH);
    }
} catch (e: any) {
    console.error('❌ Failed to initialize Flow Security:', e.message);
}

console.log(`🚀 Safeeely WhatsApp Bot Starting...`);

// --- 🔒 WHATSAPP FLOWS DATA EXCHANGE ENDPOINT (High Security) ---
app.post('/flow', async (req, res) => {
    if (!flowCrypto) {
        return res.status(500).json({ error: 'Flow security not initialized' });
    }

    try {
        const { encrypted_payload, initial_vector, encrypted_aes_key } = req.body;
        
        // 1. Decrypt Meta's request
        const { data, aesKey, initialVector } = flowCrypto.decryptRequest(
            encrypted_payload,
            initial_vector,
            encrypted_aes_key
        );

        console.log('🧊 Decrypted Flow Action:', data.action);
        let responsePayload: any = {};

        // 2. Route based on "action" inside the flow
        switch (data.action) {
            case 'ping':
                responsePayload = { data: { status: 'healthy' } };
                break;

            case 'send_otp':
                // Send user to the OTP Screen
                responsePayload = {
                    screen: 'OTP_SCREEN',
                    data: {
                        display_email: data.email
                    }
                };
                break;

            case 'complete_registration':
                const otp = data.otp_code;
                if (otp !== '123456') {
                    // Send them back to OTP screen with an error
                    responsePayload = {
                        screen: 'OTP_SCREEN',
                        data: {
                            display_email: "❌ INCORRECT OTP. Try 123456"
                        }
                    };
                } else {
                    const safetag = data.safetag.startsWith('@') ? data.safetag : `@${data.safetag}`;
                    const phone_number = data.flow_token.split('_')[2]; // Passed via flow_token

                    // 1. Create Profile in API
                    try {
                        await axios.post(`${API_URL}/profiles/register`, {
                            first_name: data.first_name,
                            last_name: data.last_name,
                            email: data.email,
                            safetag,
                            primary_platform: 'whatsapp',
                            platform_id: phone_number
                        });
                    } catch(err: any) {
                        console.error('Registration failed:', err.message);
                    }

                    // 2. Shut down the Meta Modal
                    responsePayload = {
                        data: {
                            extension_message_response: {
                                params: {
                                    flow_token: data.flow_token,
                                    result: "success"
                                }
                            }
                        }
                    };

                    // 3. Send the traditional Main Menu directly into chat!
                    if (phone_number) {
                        setTimeout(() => {
                            sendWhatsAppMessage(phone_number, {
                                type: "interactive",
                                interactive: {
                                    type: "button",
                                    header: { type: "text", text: "🎉 Registration Complete!" },
                                    body: { text: "✅ You're all set!\n\nYour Safeeely account is secure and ready to use.\n\n🏠 *Main Menu*\nWhat would you like to do today?" },
                                    action: {
                                        buttons: [
                                            { type: "reply", reply: { id: "CREATE_TXN", title: "🛒 Create Txn" } },
                                            { type: "reply", reply: { id: "MY_TXNS", title: "📋 My Txns" } },
                                            { type: "reply", reply: { id: "SETTINGS", title: "⚙️ Profile" } }
                                        ]
                                    }
                                }
                            });
                        }, 1500); // 1.5s delay feels very natural
                    }
                }
                break;

            case 'lookup_user':
                const otherTag = data.other_safetag.startsWith('@') ? data.other_safetag : `@${data.other_safetag}`;
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(otherTag)}`);
                    const p = profileRes.data;
                    
                    // Fetch real-time rating info
                    let ratingStr = 'No reviews yet';
                    try {
                        const statsRes = await axios.get(`${API_URL}/reviews/stats/${p.safetag}`);
                        if (statsRes.data.review_count > 0) {
                            ratingStr = `${statsRes.data.average_rating.toFixed(1)}/5 Stars (${statsRes.data.review_count} reviews)`;
                        }
                    } catch (e) {}

                    responsePayload = {
                        screen: 'TRANSACTION_SCREEN_2_LOOKUP',
                        data: {
                            profile_card: `${p.safetag}`,
                            rating: ratingStr,
                            safetag: p.safetag.replace('@', '')
                        }
                    };
                } catch (err: any) {
                    responsePayload = {
                        screen: 'TRANSACTION_SCREEN_1_INPUTS',
                        data: {
                            other_safetag: { error: '❌ Safetag not found.' }
                        }
                    };
                }
                break;

            case 'view_summary':
                // Calculate Fee & Total
                const amount = parseFloat(data.amount);
                const feePercent = 0.05;
                const fee = amount * feePercent;
                const allocation = data.who_pays_fee;
                const total = allocation === 'buyer' ? amount + fee : (allocation === 'split' ? amount + (fee / 2) : amount);
                
                const summary = `📋 *Order Summary*\n\n🛒 *Product*: ${data.product_name}\n📝 *Description*: ${data.description}\n💰 *Price*: ${amount} ${data.currency}\n💵 *Escrow Fee*: ${fee.toFixed(2)} ${data.currency} (${allocation})\n👤 *Counterparty*: ${data.other_safetag}`;

                responsePayload = {
                    screen: 'TRANSACTION_SCREEN_3_SUMMARY',
                    data: {
                        summary_text: summary,
                        total_amount: `${total.toFixed(2)} ${data.currency}`
                    }
                };
                break;

            case 'create_transaction':
                // FINAL SUBMISSION LOGIC
                // In production: Call API_URL/transactions/create and return transaction code
                responsePayload = {
                    data: {
                        extension_message_response: {
                            params: {
                                flow_token: data.flow_token,
                                result: "success"
                            }
                        }
                    }
                };
                break;

            default:
                responsePayload = { data: { status: 'unknown' } };
        }

        // 3. Encrypt response back to Meta
        const encryptedResponse = flowCrypto.encryptResponse(responsePayload, aesKey, initialVector);
        res.status(200).send(encryptedResponse);

    } catch (err: any) {
        console.error('🔥 Flow Processing Error:', err.message);
        res.status(500).send('Error');
    }
});

// --- STANDARD WEBHOOK (GET Verification) ---
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

// --- STANDARD WEBHOOK (POST Messages) ---
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        
        if (body.object === 'whatsapp_business_account' && body.entry && body.entry[0].changes) {
            const changes = body.entry[0].changes[0].value;
            
            // Handle Message Replies & Text
            if (changes.messages && changes.messages.length > 0) {
                const message = changes.messages[0];
                const from = message.from;
                const msgType = message.type;
                
                let textBody = '';
                let interactiveId = '';

                if (msgType === 'text') {
                    textBody = message.text.body.toLowerCase();
                } else if (msgType === 'interactive') {
                    if (message.interactive.type === 'button_reply') {
                        interactiveId = message.interactive.button_reply.id;
                    }
                }

                console.log(`📩 WhatsApp Message from ${from}: [Text:${textBody}] [Interactive:${interactiveId}]`);

                // STEP 1: Hello / Start
                if (textBody === 'hello' || textBody === 'hi' || textBody === 'start') {
                    await sendWhatsAppMessage(from, {
                        type: "interactive",
                        interactive: {
                            type: "button",
                            header: { type: "text", text: "👋 Welcome to Safeeely!" },
                            body: { text: "Your trusted escrow service for secure social media transactions.\n\n🔒 Secure | 🌍 Cross-Platform | ⚡ Fast\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data: https://Safeeely.com/privacy" },
                            action: {
                                buttons: [
                                    { type: "reply", reply: { id: "AGREE_POLICY", title: "✅ Agree & Continue" } }
                                ]
                            }
                        }
                    });
                }
                
                // STEP 2: Policy Agreed -> Ask for Login vs Register
                else if (interactiveId === 'AGREE_POLICY') {
                    await sendWhatsAppMessage(from, {
                        type: "interactive",
                        interactive: {
                            type: "button",
                            body: { text: "🚀 *Let's get started!*\n\nDo you already have a Safeeely account from another social media (e.g. Discord)?" },
                            action: {
                                buttons: [
                                    { type: "reply", reply: { id: "CHOICE_REGISTER", title: "🆕 Register" } },
                                    { type: "reply", reply: { id: "CHOICE_LOGIN", title: "🔗 Log In" } }
                                ]
                            }
                        }
                    });
                }
                
                // STEP 3: Wants to Register -> Send The Flow!
                else if (interactiveId === 'CHOICE_REGISTER') {
                    // Send Flow Message
                    await sendWhatsAppMessage(from, {
                        type: "interactive",
                        interactive: {
                            type: "flow",
                            header: { type: "text", text: "Safeeely Registration" },
                            body: { text: "Please click below to securely register your account." },
                            footer: { text: "End-to-end encrypted" },
                            action: {
                                name: "flow",
                                parameters: {
                                    flow_message_version: "3",
                                    flow_token: `reg_session_${from}`, /* Securely passes phone number into the flow session */
                                    flow_id: process.env.REGISTRATION_FLOW_ID || "PLACEHOLDER_ID",
                                    flow_cta: "Open Form",
                                    flow_action: "navigate",
                                    flow_action_payload: {
                                        screen: "REGISTRATION_SCREEN"
                                    }
                                }
                            }
                        }
                    });
                }

                // STEP 3B: Wants to Login -> Ask for Safetag natively
                else if (interactiveId === 'CHOICE_LOGIN') {
                    await sendWhatsAppMessage(from, {
                        type: "text",
                        text: "🔗 *Safeeely Login*\n\nPlease type your **Safetag** (e.g. @john_doe):"
                    });
                    // Here you would capture their next text message as their Safetag and send the OTP.
                }

            }
        }
        res.sendStatus(200);
    } catch (error: any) {
        console.error('🔥 POST Webhook Error:', error.response?.data || error.message);
        res.sendStatus(200);
    }
});

async function sendWhatsAppMessage(to: string, payload: any) {
    try {
        await axios.post(`https://graph.facebook.com/${VERSION}/${process.env.PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            ...payload
        }, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
        });
    } catch (err: any) {
        console.error('❌ Meta API Error:', err.response?.data || err.message);
    }
}

const PORT = process.env.WHATSAPP_PORT || 10001;
app.listen(PORT, () => {
    console.log(`🌐 WhatsApp Webhook listener on port ${PORT}`);
});
