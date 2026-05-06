import * as dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

import { Telegraf, Scenes, session, Context } from 'telegraf';
import { registrationScene } from './scenes/registration';
import { transactionScene } from './scenes/transaction';
import { reviewScene } from './scenes/review';
import { disputeScene } from './scenes/dispute';
import { accountDeletionScene } from './scenes/account_deletion';
import { processSmartTransaction, SmartTransactionDraft } from '../../shared/src/ai/smartTransaction';

interface SafeeelyWizardSession extends Scenes.WizardSessionData {
    // This is for data persistent within a specific wizard scene
}

interface SafeeelySession extends Scenes.WizardSession<SafeeelyWizardSession> {
    smartTxnDraft?: SmartTransactionDraft;
}

interface SafeeelyContext extends Scenes.WizardContext<SafeeelyWizardSession> {
    session: SafeeelySession;
}

const bot = new Telegraf<SafeeelyContext>(process.env.TELEGRAM_BOT_TOKEN || '');

const stage = new Scenes.Stage<SafeeelyContext>([registrationScene, transactionScene, reviewScene, disputeScene, accountDeletionScene] as any);

bot.use(session());
bot.use(stage.middleware());

import axios from 'axios';

const API_URL = process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3000/api';
let REVIEWS_URL = process.env.REVIEWS_URL || 'http://localhost:3001';

// Telegram API rejects 'localhost' in inline keyboard URLs
if (REVIEWS_URL.includes('localhost')) {
    REVIEWS_URL = REVIEWS_URL.replace('localhost', '127.0.0.1');
}

console.log(`🚀 Telegram Bot Starting:`);
console.log(`📡 API_URL: ${API_URL}`);
console.log(`🔗 REVIEWS_URL: ${REVIEWS_URL}`);

const showMainMenu = (ctx: SafeeelyContext) => {
    return ctx.reply('🏠 <b>Main Menu</b>\n\nWhat would you like to do today?', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 Create Transaction', callback_data: 'create_txn' }, { text: '📋 My Transactions', callback_data: 'my_txns' }],
                [{ text: '💰 Balance & Withdrawals', callback_data: 'balance' }, { text: '🎁 Referral', callback_data: 'referral' }],
                [{ text: '⭐ Reviews & Ratings', callback_data: 'reviews' }, { text: '⚙️ Settings & Account', callback_data: 'settings' }]
            ]
        }
    });
};

bot.command('cancel', async (ctx) => {
    if (ctx.session) delete ctx.session.smartTxnDraft;
    ctx.reply('❌ Action cancelled. Returning to main menu.');
    await ctx.scene.leave();
    return showMainMenu(ctx);
});

bot.command('help', (ctx) => {
    ctx.reply('📚 <b>Safeeely Help</b>\n\n• /start - Main Menu\n• /cancel - Stop current action\n\nFor support, contact @SafeeelySupport', { parse_mode: 'HTML' });
});

bot.start(async (ctx) => {
    try {
        const userId = ctx.from?.id;
        console.log(`🚀 Telegram /start by user: ${ctx.from?.id} (@${ctx.from?.username})`);

        // Capture referral payload e.g. /start ref_rarktech -> ctx.payload is 'ref_rarktech'
        let referralCode = '';
        if (ctx.payload && ctx.payload.startsWith('ref_')) {
            referralCode = ctx.payload.substring(4); // strip 'ref_'
            console.log(`🔗 Captured referral code: ${referralCode}`);
        }

        // Check if user exists via API
        try {
            const response = await axios.get(`${API_URL}/profiles/by_platform/telegram/${userId}`);
            console.log(`🔍 Profile check for ${userId}: ${response.status} - Found: ${!!response.data?.safetag}`);

            if (response.data && response.data.safetag) {
                if (response.data.is_deactivated) {
                    return ctx.reply('⚠️ Your Safeeely account has been deactivated. Please contact support@safeeely.com if you believe this is a mistake.');
                }
                // User exists, show menu
                await ctx.reply(`👋 Welcome back, <b>${response.data.first_name || 'user'}</b>!`, { parse_mode: 'HTML' });
                return showMainMenu(ctx);
            }
        } catch (apiErr: any) {
            if (apiErr.response?.status === 404) {
                console.warn(`⚠️ User ${userId} not found in database. Starting registration wizard.`);
                // User not found, start registration
                await ctx.reply('👋 <b>Welcome to Safeeely!</b>\n\nYour trusted escrow service for secure social media transactions.\n\nIt looks like you\'re new here. Let\'s get you registered!', { parse_mode: 'HTML' });

                return ctx.scene.enter('registration_wizard', { referralCode });
            }
            throw apiErr;
        }
    } catch (err: any) {
        console.error('❌ Telegram Start Error:', err.message);
        if (err.response) {
            console.error('   API Status:', err.response.status);
            console.error('   API Data:', JSON.stringify(err.response.data));
        }
        ctx.reply('❌ An error occurred while connecting to Safeeely services.');
    }
});

bot.action('create_txn', (ctx) => {
    ctx.scene.enter('transaction_wizard');
});

bot.action('main_menu', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    if (ctx.session) delete ctx.session.smartTxnDraft;
    return showMainMenu(ctx);
});

bot.action('reviews', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const safetag = profileRes.data.safetag;
        
        const [statsRes, badgesRes] = await Promise.all([
            axios.get(`${API_URL}/reviews/stats/${safetag}`),
            axios.get(`${API_URL}/profiles/${safetag}/badges`)
        ]);

        const { average_rating, review_count } = statsRes.data;
        const badges = badgesRes.data;

        const rating = average_rating || 0;
        const starsInt = Math.round(rating);
        const stars = '⭐'.repeat(starsInt) + '☆'.repeat(5 - starsInt);

        let badgeList = '';
        if (badges && badges.length > 0) {
            badgeList = '\n🏆 <b>Badges:</b> ' + badges.map((b: any) => `${b.emoji} ${b.label}`).join(' | ');
        }

        const msg = `⭐ <b>Reviews & Ratings</b>\n\nYou have a trust score of <b>${rating.toFixed(1)}/5 ${stars}</b> (based on <b>${review_count}</b> reviews).${badgeList}\n\nYou can view your full review history on our external platform.`;

        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👌 View Reviews', url: `${REVIEWS_URL}/reviews/${encodeURIComponent(safetag)}?viewer=${encodeURIComponent(safetag)}` }],
                    [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
                ]
            }
        });
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

bot.action('referral', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const safetag = profileRes.data.safetag;
        const statsRes = await axios.get(`${API_URL}/referrals/${safetag}/stats`);
        const stats = statsRes.data;

        // E.g. https://Safeeely.com/@rarktech
        const cleanSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const referralLink = `${REVIEWS_URL}/${cleanSafetag}`;

        const fmtAmt = (amount: number, currency: string) => {
            const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
            return sym[currency]
                ? `${sym[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${parseFloat(amount.toFixed(8))} ${currency}`;
        };
        const earningsLines = stats.earningsByCurrency?.length
            ? stats.earningsByCurrency.map((e: any) => `  • <b>${fmtAmt(e.totalEarned, e.currency)}</b>`).join('\n')
            : '  • None yet';

        const msg = `🎁 <b>My Referrals</b>\n\nInvite friends and earn up to <b>1.5% commision for life on all secured purchases</b>!\n\n🔗 <b>Your Invite Link:</b>\n<code>${referralLink}</code>\n\n📊 <b>Statistics:</b>\n👥 Tier 1 Referrals: <b>${stats.tier1Count}</b>\n👥 Tier 2 Referrals: <b>${stats.tier2Count}</b>\n💰 <b>Commissions Earned:</b>\n${earningsLines}`;

        const markup = {
            inline_keyboard: [
                [{ text: '💸 Withdraw Earnings', url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}?viewer=${encodeURIComponent(safetag)}#referrals` }],
                [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
            ]
        };

        try {
            // Internal API call to get the generated card PNG
            const cardUrl = `${API_URL}/referrals/${safetag}/card`;
            const imageResponse = await axios.get(cardUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            return ctx.replyWithPhoto({ source: Buffer.from(imageResponse.data) }, {
                caption: msg,
                parse_mode: 'HTML',
                reply_markup: markup
            });
        } catch (imgErr) {
            console.error('Failed to generate referral card image, falling back to text:', imgErr);
            // Fallback to text only
            return ctx.reply(msg, {
                parse_mode: 'HTML',
                reply_markup: markup
            });
        }
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

bot.action('my_txns', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    return ctx.reply('📋 <b>My Transactions</b>\n\nChoose a category to view:', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔄 Ongoing', callback_data: 'view_txns_category|ongoing' }, { text: '✅ Completed', callback_data: 'view_txns_category|completed' }],
                [{ text: '⚠️ Disputed', callback_data: 'view_txns_category|disputed' }, { text: '🔙 Main Menu', callback_data: 'main_menu' }]
            ]
        }
    });
});

bot.action('balance', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const safetag = profileRes.data.safetag;
        const balRes = await axios.get(`${API_URL}/profiles/${safetag}/balance`);
        const { balances } = balRes.data;

        let msg = '💰 <b>Available Balance</b>\n\n';
        if (balances.length === 0) {
            msg += 'You currently have no available balance. Complete transactions to earn!';
        } else {
            balances.forEach((b: any) => {
                const emoji = b.currency === 'NGN' ? '🇳🇬' : (b.currency === 'USD' ? '🇺🇸' : '🪙');
                msg += `${emoji} <b>${b.amount.toLocaleString()} ${b.currency}</b>\n`;
            });
            msg += '\n<i>Balances are calculated from your completed (finalized) sales.</i>';
        }

        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💸 Withdraw Funds', url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}?viewer=${encodeURIComponent(safetag)}` }],
                    [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
                ]
            }
        });
    } catch (err: any) {
        ctx.reply(`❌ Balance Error: ${err.message}`);
    }
});

bot.action('settings', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { }
    console.log(`⚙️ Settings requested by Telegram user: ${ctx.from?.id}`);
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const p = profileRes.data;

        if (!p || !p.safetag) {
             return ctx.reply("❌ **Profile not found.** Please use /start to register.");
        }

        const safeSafetag = p.safetag ? p.safetag.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;') : 'N/A';
        const safeEmail = p.email ? p.email.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;') : 'N/A';
        const safeName = `${p.first_name || ''} ${p.last_name || ''}`.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');

        const msg = `⚙️ <b>Account Settings</b>\n\n` +
                    `👤 Safetag: <code>${safeSafetag}</code>\n` +
                    `📧 Email: ${safeEmail}\n` +
                    `👤 Name: ${safeName}\n\n` +
                    `Manage your account and privacy preferences below:`;

        const kycUrl = `${REVIEWS_URL}/kyc?viewer=${encodeURIComponent(p.safetag)}`;
        const useWebApp = REVIEWS_URL && REVIEWS_URL.startsWith('https');

        await ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '❌ Delete Account', callback_data: 'start_deletion' },
                        { text: '⚙️ Other Settings', callback_data: 'other_settings' }
                    ],
                    [
                        { text: '🏠 Main Menu', callback_data: 'main_menu' }
                    ]
                ]
            }
        });
        return;
    } catch (err: any) {
        console.error('❌ Settings Action Error:', err.message);
        if (err.response?.status === 404) {
            return ctx.reply("❌ **Profile not found.** Please use /start to register.");
        }
        ctx.reply(`❌ Error: ${err.message || 'Unknown error occurred'}`);
    }
});

bot.action('other_settings', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const p = profileRes.data;
        const kycUrl = `${REVIEWS_URL}/kyc?viewer=${encodeURIComponent(p.safetag)}`;
        const useWebApp = REVIEWS_URL && REVIEWS_URL.startsWith('https');
        await ctx.reply('⚙️ <b>Other Settings</b>\n\nManage linked accounts and identity verification:', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔗 Linked Accounts', callback_data: 'linked_accounts' }],
                    [{ text: '🛡️ KYC Verification ↗️', ...(useWebApp ? { web_app: { url: kycUrl } } : { url: kycUrl.replace('localhost', '127.0.0.1') }) }],
                    [{ text: '🔙 Back', callback_data: 'settings' }]
                ]
            }
        });
    } catch (err: any) { ctx.reply(`❌ Error: ${err.message}`); }
});

bot.action('linked_accounts', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { }
    await ctx.reply('🔗 <b>Linked Accounts</b>\n\nYour account is linked to this Telegram profile.\n\nTo link other platforms, log in via WhatsApp, Instagram, or Discord using your safetag.', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'other_settings' }]] }
    });
});

bot.action('start_deletion', (ctx) => {
    ctx.scene.enter('account_deletion_wizard');
});

bot.action(/^view_txns_category\|(.+)$/, async (ctx) => {
    const category = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const txnsRes = await axios.get(`${API_URL}/transactions`, {
            params: { safetag: profileRes.data.safetag, category }
        });

        const txns = txnsRes.data;
        if (txns.length === 0) {
            return ctx.reply(`ℹ️ You have no <b>${category}</b> transactions.`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Back', callback_data: 'my_txns' }]]
                }
            });
        }

        const buttons = txns.slice(0, 10).map((t: any) => [
            { text: `${t.product_name} (${t.amount} ${t.currency})`, callback_data: `view_txn_details|${t.id}` }
        ]);
        buttons.push([{ text: '🔙 Back', callback_data: 'my_txns' }]);

        return ctx.reply(`📋 <b>My ${category.charAt(0).toUpperCase() + category.slice(1)} Transactions</b>\n\nSelect a transaction to view details:`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

bot.action(/^view_txn_details\|(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const myTag = profileRes.data.safetag;
        
        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
        const t = res.data;
        
        let milestoneInfo = '';
        const buttons: any[] = [];

        if (t.transaction_type === 'MILESTONE' && t.milestones && t.milestones.length > 0) {
            milestoneInfo = '\n\n🪜 <b>Milestone Progress:</b>\n';
            t.milestones.sort((a: any, b: any) => a.index_num - b.index_num).forEach((m: any) => {
                const statusEmoji = m.status === 'RELEASED' ? '✅' : (m.status === 'COMPLETED' ? '📦' : '⏳');
                milestoneInfo += `${statusEmoji} ${m.title}: <b>${m.amount} ${t.currency}</b> (${m.status})\n`;
                
                // Add action buttons for pending/completed milestones
                if (m.status === 'PENDING' && myTag === t.seller.safetag && t.status === 'PAID') {
                    buttons.push([{ text: `📦 Mark "${m.title}" Complete`, callback_data: `m_status|${t.id}|${m.id}|COMPLETED` }]);
                } else if (m.status === 'COMPLETED' && myTag === t.buyer.safetag) {
                    buttons.push([{ text: `💸 Release "${m.title}"`, callback_data: `m_status|${t.id}|${m.id}|RELEASED` }]);
                }
            });
        }

        const msg = `📋 <b>Transaction Details</b>\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: <b>${t.txn_code}</b>\n📦 Type: <b>${t.transaction_type}</b>\n🛒 Product: <b>${t.product_name}</b>\n📝 Desc: ${t.description || 'N/A'}\n💰 Total: <b>${t.amount} ${t.currency}</b>\n💵 Fee: <b>${t.fee_amount}</b> (${t.fee_allocation})\n💳 Escrow: <b>${t.total_amount}</b>\n👤 Buyer: <code>${t.buyer.safetag}</code>\n👤 Seller: <code>${t.seller.safetag}</code>\n💠 Status: <b>${t.status.replace(/_/g, ' ')}</b>${milestoneInfo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        const navButtons = [{ text: '🔙 Back', callback_data: 'my_txns' }];
        
        const isOngoing = ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status);
        if (isOngoing && t.transaction_type === 'ONE_TIME') {
            navButtons.push({ text: '🚀 Action', callback_data: `txn_resume|${t.id}` });
        } else if (t.status === 'PENDING_SELLER_ACCEPTANCE' || t.status === 'ACCEPTED') {
             // For milestones, we still need these two basic actions
             navButtons.push({ text: '🚀 Action', callback_data: `txn_resume|${t.id}` });
        }

        buttons.push(navButtons);

        const canDispute = ['PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status);
        if (canDispute) {
            buttons.push([{ text: '⚠️ Dispute Transaction', callback_data: `txn_dispute_${t.id}` }]);
        }

        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

bot.action(/^txn_resume\|(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const myTag = profileRes.data.safetag;
        const txnRes = await axios.get(`${API_URL}/transactions/${txnId}`);
        const t = txnRes.data;

        const isBuyer = myTag === t.buyer.safetag;
        const isSeller = myTag === t.seller.safetag;

        let nextAction = '';
        if (t.status === 'PENDING_SELLER_ACCEPTANCE' && isSeller) nextAction = 'accept_prompt';
        else if (t.status === 'ACCEPTED' && isBuyer) nextAction = 'pay_prompt';
        else if (t.status === 'PAID' && isSeller) nextAction = 'complete_prompt';
        else if (t.status === 'AWAITING_PROOF' && isSeller) nextAction = 'complete_yes';
        else if (t.status === 'COMPLETED_BY_SELLER' && isBuyer) nextAction = 'confirm_receipt_prompt';

        if (nextAction) {
            const statusRes = await axios.patch(`${API_URL}/transactions/${txnId}/status`, {
                status: nextAction,
                updater_safetag: myTag
            });

            let content = statusRes.data.follow_up_msg || '✅ Continuing transaction...';
            // Convert any Discord-style markdown to HTML if needed?
            // User feedback seems to imply the API already returns <b> etc.

            const markup = {
                inline_keyboard: statusRes.data.follow_up_options.map((opt: any) => ([{
                    text: opt.label,
                    ...(opt.url ? { url: opt.url.replace('localhost', '127.0.0.1') } : { callback_data: opt.customId })
                }]))
            };

            return ctx.reply(content, {
                parse_mode: 'HTML',
                reply_markup: markup
            });
        } else {
            return ctx.reply('⏳ Waiting for the other party to take action.');
        }
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});


bot.action(/^txn_action_(.+)$/, async (ctx) => {
    try {
        const [action, txnId] = ctx.match[1].split('|');
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const mySafetag = profileRes.data.safetag;

        const statusRes = await axios.patch(`${API_URL}/transactions/${txnId}/status`, {
            status: action,
            updater_safetag: mySafetag
        });

        try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }

        let msg = `✅ Transaction <b>${action === 'accept' ? 'Accepted' : 'Declined'}</b>!`;
        let markup: any = {
            inline_keyboard: [[{ text: '🔙 Main Menu', callback_data: 'main_menu' }]]
        };

        if (statusRes.data.follow_up_msg) {
            msg = statusRes.data.follow_up_msg;
            if (statusRes.data.follow_up_options) {
                markup = {
                    inline_keyboard: statusRes.data.follow_up_options.map((opt: any) => [{
                        text: opt.label,
                        ...(opt.url ? { url: opt.url.replace('localhost', '127.0.0.1') } : { callback_data: opt.customId })
                    }])
                };
            }
        }

        console.log(`🚀 Replying to Telegram with:`, { msg, markup, receipt: statusRes.data.follow_up_receipt_url });
        
        if (statusRes.data.follow_up_receipt_url) {
            try {
                // Robust regex: Find /api/receipts/... and replace everything BEFORE it with the local API base
                const internalApiBase = (process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3000/api').replace('/api', '');
                const fetchUrl = statusRes.data.follow_up_receipt_url.replace(/.*(?=\/api\/receipts)/, internalApiBase);
                
                console.log(`📸 Telegram Fetching receipt from: ${fetchUrl}`);
                const response = await axios.get(fetchUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 10000 
                });
                console.log(`✅ Telegram Receipt fetch success: ${response.status}`);
                return ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                    caption: msg,
                    parse_mode: 'HTML',
                    reply_markup: markup
                });
            } catch (fetchError: any) {
                console.error('❌ Telegram Receipt fetch failure:', fetchError.message);
                if (fetchError.response) {
                    console.error('   Status:', fetchError.response.status);
                    console.error('   Headers:', JSON.stringify(fetchError.response.headers));
                }
            }
        }

        return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: markup });
    } catch (err: any) {
        console.error('TXN Action Error:', err.message);
        ctx.reply('❌ Error processing request.');
    }
});

bot.action(/^m_status\|(.+)$/, async (ctx) => {
    try {
        const [txnId, mId, status] = ctx.match[1].split('|');
        await axios.patch(`${API_URL}/transactions/${txnId}/milestones/${mId}/status`, { status });
        
        await ctx.answerCbQuery(`✅ Milestone marked as ${status.toLowerCase()}!`);
        
        // Refresh the transaction view
        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
        const t = res.data;
        
        // Re-use logic from view_txn_details (simplified)
        let milestoneInfo = '\n\n🪜 <b>Milestone Progress:</b>\n';
        const buttons: any[] = [];
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const myTag = profileRes.data.safetag;

        t.milestones.sort((a: any, b: any) => a.index_num - b.index_num).forEach((m: any) => {
            const statusEmoji = m.status === 'RELEASED' ? '✅' : (m.status === 'COMPLETED' ? '📦' : '⏳');
            milestoneInfo += `${statusEmoji} ${m.title}: <b>${m.amount} ${t.currency}</b> (${m.status})\n`;
            if (m.status === 'PENDING' && myTag === t.seller.safetag && t.status === 'PAID') {
                buttons.push([{ text: `📦 Mark "${m.title}" Complete`, callback_data: `m_status|${t.id}|${m.id}|COMPLETED` }]);
            } else if (m.status === 'COMPLETED' && myTag === t.buyer.safetag) {
                buttons.push([{ text: `💸 Release "${m.title}"`, callback_data: `m_status|${t.id}|${m.id}|RELEASED` }]);
            }
        });

        const msg = `📋 <b>Transaction Details</b>\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: <b>${t.txn_code}</b>\n📦 Type: <b>${t.transaction_type}</b>\n🛒 Product: <b>${t.product_name}</b>\n💠 Status: <b>${t.status.replace(/_/g, ' ')}</b>${milestoneInfo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        buttons.push([{ text: '🔙 Back', callback_data: 'my_txns' }]);

        return ctx.editMessageText(msg, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err: any) {
        console.error('Milestone Update Error:', err.message);
        ctx.reply('❌ Failed to update milestone.');
    }
});

bot.action(/^txn_pay_(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    try {
        await axios.post(`${API_URL}/transactions/${txnId}/pay`);
        await ctx.reply(`⏳ <b>Payment Processing...</b>\n\nWe're verifying your payment. This may take a few minutes.\n\nPlease wait while we confirm...`, { parse_mode: 'HTML' });
    } catch (err: any) {
        ctx.reply('❌ Error initiating payment.');
    }
});

bot.action(/^leave_review_(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    await ctx.scene.enter('review_wizard', { txnId });
});

bot.action(/^txn_dispute_(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    await ctx.scene.enter('dispute_wizard', { txnId });
});

bot.action(/^txn_(upload_delivery|external_upload)_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    await ctx.reply('📎 <b>Upload Delivery Documents</b>\n\nPlease upload your files here or provide a link for the buyer to review.', { parse_mode: 'HTML' });
});

bot.on('photo', async (ctx) => {
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const mySafetag = profileRes.data.safetag;

        // Check for active transactions awaiting proof
        const txnsRes = await axios.get(`${API_URL}/transactions`, {
            params: { seller_safetag: mySafetag, status: 'AWAITING_PROOF' }
        });

        if (txnsRes.data && txnsRes.data.length > 0) {
            const txn = txnsRes.data[0];
            const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            const link = await ctx.telegram.getFileLink(fileId);

            await axios.post(`${API_URL}/transactions/${txn.id}/upload-proof`, {
                proof_url: link.href
            });
        }
    } catch (err: any) {
        console.error('Photo Upload Error:', err.message);
    }
});

bot.action(/^block_binding\|(.+)\|(.+)$/, async (ctx) => {
    const profileId = ctx.match[1];
    const targetPlatformId = ctx.match[2];
    try {
        await ctx.answerCbQuery('Blocking account...');
        
        // Find safetag for this profile to call the API
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const safetag = profileRes.data.safetag;

        await axios.post(`${API_URL}/auth/block`, {
            safetag,
            platform_id: targetPlatformId
        });

        await ctx.editMessageText(`🚫 <b>Action Blocked</b>\n\nThe account (ID: <code>${targetPlatformId}</code>) has been banned from linking to your Safetag.\n\nYour account remains secure.`, { parse_mode: 'HTML' });
    } catch (err: any) {
        console.error('Block Binding Error:', err.message);
        ctx.reply('❌ Failed to block action. Please contact support.');
    }
});

bot.action('smart_txn_confirm', async (ctx) => {
    try { await ctx.answerCbQuery("✅ Draft Confirmed!"); } catch (e) {}
    if (!ctx.session?.smartTxnDraft) {
        return ctx.reply("❌ Session expired. Please start over.");
    }
    const draft = ctx.session.smartTxnDraft;
    delete ctx.session.smartTxnDraft;

    return ctx.scene.enter('transaction_wizard', { smartDraft: draft });
});

bot.action('smart_txn_cancel', async (ctx) => {
    try { await ctx.answerCbQuery("❌ Draft Cancelled"); } catch (e) {}
    if (ctx.session) delete ctx.session.smartTxnDraft;
    await ctx.reply("❌ Transaction draft cancelled.");
});

bot.on('message', async (ctx) => {
    const msg = ctx.message;
    if (!msg) return;

    let textBody = '';
    let audioBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    if (msg.voice || msg.audio) {
        await ctx.reply("🎙️ Processing your request...");
        try {
            const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
            audioBuffer = Buffer.from(response.data);
            mimeType = msg.voice ? msg.voice.mime_type || 'audio/ogg' : msg.audio.mime_type || 'audio/mp3';
        } catch (e: any) {
            console.error('Audio fetch error:', e.message);
            return ctx.reply("❌ Could not process your audio. Please try again.");
        }
    } else if (msg.text && !msg.text.startsWith('/')) {
        textBody = msg.text;
        // don't process short simple messages if there is no session
        if (!ctx.session?.smartTxnDraft && textBody.split(' ').length < 3) {
            return ctx.reply('👋 Type /start to access the main menu or continue where you left off.');
        }
        await ctx.reply("🎙️ Processing your request...");
    } else {
        return; // Ignore other types if not in a scene
    }

    try {
        const aiResult = await processSmartTransaction(textBody, audioBuffer, mimeType, ctx.session?.smartTxnDraft);
        if (ctx.session) ctx.session.smartTxnDraft = aiResult.draft;

        if (aiResult.is_complete) {
            const draft = aiResult.draft;
            let mList = '';
            if (draft.transaction_type === 'MILESTONE' && draft.milestones) {
                mList = '\n📍 <b>Milestones:</b>\n' + draft.milestones.map((m: any, i: number) => `   ${i+1}. ${m.title} - ${m.amount} ${draft.currency}`).join('\n');
            }

            const draftText = `✨ <b>Smart Transaction Draft</b>\n\nPlease review your transaction details:\n\n` +
                `📦 Type: <b>${draft.transaction_type || 'ONE_TIME'}</b>\n` +
                `🛒 Product: <b>${draft.product_name}</b>\n` +
                `📝 Description: <b>${draft.description || 'No description'}</b>${mList}\n` +
                `👤 Counterparty: <b>@${draft.counterparty_safetag}</b>\n` +
                `💰 Amount: <b>${draft.amount} ${draft.currency}</b>\n` +
                `💵 Fee Allocation: <b>${draft.fee_allocation}</b>\n` +
                `💠 Your Role: <b>${draft.role}</b>\n\n` +
                `Does this look correct? You can reply to edit (e.g., "Change the price to 200,000") or click confirm below.`;
            
            await ctx.reply(draftText, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ Confirm & Proceed", callback_data: "smart_txn_confirm" }],
                        [{ text: "❌ Cancel", callback_data: "smart_txn_cancel" }]
                    ]
                }
            });
        } else {
            await ctx.reply(aiResult.follow_up_question || "Please provide the missing details.");
        }
    } catch (e: any) {
        console.error('Smart Txn Error:', e.message);
        await ctx.reply("❌ Sorry, I had trouble processing that. Please try again or use the standard form.");
    }
});

bot.catch((err: any, ctx) => {
    console.error(`Telegram Bot Error (${ctx.updateType}):`, err);
    try {
        ctx.reply('❌ <b>An unexpected error occurred</b>\n\nOur team has been notified. Please try again later.', { parse_mode: 'HTML' });
    } catch (e) {
        console.error('Failed to send error message:', e);
    }
});

import http from 'http';

// ⚓ Dummy HTTP Server to satisfy Render "Web Service" port check INSTANTLY
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Safeeely Telegram Bot is Healthy\n');
}).listen(PORT, () => {
    console.log(`🌐 Telegram Bot Health-Check server is listening on port ${PORT}`);
});

const startBot = async (retryCount = 0) => {
    try {
        await bot.launch();
        console.log('✅ Safeeely Telegram Bot is fully launched and connected.');
    } catch (err: any) {
        console.error('❌ Failed to launch Telegram bot:', err.message);
        
        // Handle Render Zero-Downtime 409 Conflict (Old bot hasn't died yet)
        if (err.response && err.response.error_code === 409 && retryCount < 10) {
            console.log('⏳ Telegram 409 Conflict (Old container still alive). Retrying in 5 seconds...');
            setTimeout(() => startBot(retryCount + 1), 5000);
        } else {
            // Let the health server keep the container alive so we don't restart loop Render
            console.error('🚨 Fatal Telegram Error. Bot is dead but health server is alive.');
        }
    }
};

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
