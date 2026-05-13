import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3000/api';

const fmtAmt = (amount: number, currency: string) => {
    const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    return sym[currency]
        ? `${sym[currency]}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${parseFloat(Number(amount).toFixed(8))} ${currency}`;
};

export const communityWithdrawScene = new Scenes.WizardScene<any>(
    'community_withdraw_wizard',

    // Step 0: Show balance, ask for amount
    async (ctx: any) => {
        const { available, currency, groupName } = ctx.wizard.state;
        await ctx.reply(
            `💸 <b>Withdraw Earnings</b>\n\n` +
            `Group: <b>${groupName}</b>\n` +
            `Currency: <b>${currency}</b>\n` +
            `Available: <b>${fmtAmt(available, currency)}</b>\n\n` +
            `Enter the amount you want to withdraw:`,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cwd_cancel' }]] } }
        );
        return ctx.wizard.next();
    },

    // Step 1: Collect amount, ask for bank name
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'cwd_cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('❌ Withdrawal cancelled.');
            return ctx.scene.leave();
        }
        const text = ctx.message?.text?.trim();
        if (!text) return;
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('⚠️ Please enter a valid positive number.');
        }
        if (amount > ctx.wizard.state.available) {
            return ctx.reply(`⚠️ Amount exceeds available balance of ${fmtAmt(ctx.wizard.state.available, ctx.wizard.state.currency)}. Enter a lower amount.`);
        }
        ctx.wizard.state.amount = amount;
        await ctx.reply('🏦 Enter your bank name (e.g. GTBank, Access, UBA):', {
            reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cwd_cancel' }]] },
        });
        return ctx.wizard.next();
    },

    // Step 2: Collect bank name, ask for account number
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'cwd_cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('❌ Withdrawal cancelled.');
            return ctx.scene.leave();
        }
        const text = ctx.message?.text?.trim();
        if (!text) return;
        ctx.wizard.state.bank_name = text;
        await ctx.reply('🔢 Enter your 10-digit account number:', {
            reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cwd_cancel' }]] },
        });
        return ctx.wizard.next();
    },

    // Step 3: Collect account number, ask for account name
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'cwd_cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('❌ Withdrawal cancelled.');
            return ctx.scene.leave();
        }
        const text = ctx.message?.text?.trim();
        if (!text) return;
        ctx.wizard.state.account_number = text;
        await ctx.reply('👤 Enter the account holder name (as it appears on your bank):', {
            reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cwd_cancel' }]] },
        });
        return ctx.wizard.next();
    },

    // Step 4: Collect account name, show confirmation
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'cwd_cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('❌ Withdrawal cancelled.');
            return ctx.scene.leave();
        }
        const text = ctx.message?.text?.trim();
        if (!text) return;
        ctx.wizard.state.account_name = text;
        const { amount, currency, bank_name, account_number, account_name } = ctx.wizard.state;
        await ctx.reply(
            `✅ <b>Confirm Withdrawal</b>\n\n` +
            `Amount: <b>${fmtAmt(amount, currency)}</b>\n` +
            `Bank: <b>${bank_name}</b>\n` +
            `Account No: <b>${account_number}</b>\n` +
            `Account Name: <b>${account_name}</b>\n\n` +
            `Proceed with this withdrawal request?`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Confirm', callback_data: 'cwd_confirm' }, { text: '❌ Cancel', callback_data: 'cwd_cancel' }],
                    ],
                },
            }
        );
        return ctx.wizard.next();
    },

    // Step 5: Submit to API
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        await ctx.answerCbQuery();
        if (ctx.callbackQuery.data === 'cwd_cancel') {
            await ctx.reply('❌ Withdrawal cancelled.');
            return ctx.scene.leave();
        }
        const { groupId, currency, amount, bank_name, account_number, account_name } = ctx.wizard.state;
        try {
            await axios.post(`${API_URL}/communities/${groupId}/withdraw`, {
                currency, amount, bank_name, account_number, account_name,
            });
            await ctx.reply(
                `✅ <b>Withdrawal Requested!</b>\n\n` +
                `Amount: <b>${fmtAmt(amount, currency)}</b>\n` +
                `Bank: ${bank_name} · ${account_number}\n` +
                `Account: ${account_name}\n\n` +
                `⏳ We'll process this within 1–2 business days. You'll receive a notification when it's done.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] },
                }
            );
        } catch (err: any) {
            await ctx.reply(`❌ ${err.response?.data?.error || err.message}`);
        }
        return ctx.scene.leave();
    }
);
