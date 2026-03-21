import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';

export const disputeScene = new Scenes.WizardScene(
    'dispute_wizard',
    async (ctx: any) => {
        const state = ctx.scene.session.state as any;
        ctx.wizard.state.txnId = state.txnId;

        ctx.reply('⚠️ <b>Initiate a Dispute</b>\n\nTo help us and the other party understand the issue, please reply with the reason for this dispute:\n\n<i>(e.g., "The item was not delivered", "The account credentials did not work")</i>', { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    async (ctx: any) => {
        const reason = ctx.message.text;
        const txnId = ctx.wizard.state.txnId;

        if (reason.length < 10) {
            ctx.reply('❌ Please provide a more detailed reason (at least 10 characters).');
            return;
        }

        try {
            // Get user profile to know who is raising it
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from.id}`);
            const profile = profileRes.data;

            // Call the raise dispute endpoint
            await axios.post(`${API_URL}/disputes/raise`, {
                transaction_id: txnId,
                raised_by: profile.id,
                reason: reason
            });

            ctx.reply('✅ <b>Dispute Raised Successfully</b>\n\nThe transaction has been frozen. You can view the status and provide further evidence on your Safeeely Web Dashboard.', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👁️ View Dispute Details', url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(profile.safetag)}?view=dispute_details&txnId=${txnId}` }],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            });

            return ctx.scene.leave();
        } catch (err: any) {
            console.error('Raise dispute error:', err.message);
            ctx.reply(`❌ Failed to raise dispute: ${err.response?.data?.error || err.message}`);
            return ctx.scene.leave();
        }
    }
);
