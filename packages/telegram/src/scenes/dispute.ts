import { Scenes } from 'telegraf';
import axios from 'axios';
import { buildMagicLink } from '../utils/magicLink';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';

const CATEGORY_KEYBOARD = {
    inline_keyboard: [
        [{ text: '📦 Not Delivered', callback_data: 'dispute_cat_NOT_DELIVERED' }],
        [{ text: '🔍 Not As Described', callback_data: 'dispute_cat_NOT_AS_DESCRIBED' }],
        [{ text: '🔑 Credentials / Access Issue', callback_data: 'dispute_cat_CREDENTIALS_ACCESS' }],
        [{ text: '🔧 Service Incomplete', callback_data: 'dispute_cat_SERVICE_INCOMPLETE' }],
        [{ text: '💳 Payment Issue', callback_data: 'dispute_cat_PAYMENT_ISSUE' }],
        [{ text: '❓ Other', callback_data: 'dispute_cat_OTHER' }]
    ]
};

export const disputeScene = new Scenes.WizardScene(
    'dispute_wizard',
    // Step 0 — show category picker
    async (ctx: any) => {
        const state = ctx.scene.session.state as any;
        ctx.wizard.state.txnId = state.txnId;

        await ctx.reply('⚠️ <b>Raise Dispute — Step 1 of 2</b>\n\nPlease select the category that best describes your issue:', {
            parse_mode: 'HTML',
            reply_markup: CATEGORY_KEYBOARD
        });
        return ctx.wizard.next();
    },
    // Step 1 — capture category, prompt for reason
    async (ctx: any) => {
        if (!ctx.callbackQuery || !ctx.callbackQuery.data?.startsWith('dispute_cat_')) {
            await ctx.reply('⚠️ Please tap one of the category buttons above.', {
                reply_markup: CATEGORY_KEYBOARD
            });
            return;
        }
        ctx.wizard.state.category = ctx.callbackQuery.data.replace('dispute_cat_', '');
        await ctx.answerCbQuery();

        await ctx.reply('✏️ <b>Step 2 of 2: Describe the Issue</b>\n\nTo help us and the other party understand the issue, please reply with the reason for this dispute:\n\n<i>(e.g., "The item was not delivered", "The account credentials did not work")</i>', {
            parse_mode: 'HTML'
        });
        return ctx.wizard.next();
    },
    // Step 2 — validate reason and submit
    async (ctx: any) => {
        const reason = ctx.message?.text;
        const txnId = ctx.wizard.state.txnId;
        const category = ctx.wizard.state.category;

        if (!reason || reason.length < 10) {
            ctx.reply('❌ Please provide a more detailed reason (at least 10 characters).');
            return;
        }

        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from.id}`);
            const profile = profileRes.data;

            await axios.post(`${API_URL}/disputes/raise`, {
                transaction_id: txnId,
                raised_by: profile.id,
                reason: reason,
                category: category
            });

            const disputeUrl = await buildMagicLink({ platform_id: String(ctx.from.id), scope: 'dispute', txn_id: txnId, fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(profile.safetag)}?view=dispute_details&txnId=${txnId}` });
            ctx.reply('✅ <b>Dispute Raised Successfully</b>\n\nThe transaction has been frozen. You can view the status and provide further evidence on your Safeeely Web Dashboard.', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👁️ View Dispute Details', url: disputeUrl }],
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
