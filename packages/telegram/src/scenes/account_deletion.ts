
import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';

export const accountDeletionScene = new Scenes.WizardScene(
    'account_deletion_wizard',
    // Step 0: Information & Confirmation
    async (ctx: any) => {
        await ctx.reply(
            '⚠️ <b>Account Deletion</b>\n\n' +
            'By deleting your account:\n' +
            '• Your personal details (name, email) will be removed.\n' +
            '• All linked social media accounts will be unlinked.\n' +
            '• Your payout methods will be deleted.\n\n' +
            '<b>Note:</b> Your transaction history will remain on the platform for record-keeping and dispute resolution purposes, but it will no longer be associated with your personal identity.\n\n' +
            'Are you sure you want to proceed?',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Yes, Delete My Account', callback_data: 'confirm_delete' }],
                        [{ text: '🔙 Cancel', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
        return ctx.wizard.next();
    },
    // Step 1: Feedback
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'confirm_delete') {
            await ctx.answerCbQuery();
            await ctx.reply(
                '👋 <b>We\'re sorry to see you go.</b>\n\n' +
                'Before we finalize this, could you please tell us why you\'re leaving? (Or type "skip")',
                { parse_mode: 'HTML' }
            );
            return ctx.wizard.next();
        }
        // If they click cancel or anything else, handled by the common cancel logic or main menu action
        return ctx.scene.leave();
    },
    // Step 2: Finalize
    async (ctx: any) => {
        const feedback = ctx.message?.text;
        const reason = (feedback && feedback.toLowerCase() !== 'skip') ? feedback : 'No feedback provided';
        
        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from.id}`);
            const safetag = profileRes.data.safetag;

            await ctx.reply('⏳ Deleting your account and personal data...');
            
            await axios.post(`${API_URL}/profiles/${encodeURIComponent(safetag)}/deactivate`, {
                reason
            });

            await ctx.reply(
                '✅ <b>Account Deleted Successfully</b>\n\n' +
                'Your personal data has been removed. You have been logged out.\n\n' +
                'Thank you for using Safeeely.',
                { parse_mode: 'HTML' }
            );
            return ctx.scene.leave();
        } catch (err: any) {
            console.error('Deletion Wizard Error:', err.message);
            await ctx.reply('❌ An error occurred during account deletion. Please contact support if the issue persists.');
            return ctx.scene.leave();
        }
    }
);
