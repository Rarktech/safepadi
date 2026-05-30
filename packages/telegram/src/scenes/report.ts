import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';

const BOT_AUTH_HEADERS = process.env.BOT_API_SECRET
    ? { 'Authorization': `Bearer ${process.env.BOT_API_SECRET}`, 'x-bot-platform': 'telegram' }
    : {};

const REASON_KEYBOARD = {
    inline_keyboard: [
        [{ text: '🚨 Scam', callback_data: 'report_reason_Scam' }, { text: '🖼️ Fake Proof', callback_data: 'report_reason_Fake Proof' }],
        [{ text: '😡 Harassment', callback_data: 'report_reason_Harassment' }, { text: '❓ Other', callback_data: 'report_reason_Other' }]
    ]
};

export const reportScene = new Scenes.WizardScene(
    'report_wizard',
    // Step 0: Ask for the safetag of the user to report
    async (ctx: any) => {
        await ctx.reply('🚨 <b>Report a User</b>\n\nEnter the @safetag of the user you want to report:', {
            parse_mode: 'HTML'
        });
        return ctx.wizard.next();
    },
    // Step 1: Capture safetag, show reason keyboard
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return;
        if (!ctx.message?.text) return;

        const raw = ctx.message.text.trim();
        ctx.wizard.state.reported_safetag = raw.startsWith('@') ? raw : `@${raw}`;

        await ctx.reply('📋 <b>Select a Reason</b>\n\nWhat best describes the issue?', {
            parse_mode: 'HTML',
            reply_markup: REASON_KEYBOARD
        });
        return ctx.wizard.next();
    },
    // Step 2: Capture reason, ask for description
    async (ctx: any) => {
        if (!ctx.callbackQuery || !ctx.callbackQuery.data?.startsWith('report_reason_')) {
            await ctx.reply('⚠️ Please tap one of the reason buttons above.', {
                reply_markup: REASON_KEYBOARD
            });
            return;
        }
        ctx.wizard.state.reason = ctx.callbackQuery.data.replace('report_reason_', '');
        await ctx.answerCbQuery();

        await ctx.reply('✏️ <b>Describe the Issue</b>\n\nBriefly describe the issue (optional, max 500 chars).\n\nType your description or send <b>skip</b> to skip:', {
            parse_mode: 'HTML'
        });
        return ctx.wizard.next();
    },
    // Step 3: Capture description (or skip), submit report
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return;
        if (!ctx.message?.text) return;

        const text = ctx.message.text.trim();
        const description = text.toLowerCase() === 'skip' ? '' : text.substring(0, 500);

        const { reported_safetag, reason } = ctx.wizard.state;

        try {
            await axios.post(`${API_URL}/reports`, {
                reported_safetag,
                reason,
                description
            }, { headers: BOT_AUTH_HEADERS });

            await ctx.reply('✅ Report submitted. Our trust & safety team will review it within 24 hours.', {
                reply_markup: {
                    inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]]
                }
            });
        } catch (err: any) {
            console.error('Report submission error:', err.message);
            await ctx.reply('❌ Failed to submit report. Please try again.', {
                reply_markup: {
                    inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]]
                }
            });
        }

        return ctx.scene.leave();
    }
);
