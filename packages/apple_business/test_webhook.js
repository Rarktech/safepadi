const axios = require('axios');

async function testZendeskWebhook() {
    const WEBHOOK_URL = 'http://localhost:10003/webhook';

    // 1. Simulate a completely new user saying "hello" 
    // They should receive the Privacy Policy list picker.
    const newSessionPayload = {
        events: [
            {
                type: "conversation:message",
                payload: {
                    appUser: { _id: "apple_test_user_999" },
                    message: { type: "text", text: "hello" }
                }
            }
        ]
    };

    console.log("🚀 Simulating: NEW user says 'hi'");
    await axios.post(WEBHOOK_URL, newSessionPayload);
    
    console.log("\n⏳ Waiting 2 seconds...\n");
    await new Promise(r => setTimeout(r, 2000));

    // 2. Simulate the user agreeing to the policy via list picker
    // They should receive the Magic Link.
    const policyAgreePayload = {
        events: [
            {
                type: "conversation:message",
                payload: {
                    appUser: { _id: "apple_test_user_999" },
                    message: { type: "text", text: "I agree and continue" }
                }
            }
        ]
    };

    console.log("🚀 Simulating: NEW user agrees to policy");
    await axios.post(WEBHOOK_URL, policyAgreePayload);
}

testZendeskWebhook().catch(console.error);
