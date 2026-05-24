import * as dotenv from 'dotenv';
import path from 'path';
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
});

import { Telegraf, Scenes, session, Context } from 'telegraf';
import { registrationScene } from './scenes/registration';
import { transactionScene } from './scenes/transaction';
import { reviewScene } from './scenes/review';
import { feedbackScene } from './scenes/feedback';
import { disputeScene } from './scenes/dispute';
import { accountDeletionScene } from './scenes/account_deletion';
import { buildMagicLink, fetchBotBalance } from './utils/magicLink';
import { communityLicensingScene } from './scenes/community_licensing';
import { communityWithdrawScene } from './scenes/community_withdraw';
import { processSmartTransaction, SmartTransactionDraft } from '../../shared/src/ai/smartTransaction';

interface SafeeelyWizardSession extends Scenes.WizardSessionData {
    // This is for data persistent within a specific wizard scene
}

interface SafeeelySession extends Scenes.WizardSession<SafeeelyWizardSession> {
    smartTxnDraft?: SmartTransactionDraft;
    incomingGroupId?: string;
}

interface SafeeelyContext extends Scenes.WizardContext<SafeeelyWizardSession> {
    session: SafeeelySession;
}

const bot = new Telegraf<SafeeelyContext>(process.env.TELEGRAM_BOT_TOKEN || '');

const stage = new Scenes.Stage<SafeeelyContext>([registrationScene, transactionScene, reviewScene, feedbackScene, disputeScene, accountDeletionScene, communityLicensingScene, communityWithdrawScene] as any);

bot.use(session());
bot.use(stage.middleware());

import axios from 'axios';

const API_URL = process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3000/api';
let REVIEWS_URL = process.env.REVIEWS_URL || 'http://localhost:3001';
const BOT_AUTH_HEADERS = process.env.BOT_API_SECRET
    ? { 'Authorization': `Bearer ${process.env.BOT_API_SECRET}`, 'x-bot-platform': 'telegram' }
    : {};

// Telegram API rejects 'localhost' in inline keyboard URLs
if (REVIEWS_URL.includes('localhost')) {
    REVIEWS_URL = REVIEWS_URL.replace('localhost', '127.0.0.1');
}

console.log(`🚀 Telegram Bot Starting:`);
console.log(`📡 API_URL: ${API_URL}`);
console.log(`🔗 REVIEWS_URL: ${REVIEWS_URL}`);
console.log(`🔑 BOT_API_SECRET: ${process.env.BOT_API_SECRET ? process.env.BOT_API_SECRET.substring(0, 8) + '...' : 'NOT SET — magic links will fail'}`);

// Per-group cooldown — prevents bot flooding when many members trigger commands at once
const groupTradeCooldown = new Map<number, number>();
const GROUP_TRADE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const showMainMenu = async (ctx: SafeeelyContext) => {
    const userId = ctx.from?.id;
    let communityRow: any[] = [];

    if (userId) {
        try {
            const communityRes = await axios.get(`${API_URL}/communities/by_admin_platform/telegram/${userId}`);
            const groupCount = communityRes.data?.communities?.length || 0;
            if (groupCount > 0) {
                const label = groupCount === 1 ? '📊 My Group' : `📊 My Groups (${groupCount})`;
                communityRow = [[{ text: label, callback_data: 'my_group_dashboard' }]];
            }
        } catch {
            // No group button if check fails
        }
    }

    return ctx.reply('🏠 <b>Main Menu</b>\n\nWhat would you like to do today?', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 Create Transaction', callback_data: 'create_txn' }, { text: '📋 My Transactions', callback_data: 'my_txns' }],
                [{ text: '💰 Balance & Withdrawals', callback_data: 'balance' }, { text: '🎁 Referral', callback_data: 'referral' }],
                [{ text: '⭐ Reviews & Ratings', callback_data: 'reviews' }, { text: '⚙️ Settings & Account', callback_data: 'settings' }],
                ...communityRow
            ]
        }
    });
};

// Responds to /deal, /trade, or @mention in a group chat
async function handleGroupTradeRequest(ctx: SafeeelyContext, chatId: number) {
    const now = Date.now();
    const last = groupTradeCooldown.get(chatId);
    if (last && now - last < GROUP_TRADE_COOLDOWN_MS) return;
    groupTradeCooldown.set(chatId, now);

    const botUsername = (ctx as any).botInfo?.username || process.env.TELEGRAM_BOT_USERNAME || 'SafeeelyBot';

    try {
        const communityRes = await axios.get(`${API_URL}/communities/by_telegram/${chatId}`);
        const group = communityRes.data?.group;
        if (group && group.status === 'active') {
            const deepLink = `https://t.me/${botUsername}?start=group_${group.id}`;
            return ctx.reply(
                `🛡️ <b>Start a Secure Trade</b>\n\nTap below to open an escrow transaction — your payment is held safely until delivery is confirmed.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [[{ text: '🛡️ Start Secure Trade', url: deepLink }]] },
                }
            );
        }
    } catch { /* group not licensed — fall through */ }

    // Unlicensed group: pitch the admin to set up
    const setupLink = `https://t.me/${botUsername}?start=setup_${chatId}`;
    return ctx.reply(
        `⚡ <b>Secure payments aren't set up here yet.</b>\n\nGroup admin: activate Safeeely in 2 minutes and earn a commission on every deal in your group.`,
        {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '⚡ Set Up Group Payments', url: setupLink }]] },
        }
    );
}

bot.command('cancel', async (ctx) => {
    if (ctx.session) {
        delete ctx.session.smartTxnDraft;
        delete ctx.session.incomingGroupId;
    }
    ctx.reply('❌ Action cancelled. Returning to main menu.');
    await ctx.scene.leave();
    return showMainMenu(ctx);
});

bot.command('help', (ctx) => {
    ctx.reply('📚 <b>Safeeely Help</b>\n\n• /start - Main Menu\n• /cancel - Stop current action\n• /deal or /trade - Start a secure trade\n\nFor support, contact @SafeeelySupport', { parse_mode: 'HTML' });
});

// /deal and /trade: in groups → show trade button; in DMs → open transaction wizard
bot.command(['deal', 'trade'], async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return ctx.scene.enter('transaction_wizard');
    }
    await handleGroupTradeRequest(ctx, ctx.chat.id);
});

bot.start(async (ctx) => {
    try {
        const userId = ctx.from?.id;
        console.log(`🚀 Telegram /start by user: ${ctx.from?.id} (@${ctx.from?.username})`);

        // Deep link: /start group_{communityGroupId} — user came from a licensed group
        if (ctx.payload && ctx.payload.startsWith('group_')) {
            const groupId = ctx.payload.substring(6);
            if (ctx.session) ctx.session.incomingGroupId = groupId;
        }

        // Deep link: /start setup_{telegramGroupId} — admin wants to license their group
        if (ctx.payload && ctx.payload.startsWith('setup_')) {
            const telegramGroupId = Number(ctx.payload.substring(6));
            if (telegramGroupId) {
                try {
                    // Check if group is already licensed
                    const existingRes = await axios.get(`${API_URL}/communities/by_telegram/${telegramGroupId}`).catch(() => null);
                    if (existingRes?.data?.group) {
                        return ctx.reply('✅ This group is already licensed on Safeeely!');
                    }
                    // Try to get group name from Telegram
                    let groupName = 'Your Group';
                    try {
                        const chat = await ctx.telegram.getChat(telegramGroupId);
                        groupName = (chat as any).title || 'Your Group';
                    } catch { /* use fallback */ }

                    // Check if user is registered
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${userId}`).catch(() => null);
                    if (!profileRes?.data?.safetag) {
                        await ctx.reply('👋 You need a Safeeely account first. Let\'s get you registered!');
                        return ctx.scene.enter('registration_wizard', {});
                    }
                    if (profileRes.data.is_deactivated) {
                        return ctx.reply('⚠️ Your account is deactivated. Contact support@safeeely.com.');
                    }

                    return ctx.scene.enter('community_licensing_wizard', {
                        telegram_group_id: telegramGroupId,
                        group_name: groupName,
                    });
                } catch (e: any) {
                    return ctx.reply(`❌ Could not start group setup: ${e.message}`);
                }
            }
        }

        // Deep link: /start resume_{txnId} — continue a transaction to payment
        if (ctx.payload && ctx.payload.startsWith('resume_')) {
            const txnId = ctx.payload.substring(7); // strip 'resume_'
            console.log(`🔁 Resume transaction deep link: ${txnId}`);
            try {
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${userId}`);
                const myTag = profileRes.data.safetag;
                const txnRes = await axios.get(`${API_URL}/transactions/${txnId}`);
                const t = txnRes.data;
                const isBuyer = myTag === t.buyer?.safetag;
                let nextAction = '';
                if (t.status === 'ACCEPTED' && isBuyer) nextAction = 'pay_prompt';
                else if (t.status === 'PENDING_SELLER_ACCEPTANCE' && myTag === t.seller?.safetag) nextAction = 'accept_prompt';
                else if (t.status === 'PAID' && myTag === t.seller?.safetag) nextAction = 'complete_prompt';
                else if (t.status === 'COMPLETED_BY_SELLER' && isBuyer) nextAction = 'confirm_receipt_prompt';
                if (nextAction) {
                    const statusRes = await axios.patch(`${API_URL}/transactions/${txnId}/status`, {
                        status: nextAction,
                        updater_safetag: myTag
                    }, { headers: BOT_AUTH_HEADERS });
                    const content = statusRes.data.follow_up_msg || '✅ Continuing transaction...';
                    const markup = {
                        inline_keyboard: (statusRes.data.follow_up_options || []).map((opt: any) => ([{
                            text: opt.label,
                            ...(opt.url ? { url: opt.url.replace('localhost', '127.0.0.1') } : { callback_data: opt.customId })
                        }]))
                    };
                    return ctx.reply(content, { parse_mode: 'HTML', reply_markup: markup });
                } else {
                    return ctx.reply('⏳ No action needed right now — waiting for the other party.');
                }
            } catch (e: any) {
                return ctx.reply(`❌ Could not resume transaction: ${e.response?.data?.error || e.message}`);
            }
        }

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
    if (ctx.session) {
        delete ctx.session.smartTxnDraft;
        delete ctx.session.incomingGroupId;
    }
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

        const reviewsUrl = await buildMagicLink({ platform_id: String(ctx.from!.id), scope: 'reviews', fallbackUrl: `${REVIEWS_URL}/reviews/${encodeURIComponent(safetag)}` });
        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👌 View Reviews', url: reviewsUrl }],
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

        const referralWithdrawUrl = (await buildMagicLink({ platform_id: String(ctx.from!.id), scope: 'withdraw', fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}` })) + '#referrals';
        const markup = {
            inline_keyboard: [
                [{ text: '💸 Withdraw Earnings', url: referralWithdrawUrl }],
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

        // Generate magic link FIRST — independent of balance fetch
        const withdrawUrl = await buildMagicLink({ platform_id: String(ctx.from!.id), scope: 'withdraw', fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}` });

        // Attempt balance fetch via bot-authenticated endpoint
        let msg = '💰 <b>Balance & Withdrawals</b>\n\n';
        try {
            const balData = await fetchBotBalance({ platform_id: String(ctx.from!.id) });
            if (balData === null) {
                msg += 'Tap below to view your full balance breakdown.';
            } else if (!balData.balances?.length) {
                msg += 'You have no available balance yet. Complete transactions to earn!';
            } else {
                balData.balances.forEach((b: any) => {
                    const emoji = b.currency === 'NGN' ? '🇳🇬' : (b.currency === 'USD' ? '🇺🇸' : '🪙');
                    msg += `${emoji} <b>${b.amount.toLocaleString()} ${b.currency}</b>\n`;
                });
                msg += '\n<i>Balances are from your completed (finalized) sales.</i>';
            }
        } catch {
            msg += 'Tap below to view your full balance breakdown.';
        }

        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💸 Withdraw Funds', url: withdrawUrl }],
                    [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
                ]
            }
        });
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
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

        const kycUrl = await buildMagicLink({ platform_id: String(ctx.from!.id), scope: 'kyc', fallbackUrl: `${REVIEWS_URL}/kyc` });
        const useWebApp = kycUrl.startsWith('https');

        await ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '❌ Delete Account', callback_data: 'start_deletion' },
                        { text: '⚙️ Other Settings', callback_data: 'other_settings' }
                    ],
                    [
                        { text: '💭 Send Feedback', callback_data: 'send_feedback' }
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
        const kycUrl = await buildMagicLink({ platform_id: String(ctx.from!.id), scope: 'kyc', fallbackUrl: `${REVIEWS_URL}/kyc` });
        const useWebApp = kycUrl.startsWith('https');
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
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        const safetag = profileRes.data.safetag;
        const linkedRes = await axios.get(`${API_URL}/profiles/${encodeURIComponent(safetag)}/linked-accounts`);
        const linked: any[] = linkedRes.data;
        const list = linked.length
            ? linked.map((l: any) => `• ${l.platform}${l.is_primary ? ' ⭐ (primary)' : ''}`).join('\n')
            : 'No linked accounts found.';
        await ctx.reply(`🔗 <b>Linked Accounts</b>\n\n${list}`, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'other_settings' }]] }
        });
    } catch (err: any) {
        await ctx.reply('❌ Could not load linked accounts.', {
            reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'other_settings' }]] }
        });
    }
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
            }, { headers: BOT_AUTH_HEADERS });

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
        }, { headers: BOT_AUTH_HEADERS });

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

bot.action(/^txn_refund_initiate\|(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch {}
    return ctx.reply(
        '💸 <b>Refund Buyer — Select a Reason</b>\n\nWhy are you cancelling this transaction?\n\nThe buyer will receive a <b>full refund</b>. Your seller cancellation count will increase.',
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📦 Item no longer available / out of stock', callback_data: `txn_refund_reason|${txnId}|out_of_stock` }],
                    [{ text: '🚫 Unable to fulfil this order',             callback_data: `txn_refund_reason|${txnId}|cannot_fulfil` }],
                    [{ text: '🤝 Mutually agreed to cancel with buyer',    callback_data: `txn_refund_reason|${txnId}|mutual_cancel` }],
                    [{ text: '🔙 Back',                                    callback_data: 'main_menu' }],
                ]
            }
        }
    );
});

bot.action(/^txn_refund_reason\|(.+)\|(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    const reason = ctx.match[2];
    try { await ctx.answerCbQuery(); } catch {}
    try {
        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
        const txn = res.data;
        const reasonLabels: Record<string, string> = {
            out_of_stock: 'Item no longer available / out of stock',
            cannot_fulfil: 'Unable to fulfil this order',
            mutual_cancel: 'Mutually agreed to cancel with buyer',
        };
        const reasonLabel = reasonLabels[reason] || reason;
        return ctx.reply(
            `⚠️ <b>Confirm Cancellation</b>\n\nYou are about to return <b>${txn.amount} ${txn.currency}</b> to <b>${txn.buyer?.safetag}</b>.\n\nReason: ${reasonLabel}\n\nThis will cancel the transaction and <b>cannot be undone</b>. Your seller cancellation count will increase.`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Yes, Refund Buyer', callback_data: `txn_refund_confirm|${txnId}|${reason}` }],
                        [{ text: '❌ Cancel',            callback_data: 'main_menu' }],
                    ]
                }
            }
        );
    } catch (err: any) {
        console.error('Refund reason fetch error:', err.message);
        return ctx.reply('❌ Could not load transaction details. Please try again.');
    }
});

bot.action(/^txn_refund_confirm\|(.+)\|(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    const reason = ctx.match[2];
    try { await ctx.answerCbQuery(); } catch {}
    try {
        const tgProfile = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        await axios.patch(
            `${API_URL}/transactions/${txnId}/status`,
            { status: 'seller_cancel', updater_safetag: tgProfile.data.safetag, cancellation_reason: reason },
            { headers: BOT_AUTH_HEADERS }
        );
        return ctx.reply(
            '✅ <b>Cancellation Confirmed</b>\n\nA full refund has been issued to the buyer. The transaction has been cancelled.',
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
        );
    } catch (err: any) {
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        console.error('Refund confirm error:', msg);
        return ctx.reply(`❌ Refund failed: ${msg}`);
    }
});

bot.action(/^m_status\|(.+)$/, async (ctx) => {
    try {
        const [txnId, mId, status] = ctx.match[1].split('|');
        const tgProfile = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        await axios.patch(`${API_URL}/transactions/${txnId}/milestones/${mId}/status`, { status, updater_safetag: tgProfile.data.safetag }, { headers: BOT_AUTH_HEADERS });
        
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
    await ctx.reply(
        `💳 <b>Complete Your Payment</b>\n\nTap the button below to make your secure payment:`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: '💳 Pay Now', url: `${REVIEWS_URL}/pay/${txnId}` }]]
            }
        }
    );
});

bot.action(/^leave_review_(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    await ctx.scene.enter('review_wizard', { txnId });
});

// Feedback entry: from settings menu
bot.action('send_feedback', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    await ctx.scene.enter('feedback_wizard', { source: 'menu' });
});

// Feedback entry: from notification button (pf_rate_menu|source|refId)
bot.action(/^pf_rate_menu\|(.+?)\|(.+)$/, async (ctx) => {
    const source = ctx.match[1] as any;
    const refId = ctx.match[2];
    try { await ctx.answerCbQuery(); } catch (e) {}
    await ctx.scene.enter('feedback_wizard', { source, refId });
});

bot.action(/^txn_dispute_(.+)$/, async (ctx) => {
    const txnId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    await ctx.scene.enter('dispute_wizard', { txnId });
});

// Return-of-goods confirmation: buyer confirms shipped, seller confirms received
bot.action(/^dispute_return_buyer_(.+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { /* ignore */ }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        await axios.post(`${API_URL}/disputes/${disputeId}/confirm-return`, {
            confirmer_id: profileRes.data.id,
            role: 'BUYER'
        });
        await ctx.reply('📦 <b>Shipping Confirmed</b>\n\nThank you — the seller has been notified. Once they confirm receipt, your refund will be issued.', { parse_mode: 'HTML' });
    } catch (err: any) {
        await ctx.reply(`❌ ${err.response?.data?.error || 'Could not confirm shipping. Please try again.'}`);
    }
});

bot.action(/^dispute_return_seller_(.+)$/, async (ctx) => {
    const disputeId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { /* ignore */ }
    try {
        const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
        await axios.post(`${API_URL}/disputes/${disputeId}/confirm-return`, {
            confirmer_id: profileRes.data.id,
            role: 'SELLER'
        });
        await ctx.reply('✅ <b>Receipt Confirmed</b>\n\nGoods received confirmed. The buyer refund credit has been issued.', { parse_mode: 'HTML' });
    } catch (err: any) {
        await ctx.reply(`❌ ${err.response?.data?.error || 'Could not confirm receipt. Please try again.'}`);
    }
});

bot.action(/^txn_(upload_delivery|external_upload)_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { console.error('Answer CB Error:', e); }
    await ctx.reply('📎 <b>Upload Delivery Documents</b>\n\nPlease upload your files here or provide a link for the buyer to review.', { parse_mode: 'HTML' });
});

bot.on('photo', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
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

// When bot is added to a Telegram group — post setup prompt in the group
bot.on('my_chat_member', async (ctx) => {
    const newStatus = ctx.myChatMember?.new_chat_member?.status;
    const chat = ctx.myChatMember?.chat;
    if (!chat || chat.type === 'private') return;

    if (newStatus === 'member' || newStatus === 'administrator') {
        const botUsername = ctx.botInfo?.username || process.env.TELEGRAM_BOT_USERNAME || 'SafeeelyBot';
        const deepLink = `https://t.me/${botUsername}?start=setup_${chat.id}`;

        try {
            await ctx.telegram.sendMessage(
                chat.id,
                `👋 Hi! I'm <b>Safeeely</b> — secure escrow for your buy/sell group.\n\nTo activate Safeeely payments for this group, the admin who added me should tap below and complete a quick setup.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '⚡ Set Up Group Payments', url: deepLink },
                        ]],
                    },
                }
            );
        } catch (e) {
            console.error('Could not post welcome in group:', e);
        }
    }
});

// Helper: render stats for a single group with configurable back button
async function renderGroupDashboard(ctx: SafeeelyContext, group: any, backCallback: string) {
    const analyticsRes = await axios.get(`${API_URL}/communities/${group.id}/analytics?period=30d`);
    const { funnel, summary } = analyticsRes.data;
    const earnings = summary?.earnings ?? [];
    const withdrawable = summary?.withdrawable ?? [];

    const fmtAmt = (amount: number, currency: string) => {
        const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
        return sym[currency]
            ? `${sym[currency]}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${parseFloat(Number(amount).toFixed(8))} ${currency}`;
    };

    const earningsLines = earnings.length
        ? earnings.map((e: any) => `  • <b>${fmtAmt(e.total, e.currency)}</b>`).join('\n')
        : '  • None yet';

    const withdrawLines = withdrawable.length
        ? withdrawable.map((w: any) => `  • <b>${fmtAmt(w.available, w.currency)}</b>`).join('\n')
        : '  • None available';

    const tierEmoji: Record<string, string> = { free: '🟢', pro: '🔵', enterprise: '🟡' };
    const completionRate = funnel?.completionRate ?? 0;

    let expiryLine = '';
    if (group.license_tier !== 'free' && group.license_expires_at) {
        const expiryDate = new Date(group.license_expires_at);
        const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
        const expiryStr = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        expiryLine = daysLeft <= 0
            ? `⚠️ License: <b>EXPIRED</b> — renew to restore earnings\n`
            : daysLeft <= 7
                ? `🚨 Expires: <b>${expiryStr}</b> (${daysLeft} day${daysLeft === 1 ? '' : 's'} left!)\n`
                : `📅 Expires: <b>${expiryStr}</b>\n`;
    }

    const msg =
        `📊 <b>Group Dashboard</b>\n\n` +
        `🏘️ <b>${group.group_name}</b>\n` +
        `${tierEmoji[group.license_tier] || '🟢'} Tier: <b>${group.license_tier.charAt(0).toUpperCase() + group.license_tier.slice(1)}</b>\n` +
        `💰 Revenue Share: <b>${group.admin_revenue_share_percent}%</b>\n` +
        expiryLine +
        `\n📈 <b>Activity</b>\n` +
        `  • Total Deals: <b>${funnel?.totalDeals ?? 0}</b>\n` +
        `  • Completed: <b>${funnel?.completedDeals ?? 0}</b>\n` +
        `  • Completion Rate: <b>${completionRate}%</b>\n` +
        (funnel?.disputedDeals ? `  • Disputed: <b>${funnel.disputedDeals}</b>\n` : '') +
        `\n💵 <b>Your Earnings:</b>\n${earningsLines}\n\n` +
        `💸 <b>Withdrawable:</b>\n${withdrawLines}`;

    const reviewsUrl = (process.env.REVIEWS_URL || 'http://localhost:3001').replace('localhost', '127.0.0.1');
    const analyticsUrl = `${reviewsUrl}/community/${group.id}/analytics`;

    const buttons: any[][] = [];
    if (withdrawable.length) {
        if (withdrawable.length === 1) {
            buttons.push([{ text: '💸 Withdraw Earnings', callback_data: `withdraw_community_${group.id}_${withdrawable[0].currency}` }]);
        } else {
            buttons.push(withdrawable.map((w: any) => ({ text: `💸 Withdraw ${w.currency}`, callback_data: `withdraw_community_${group.id}_${w.currency}` })));
        }
    }
    buttons.push([{ text: '📊 Full Analytics', url: analyticsUrl }]);
    if (group.license_tier !== 'free') {
        buttons.push([{ text: '🔄 Renew License', callback_data: `renew_license_${group.id}` }]);
    }
    if (group.license_tier !== 'enterprise') {
        buttons.push([{ text: '🚀 Upgrade License', callback_data: `upgrade_tier_${group.id}` }]);
    }
    buttons.push([{ text: '🔙 Back', callback_data: backCallback }]);

    return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
}

// Admin group dashboard — single group → stats directly; multiple → picker list
bot.action('my_group_dashboard', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) { }
    try {
        const communityRes = await axios.get(`${API_URL}/communities/by_admin_platform/telegram/${ctx.from?.id}`);
        const { communities } = communityRes.data;

        if (!communities || communities.length === 0) {
            return ctx.reply('ℹ️ You don\'t have any active licensed groups yet.');
        }

        if (communities.length === 1) {
            return renderGroupDashboard(ctx, communities[0], 'main_menu');
        }

        const buttons: any[][] = communities.map((g: any) => [{
            text: `🏘️ ${g.group_name}  ·  ${g.license_tier.charAt(0).toUpperCase() + g.license_tier.slice(1)}`,
            callback_data: `view_group_stats_${g.id}`,
        }]);
        buttons.push([{ text: '🔙 Main Menu', callback_data: 'main_menu' }]);

        return ctx.reply(
            `📊 <b>My Groups</b>\n\nYou manage <b>${communities.length}</b> licensed groups. Select one to view its dashboard:`,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } }
        );
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
});

// Per-group stats (navigated to from the multi-group list)
bot.action(/^view_group_stats_([0-9a-f-]+)$/, async (ctx) => {
    const groupId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { }
    try {
        const statsRes = await axios.get(`${API_URL}/communities/${groupId}/stats`);
        return renderGroupDashboard(ctx, statsRes.data.group, 'my_group_dashboard');
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

// Commission withdrawal — enter wizard with the chosen currency
bot.action(/^withdraw_community_([0-9a-f-]+)_([A-Z]+)$/, async (ctx) => {
    const groupId = ctx.match[1];
    const currency = ctx.match[2];
    try { await ctx.answerCbQuery(); } catch (e) { }
    try {
        const statsRes = await axios.get(`${API_URL}/communities/${groupId}/stats`);
        const { group, withdrawable } = statsRes.data;
        const entry = (withdrawable || []).find((w: any) => w.currency === currency);
        if (!entry || entry.available <= 0) {
            return ctx.reply('ℹ️ No withdrawable balance for this currency.');
        }
        return (ctx as any).scene.enter('community_withdraw_wizard', {
            groupId,
            currency,
            available: entry.available,
            groupName: group.group_name,
        });
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

// Show tier upgrade options — always fetches the specific group's tier from stats
bot.action(/^upgrade_tier_([0-9a-f-]+)$/, async (ctx) => {
    const groupId = ctx.match[1];
    try { await ctx.answerCbQuery(); } catch (e) { }
    try {
        const statsRes = await axios.get(`${API_URL}/communities/${groupId}/stats`);
        const { group } = statsRes.data;

        const currentTier = group.license_tier as string;
        const msg =
            `🚀 <b>Upgrade Your License</b>\n\n` +
            `Group: <b>${group.group_name}</b>\n` +
            `Current tier: <b>${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</b>\n\n` +
            `Choose a plan:\n\n` +
            `🔵 <b>Pro</b> — ₦15,000/month\n  • 25% revenue share on every platform fee\n\n` +
            `🟡 <b>Enterprise</b> — ₦35,000/month\n  • 40% revenue share on every platform fee`;

        const buttons: any[][] = [];
        if (currentTier === 'free') {
            buttons.push([{ text: '🔵 Pro — ₦15,000/mo', callback_data: `confirm_upgrade_${groupId}_pro` }]);
        }
        buttons.push([{ text: '🟡 Enterprise — ₦35,000/mo', callback_data: `confirm_upgrade_${groupId}_enterprise` }]);
        buttons.push([{ text: '🔙 Back', callback_data: `view_group_stats_${groupId}` }]);

        return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
    } catch (err: any) {
        ctx.reply(`❌ Error: ${err.message}`);
    }
});

// Generate payment link and send to admin
bot.action(/^confirm_upgrade_([0-9a-f-]+)_(pro|enterprise)$/, async (ctx) => {
    const groupId = ctx.match[1];
    const targetTier = ctx.match[2];
    try { await ctx.answerCbQuery('⏳ Generating payment link...'); } catch (e) { }
    try {
        const tierLabels: Record<string, string> = { pro: 'Pro — ₦15,000', enterprise: 'Enterprise — ₦35,000' };
        await ctx.reply('⏳ <b>Generating your payment link...</b>', { parse_mode: 'HTML' });

        const upgradeRes = await axios.post(`${API_URL}/communities/${groupId}/upgrade/initiate`, {
            target_tier: targetTier,
        });
        const { payment_url } = upgradeRes.data;

        const tierName = targetTier.charAt(0).toUpperCase() + targetTier.slice(1);
        const msg =
            `💳 <b>Complete Your Upgrade</b>\n\n` +
            `Plan: <b>${tierLabels[targetTier]}/month</b>\n\n` +
            `Tap the button below to pay securely. Your tier will upgrade automatically once payment is confirmed.`;

        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `💳 Pay for ${tierName} Now`, url: payment_url }],
                    [{ text: '🔙 Back', callback_data: 'my_group_dashboard' }],
                ],
            },
        });
    } catch (err: any) {
        ctx.reply(`❌ Could not generate payment link: ${err.response?.data?.error || err.message}`);
    }
});

// Renew an existing paid license
bot.action(/^renew_license_([0-9a-f-]+)$/, async (ctx) => {
    const groupId = ctx.match[1];
    try { await ctx.answerCbQuery('⏳ Generating renewal link...'); } catch (e) { }
    try {
        await ctx.reply('⏳ <b>Generating your renewal link...</b>', { parse_mode: 'HTML' });

        const renewRes = await axios.post(`${API_URL}/communities/${groupId}/renew/initiate`);
        const statsRes = await axios.get(`${API_URL}/communities/${groupId}/stats`);
        const { group } = statsRes.data;
        const renewUrl = renewRes.data.payment_url.replace('localhost', '127.0.0.1');
        const tierName = group.license_tier.charAt(0).toUpperCase() + group.license_tier.slice(1);

        return ctx.reply(
            `🔄 <b>Renew License</b>\n\n` +
            `Group: <b>${group.group_name}</b>\n` +
            `Tier: <b>${tierName}</b>\n\n` +
            `Tap below to renew for another 30 days and keep your revenue share.`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💳 Pay & Renew', url: renewUrl }],
                        [{ text: '🔙 Back', callback_data: `view_group_stats_${groupId}` }],
                    ],
                },
            }
        );
    } catch (err: any) {
        ctx.reply(`❌ Could not generate renewal link: ${err.response?.data?.error || err.message}`);
    }
});

bot.on('message', async (ctx) => {
    const msg = ctx.message;
    if (!msg) return;

    // Handle @mention of the bot in group chats — everything else in groups is ignored
    if (ctx.chat?.type !== 'private') {
        const textMsg = msg as any;
        const botUsername = (ctx as any).botInfo?.username;
        const hasMention = botUsername && Array.isArray(textMsg.entities) &&
            textMsg.entities.some((e: any) =>
                e.type === 'mention' &&
                textMsg.text?.substring(e.offset + 1, e.offset + e.length) === botUsername
            );
        if (hasMention) {
            await handleGroupTradeRequest(ctx, ctx.chat.id);
        }
        return;
    }

    let textBody = '';
    let audioBuffer: Buffer | undefined;
    let mimeType: string | undefined;
    const m = msg as any;

    if (m.voice || m.audio) {
        await ctx.reply("🎙️ Processing your request...");
        try {
            const fileId = m.voice ? m.voice.file_id : m.audio.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
            audioBuffer = Buffer.from(response.data);
            mimeType = m.voice ? m.voice.mime_type || 'audio/ogg' : m.audio.mime_type || 'audio/mp3';
        } catch (e: any) {
            console.error('Audio fetch error:', e.message);
            return ctx.reply("❌ Could not process your audio. Please try again.");
        }
    } else if (m.text && !m.text.startsWith('/')) {
        textBody = m.text;
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
