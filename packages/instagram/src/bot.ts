import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import * as Sentry from '@sentry/node';
import { buildMagicLink, fetchBotBalance } from './utils/magicLink';
import { processSmartTransaction, SmartTransactionDraft, getCommentPrompt, pickRandom, FEEDBACK_SUCCESS_MESSAGES } from '@safepal/shared';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
});

import crypto from 'crypto';

const app = express();
app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; }
}));

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const HUB_VERIFY_TOKEN      = process.env.INSTAGRAM_VERIFY_TOKEN || '';
const API_URL                = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const PUBLIC_API_URL         = process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL            = process.env.REVIEWS_URL || 'http://localhost:3001';
const IG_BASE                = 'https://graph.facebook.com/v18.0';
const BOT_AUTH_HEADERS       = process.env.BOT_API_SECRET
    ? { 'Authorization': `Bearer ${process.env.BOT_API_SECRET}`, 'x-bot-platform': 'instagram' }
    : {};

console.log(`📸 Safeeely Instagram Bot Starting...`);

// ─── State machine ────────────────────────────────────────────────────────────
// Each entry: { mode, step, formData, smartDraft? }
const userStates: Record<string, any> = {};
const pendingReferrals: Record<string, string> = {};

// ─── Message helpers ──────────────────────────────────────────────────────────

async function sendMsg(psid: string, payload: any) {
    try {
        await axios.post(`${IG_BASE}/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`, {
            recipient: { id: psid },
            message: payload
        });
    } catch (err: any) {
        console.error('❌ Instagram send error:', err.response?.data?.error?.message || err.message);
    }
}

function qr(text: string, options: Array<{ title: string; payload: string }>) {
    return {
        text,
        quick_replies: options.map(o => ({
            content_type: 'text',
            title: o.title.substring(0, 20),
            payload: o.payload
        }))
    };
}

function btnTemplate(text: string, buttons: Array<{ type: string; title: string; payload?: string; url?: string }>) {
    return {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'button',
                text: text.substring(0, 640),
                buttons: buttons.slice(0, 3).map(b => b.url
                    ? { type: 'web_url', url: b.url, title: b.title.substring(0, 20) }
                    : { type: 'postback', payload: b.payload || b.title, title: b.title.substring(0, 20) }
                )
            }
        }
    };
}

function genericTemplate(elements: any[]) {
    return {
        attachment: {
            type: 'template',
            payload: { template_type: 'generic', elements: elements.slice(0, 10) }
        }
    };
}

function formatAccountAge(createdAt: string): string {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''}`;
}

function fmtCurrency(amount: number, currency: string) {
    const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    return sym[currency]
        ? `${sym[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${parseFloat(amount.toFixed(8))} ${currency}`;
}

function statusLabel(status: string) {
    const map: Record<string, string> = {
        PENDING_SELLER_ACCEPTANCE: '⏳ Awaiting Acceptance',
        ACCEPTED: '✅ Accepted',
        PAID: '💳 Paid',
        AWAITING_PROOF: '📎 Awaiting Proof',
        COMPLETED_BY_SELLER: '📦 Marked Complete',
        COMPLETED: '✅ Completed',
        DISPUTED: '⚠️ Disputed',
        CANCELLED: '❌ Cancelled',
        REFUNDED: '💸 Refunded'
    };
    return map[status] || status;
}

// ─── Setup: persistent menu + ice breakers ────────────────────────────────────

async function setupMenus() {
    if (!INSTAGRAM_ACCESS_TOKEN) {
        console.warn('⚠️ INSTAGRAM_ACCESS_TOKEN not set — skipping menu setup');
        return;
    }
    try {
        await axios.post(`${IG_BASE}/me/messenger_profile?access_token=${INSTAGRAM_ACCESS_TOKEN}`, {
            ice_breakers: [
                { question: '🚀 Get Started', payload: 'AGREE_POLICY' }
            ],
            persistent_menu: [{
                locale: 'default',
                composer_input_disabled: false,
                call_to_actions: [
                    { type: 'postback', title: '🛒 Create Transaction',   payload: 'CREATE_TXN' },
                    { type: 'postback', title: '📋 My Transactions',       payload: 'MY_TXNS'    },
                    { type: 'postback', title: '⚙️ Settings & Account',   payload: 'SETTINGS'   },
                    { type: 'postback', title: '💰 Balance & Withdrawals', payload: 'BALANCE'    },
                    { type: 'postback', title: '🎁 Referral',              payload: 'REFERRAL'   },
                    { type: 'postback', title: '⭐ Reviews & Ratings',     payload: 'REVIEWS'    },
                    { type: 'postback', title: '❓ Help',                  payload: 'HELP'       }
                ]
            }]
        });
        console.log('✅ Instagram persistent menu & ice breakers configured');
    } catch (err: any) {
        console.error('❌ Menu setup failed:', err.response?.data?.error || err.message);
    }
}

// ─── Profile fetch ────────────────────────────────────────────────────────────

async function getProfile(psid: string) {
    const res = await axios.get(`${API_URL}/profiles/by_platform/instagram/${psid}`);
    return res.data;
}

// ─── Flow: post-action quick reply shortcuts ──────────────────────────────────

async function sendNextOptions(psid: string, extras: Array<{ title: string; payload: string }> = []) {
    await sendMsg(psid, qr('What would you like to do next?', [
        ...extras,
        { title: '📋 My Txns',    payload: 'MY_TXNS'    },
        { title: '🏠 Main Menu',  payload: 'MAIN_MENU'  }
    ]));
}

// ─── Flow: greeting ───────────────────────────────────────────────────────────

async function sendWelcome(psid: string) {
    await sendMsg(psid, btnTemplate(
        '👋 Welcome to Safeeely!\n\nYour trusted escrow service for secure social media transactions.\n\n🔒 Secure | 🌍 Cross-Platform | ⚡ Fast\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data.',
        [
            { type: 'web_url', url: 'https://safeeely.com/privacy', title: '📋 Read Policy' },
            { type: 'postback', payload: 'AGREE_POLICY', title: '✅ Agree & Continue' }
        ]
    ));
}

async function checkAndGreet(psid: string) {
    try {
        const profile = await getProfile(psid);
        if (profile?.is_deactivated) {
            await sendMsg(psid, { text: '⚠️ Your Safeeely account has been deactivated. Please contact support@safeeely.com if you believe this is a mistake.' });
            return;
        }
        if (profile?.is_blocked) {
            await sendMsg(psid, btnTemplate(
                '🚫 This account has been blocked. Want to reactivate it?',
                [{ type: 'web_url', url: `${REVIEWS_URL}/account/block?mode=activate&safetag=${encodeURIComponent(profile.safetag)}`, title: '🔓 Reactivate my account' }]
            ));
            return;
        }
        if (profile?.safetag) {
            await sendMsg(psid, { text: `👋 Welcome back, ${profile.first_name || 'there'}!` });
            await sendNextOptions(psid, [{ title: '🛒 Create Txn', payload: 'CREATE_TXN' }]);
            return;
        }
    } catch (e: any) {
        if (e.response?.status !== 404) console.error('Instagram profile check error:', e.message);
    }
    await sendWelcome(psid);
}

// ─── Flow: settings ───────────────────────────────────────────────────────────

async function showSettings(psid: string) {
    try {
        const p = await getProfile(psid);
        const safetag  = p.safetag  || 'N/A';
        const email    = p.email    || 'N/A';
        const name     = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'N/A';

        await sendMsg(psid, btnTemplate(
            `⚙️ Account Settings\n\n👤 Safetag: ${safetag}\n📧 Email: ${email}\n👤 Name: ${name}\n\nManage your account and privacy preferences below:`,
            [
                { type: 'postback', payload: 'START_DELETION',   title: '❌ Delete Account' },
                { type: 'postback', payload: 'OTHER_SETTINGS',   title: '⚙️ Other Settings' },
                { type: 'postback', payload: 'SEND_FEEDBACK',    title: '💭 Send Feedback'  }
            ]
        ));
    } catch (err: any) {
        await sendMsg(psid, { text: '❌ Could not load your settings. Please try again.' });
    }
}

async function showOtherSettings(psid: string) {
    try {
        const p = await getProfile(psid);
        const kycUrl = await buildMagicLink({ platform_id: psid, scope: 'kyc', fallbackUrl: `${REVIEWS_URL}/kyc` });
        await sendMsg(psid, btnTemplate(
            '⚙️ Other Settings\n\nManage your linked accounts and identity verification:',
            [
                { type: 'postback', payload: 'LINKED_ACCOUNTS',   title: '🔗 Linked Accounts'   },
                { type: 'web_url',  url: kycUrl,                  title: '🛡️ KYC Verification'  },
                { type: 'postback', payload: 'SETTINGS',          title: '🔙 Back'              }
            ]
        ));
    } catch (err: any) {
        await sendMsg(psid, { text: '❌ Could not load settings. Please try again.' });
    }
}

// ─── Flow: balance ────────────────────────────────────────────────────────────

async function showBalance(psid: string) {
    try {
        const p = await getProfile(psid);

        // Generate magic link FIRST — independent of balance fetch
        const withdrawUrl = await buildMagicLink({ platform_id: psid, scope: 'withdraw', fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(p.safetag)}` });

        // Attempt balance fetch via bot-authenticated endpoint
        let msg = '💰 Balance & Withdrawals\n\n';
        try {
            const balData = await fetchBotBalance({ platform_id: psid });
            if (balData === null) {
                msg += 'Tap below to view your full balance breakdown.';
            } else if (!balData.balances?.length) {
                msg += 'You have no available balance yet. Complete transactions to earn!';
            } else {
                balData.balances.forEach((b: any) => {
                    const flag = b.currency === 'NGN' ? '🇳🇬' : b.currency === 'USD' ? '🇺🇸' : '🪙';
                    msg += `${flag} ${b.amount.toLocaleString()} ${b.currency}\n`;
                });
                msg += '\nBalances are from your completed (finalized) sales.';
            }
        } catch {
            msg += 'Tap below to view your full balance breakdown.';
        }

        await sendMsg(psid, btnTemplate(msg, [
            { type: 'web_url',  url: withdrawUrl,  title: '💸 Withdraw Funds'  },
            { type: 'postback', payload: 'MAIN_MENU', title: '🔙 Main Menu'    }
        ]));
    } catch (err: any) {
        await sendMsg(psid, { text: '❌ Could not load your balance. Please try again.' });
    }
}

// ─── Flow: referral ───────────────────────────────────────────────────────────

async function showReferral(psid: string) {
    try {
        const p = await getProfile(psid);
        const safetag = p.safetag;
        const statsRes = await axios.get(`${API_URL}/referrals/${safetag}/stats`);
        const stats = statsRes.data;

        const cleanSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const referralLink = `${REVIEWS_URL}/${cleanSafetag}`;
        const withdrawUrl  = (await buildMagicLink({ platform_id: psid, scope: 'withdraw', fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}` })) + '#referrals';

        const earningsLines = stats.earningsByCurrency?.length
            ? stats.earningsByCurrency.map((e: any) => `  • ${fmtCurrency(e.totalEarned, e.currency)}`).join('\n')
            : '  • None yet';

        const caption =
            `🎁 My Referrals\n\n` +
            `Invite friends and earn up to 1.5% commission for life on all secured purchases!\n\n` +
            `🔗 Your Invite Link:\n${referralLink}\n\n` +
            `📊 Statistics:\n` +
            `👥 Tier 1 Referrals: ${stats.tier1Count}\n` +
            `👥 Tier 2 Referrals: ${stats.tier2Count}\n` +
            `💰 Commissions Earned:\n${earningsLines}`;

        // Try to send referral card image
        const cardUrl = `${PUBLIC_API_URL}/referrals/${safetag}/card`;
        try {
            await sendMsg(psid, {
                attachment: { type: 'image', payload: { url: cardUrl, is_reusable: true } }
            });
        } catch (_) {
            // Image will be unavailable in dev — fall through to text
        }

        await sendMsg(psid, { text: caption });
        await sendMsg(psid, btnTemplate('Manage your referral earnings:', [
            { type: 'web_url',  url: withdrawUrl,     title: '💸 Withdraw Earnings' },
            { type: 'postback', payload: 'MAIN_MENU', title: '🔙 Main Menu'         }
        ]));
    } catch (err: any) {
        await sendMsg(psid, { text: '❌ Could not load referral info. Please try again.' });
    }
}

// ─── Flow: my transactions ────────────────────────────────────────────────────

async function showTransactions(psid: string, filter: string) {
    try {
        const p = await getProfile(psid);
        const filterMap: Record<string, string> = {
            FILTER_ONGOING:   'ongoing',
            FILTER_COMPLETED: 'completed',
            FILTER_DISPUTED:  'disputed',
            FILTER_ALL:       'all'
        };
        const statusParam = filterMap[filter] || 'all';
        const res = await axios.get(`${API_URL}/transactions?safetag=${p.safetag}&status=${statusParam}`);
        const txns: any[] = res.data?.transactions || res.data || [];

        if (!txns.length) {
            await sendMsg(psid, btnTemplate(
                'You have no transactions yet.',
                [{ type: 'postback', payload: 'CREATE_TXN', title: '🛒 Create One' }]
            ));
            return;
        }

        const elements = txns.slice(0, 10).map((t: any) => {
            const isBuyer = t.buyer_safetag === p.safetag;
            const other   = isBuyer ? t.seller_safetag : t.buyer_safetag;
            const amount  = t.amount ? `${t.amount} ${t.currency}` : '';
            return {
                title:    (t.product_name || 'Transaction').substring(0, 80),
                subtitle: `${statusLabel(t.status)} | ${amount} | w/ ${other}`.substring(0, 80),
                buttons:  [{ type: 'postback', title: 'View Details', payload: `VIEW_TXN_${t.id}` }]
            };
        });

        await sendMsg(psid, genericTemplate(elements));
    } catch (err: any) {
        await sendMsg(psid, { text: '❌ Could not load transactions. Please try again.' });
    }
}

async function showTransactionDetail(psid: string, txnId: string) {
    try {
        const p = await getProfile(psid);
        const res = await axios.get(`${API_URL}/transactions/${txnId}`);
        const t = res.data;
        const isBuyer = t.buyer_safetag === p.safetag;
        const role    = isBuyer ? 'buyer' : 'seller';
        const other   = isBuyer ? t.seller_safetag : t.buyer_safetag;

        let milestoneText = '';
        if (t.milestones?.length) {
            milestoneText = '\n\n📍 Milestones:\n' + t.milestones.map((m: any, i: number) => {
                const emoji = m.status === 'RELEASED' ? '✅' : m.status === 'COMPLETED' ? '📦' : '⏳';
                return `${emoji} ${i + 1}. ${m.title} — ${m.amount} ${t.currency}`;
            }).join('\n');
        }

        const detail =
            `📋 Transaction Details\n\n` +
            `🆔 ID: ${t.txn_code || t.id}\n` +
            `📦 Product: ${t.product_name}\n` +
            `📝 Description: ${t.description || 'N/A'}\n` +
            `💰 Amount: ${t.amount} ${t.currency}\n` +
            `👤 ${isBuyer ? 'Seller' : 'Buyer'}: ${other}\n` +
            `📊 Status: ${statusLabel(t.status)}` +
            milestoneText;

        await sendMsg(psid, { text: detail });

        // Contextual actions — milestone transactions get per-milestone quick replies
        const isMilestone = t.transaction_type === 'MILESTONE';
        const actions: Array<{ title: string; payload: string }> = [];
        if (t.status === 'PENDING_SELLER_ACCEPTANCE' && role === 'seller') {
            actions.push({ title: '✅ Accept',     payload: `ACCEPT_TXN_${t.id}` });
            actions.push({ title: '❌ Decline',    payload: `DECLINE_TXN_${t.id}` });
        }
        if (t.status === 'ACCEPTED' && role === 'buyer') {
            const payUrl = `${REVIEWS_URL}/pay/${t.id}`;
            await sendMsg(psid, btnTemplate('Ready to pay?', [
                { type: 'web_url', url: payUrl, title: '💳 Pay Now' },
                { type: 'postback', payload: `DISPUTE_TXN_${t.id}`, title: '🚩 Dispute' },
                { type: 'postback', payload: 'MY_TXNS', title: '🔙 Back' }
            ]));
            return;
        }
        if (t.status === 'PAID' && role === 'seller') {
            if (isMilestone) {
                const pending = (t.milestones || []).filter((m: any) => m.status === 'PENDING');
                // Quick replies max 13 total; reserve 2 for dispute + back, show up to 11 milestones
                for (const m of pending.slice(0, 11)) {
                    actions.push({ title: `📦 ${m.title}`.substring(0, 20), payload: `COMPLETE_MILE|${t.id}|${m.id}` });
                }
                if (pending.length > 11) {
                    await sendMsg(psid, { text: `ℹ️ Showing 11 of ${pending.length} pending milestones. Complete these first, then tap My Txns to see remaining phases.` });
                }
            } else {
                actions.push({ title: '📦 Mark Complete', payload: `COMPLETE_TXN_${t.id}` });
            }
            actions.push({ title: '🚩 Dispute', payload: `DISPUTE_TXN_${t.id}` });
        }
        if (t.status === 'AWAITING_PROOF' && role === 'buyer' && !isMilestone) {
            actions.push({ title: '✅ Mark Received', payload: `RECEIVED_TXN_${t.id}` });
            actions.push({ title: '🚩 Dispute',       payload: `DISPUTE_TXN_${t.id}` });
        }
        if (isMilestone && role === 'buyer' && ['PAID', 'COMPLETED_BY_SELLER'].includes(t.status)) {
            const completed = (t.milestones || []).filter((m: any) => m.status === 'COMPLETED');
            if (completed.length > 0) {
                await sendMsg(psid, btnTemplate(
                    '🔍 Review the seller\'s delivery proof before releasing funds:',
                    [{ type: 'web_url', url: `${REVIEWS_URL}/delivery/${t.id}`, title: '🔍 View Delivery Proof' }]
                ));
                for (const m of completed.slice(0, 11)) {
                    actions.push({ title: `💸 ${m.title}`.substring(0, 20), payload: `RELEASE_MILE|${t.id}|${m.id}` });
                }
                if (completed.length > 11) {
                    await sendMsg(psid, { text: `ℹ️ Showing 11 of ${completed.length} completed milestones. Release these first, then tap My Txns to see remaining phases.` });
                }
                if (!actions.find(a => a.payload === `DISPUTE_TXN_${t.id}`)) {
                    actions.push({ title: '🚩 Dispute', payload: `DISPUTE_TXN_${t.id}` });
                }
            }
        }
        if (['COMPLETED', 'FINALIZED'].includes(t.status)) {
            actions.push({ title: '⭐ Leave Review', payload: `REVIEW_TXN_${t.id}_${other}` });
        }
        if (!['COMPLETED', 'CANCELLED', 'REFUNDED', 'FINALIZED'].includes(t.status) && !actions.find(a => a.payload === `DISPUTE_TXN_${t.id}`)) {
            actions.push({ title: '🚩 Dispute', payload: `DISPUTE_TXN_${t.id}` });
        }
        actions.push({ title: '🔙 Back', payload: 'MY_TXNS' });

        await sendMsg(psid, qr('Choose an action:', actions.slice(0, 13)));
    } catch (err: any) {
        await sendMsg(psid, { text: '❌ Could not load transaction details. Please try again.' });
    }
}

// ─── Flow: counterparty preview ───────────────────────────────────────────────

async function showCounterpartyPreview(psid: string, counterpartyProfile: any, safetag: string) {
    const rating   = counterpartyProfile.average_rating ? `⭐ ${counterpartyProfile.average_rating}/5` : '⭐ No ratings yet';
    const verified = counterpartyProfile.kyc_verified ? '🛡️ KYC Verified' : '';
    const badges   = counterpartyProfile.badges?.join(' ') || '';
    const subtitle = [rating, verified, badges].filter(Boolean).join(' | ').substring(0, 80);
    const reviewsUrl = `${REVIEWS_URL}/${safetag.startsWith('@') ? safetag : '@' + safetag}`;

    let completedTrades = 0;
    try {
        const statsRes = await axios.get(`${API_URL}/profiles/${encodeURIComponent(safetag)}/stats`);
        completedTrades = statsRes.data.completed_trades ?? 0;
    } catch (_) {}

    const ageLine = counterpartyProfile.created_at
        ? `\n📅 Member for: ${formatAccountAge(counterpartyProfile.created_at)}`
        : '';
    const tradesLine = `\n${completedTrades === 0 ? '⚠️' : '✅'} Completed trades: ${completedTrades}`;
    const previewText = `${safetag}${ageLine}${tradesLine}`;

    await sendMsg(psid, genericTemplate([{
        title:    previewText.substring(0, 80),
        subtitle: subtitle || 'New user',
        buttons:  [
            { type: 'postback', title: '✅ Confirm',       payload: 'CONFIRM_COUNTERPARTY' },
            { type: 'web_url',  url: reviewsUrl,           title: '👁️ View Reviews'        },
            { type: 'postback', title: '❌ Cancel',         payload: 'CANCEL_TXN'          }
        ]
    }]));
}

// ─── Flow: transaction summary + creation ────────────────────────────────────

async function showTransactionSummary(psid: string) {
    const state = userStates[psid];
    const fd    = state.formData;

    let milestoneText = '';
    if (fd.transaction_type === 'MILESTONE' && fd.milestones?.length) {
        const total = fd.milestones.reduce((s: number, m: any) => s + Number(m.amount), 0);
        milestoneText = '\n📍 Milestones:\n' + fd.milestones.map((m: any, i: number) =>
            `  ${i + 1}. ${m.title} — ${m.amount} ${fd.currency}`
        ).join('\n') + `\n💰 Total: ${total} ${fd.currency}`;
    }

    // Feature 3: risk-factor warning system
    let riskWarningMsg = '';
    try {
        const p = await getProfile(psid);
        const buyerSafetag  = fd.role === 'buyer' ? p.safetag : fd.counterparty_safetag;
        const sellerSafetag = fd.role === 'seller' ? p.safetag : fd.counterparty_safetag;
        const [pairRes, sellerStatsRes, sellerReviewRes] = await Promise.all([
            axios.get(`${API_URL}/transactions/pair-history?buyer=${encodeURIComponent(buyerSafetag)}&seller=${encodeURIComponent(sellerSafetag)}`),
            axios.get(`${API_URL}/profiles/${encodeURIComponent(sellerSafetag)}/stats`),
            axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(sellerSafetag)}`),
        ]);

        const pairCount      = pairRes.data.completed_count ?? 0;
        const completedTrades = sellerStatsRes.data.completed_trades ?? 0;
        const memberDays     = Math.floor((Date.now() - new Date(sellerStatsRes.data.member_since).getTime()) / 86_400_000);
        const reviewCount    = sellerReviewRes.data.review_count ?? 0;

        const risks: string[] = [];
        if (completedTrades === 0) risks.push('⚠️ Seller has no completed trades on Safeeely');
        if (memberDays < 14) risks.push(`⚠️ Seller joined only ${memberDays} day${memberDays !== 1 ? 's' : ''} ago`);
        if (reviewCount === 0) risks.push('⚠️ Seller has no reviews yet');
        if (pairCount === 0) risks.push('⚠️ You have never completed a trade with this person before');

        if (risks.length >= 2) {
            riskWarningMsg = `🚨 Risk Factors Detected\n\n${risks.join('\n')}\n\nThese are common patterns in scam attempts. Only proceed if you have verified this seller independently.`;
        }
    } catch (_) {
        // Fail silently
    }

    const summary =
        `📋 Transaction Summary\n\n` +
        `📦 Product: ${fd.product_name}\n` +
        `📝 Description: ${fd.description || 'N/A'}\n` +
        `💠 Type: ${fd.transaction_type === 'MILESTONE' ? 'Milestone' : 'One-Time'}\n` +
        (fd.transaction_type === 'ONE_TIME' ? `💰 Amount: ${fd.amount} ${fd.currency}\n` : milestoneText + '\n') +
        `💵 Fee: ${fd.fee_allocation === 'buyer' ? 'Buyer Pays' : fd.fee_allocation === 'seller' ? 'Seller Pays' : 'Split 50/50'}\n` +
        `👤 ${fd.role === 'buyer' ? 'Seller' : 'Buyer'}: ${fd.counterparty_safetag}\n` +
        `💠 Your Role: ${fd.role === 'buyer' ? 'Buyer 🛒' : 'Seller 🤝'}`;

    if (riskWarningMsg) await sendMsg(psid, { text: riskWarningMsg });
    await sendMsg(psid, { text: summary });
    await sendMsg(psid, qr('Confirm or cancel this transaction:', [
        { title: '✅ Create',  payload: 'CREATE_TXN_CONFIRM' },
        { title: '❌ Cancel',  payload: 'CANCEL_TXN'         }
    ]));
    state.step = 'AWAITING_FINAL_CONFIRM';
}

async function createTransaction(psid: string) {
    const state = userStates[psid];
    const fd    = state.formData;
    try {
        const p   = await getProfile(psid);
        const totalAmount = fd.transaction_type === 'ONE_TIME'
            ? Number(fd.amount)
            : (fd.milestones || []).reduce((s: number, m: any) => s + Number(m.amount), 0);
        const body: any = {
            buyer_safetag:    fd.role === 'buyer' ? p.safetag : fd.counterparty_safetag,
            seller_safetag:   fd.role === 'seller' ? p.safetag : fd.counterparty_safetag,
            product_name:     fd.product_name,
            description:      fd.description || '',
            currency:         fd.currency,
            fee_allocation:   fd.fee_allocation,
            transaction_type: fd.transaction_type,
            initiator_safetag: p.safetag,
            amount:           totalAmount,
            send_invoice:     fd.send_invoice || false,
        };
        if (fd.transaction_type === 'MILESTONE') body.milestones = fd.milestones;
        if (fd.attachment_url) body.attachment_url = fd.attachment_url;

        const res = await axios.post(`${API_URL}/transactions/create`, body);
        const txn = res.data;
        delete userStates[psid];

        const counterpartyRole = fd.role === 'buyer' ? 'Seller' : 'Buyer';
        await sendMsg(psid, {
            text:
                `✅ Transaction Created!\n\n` +
                `Your transaction has been created and sent to the ${counterpartyRole.toLowerCase()}.\n\n` +
                `📋 Transaction ID: ${txn.txn_code || txn.id}\n` +
                `👤 ${counterpartyRole}: ${fd.counterparty_safetag}\n` +
                `💰 Amount: ${totalAmount} ${fd.currency}\n\n` +
                `📬 You'll be notified when:\n` +
                `• ${counterpartyRole} accepts your request\n` +
                `• Payment is required\n` +
                `• Delivery is confirmed\n\n` +
                `⏳ Current Status: Awaiting ${counterpartyRole} Acceptance` +
                (fd.send_invoice ? '\n\n📧 Invoice emailed to buyer!' : '')
        });
        await sendNextOptions(psid, [{ title: '👁️ View Txns', payload: 'MY_TXNS' }]);
    } catch (err: any) {
        delete userStates[psid];
        const errData = err.response?.data;
        if (errData?.error === 'AMOUNT_LIMIT_EXCEEDED') {
            const kycUrl = await buildMagicLink({ platform_id: psid, scope: 'kyc', fallbackUrl: `${REVIEWS_URL}/kyc` }).catch(() => `${REVIEWS_URL}/kyc`);
            await sendMsg(psid, btnTemplate(
                `⚠️ Transaction Limit Exceeded\n\n${errData.message || 'Your unverified account has a transaction limit. Complete identity verification to unlock higher amounts.'}`,
                [{ type: 'web_url', url: kycUrl, title: '✅ Verify Account' }]
            ));
        } else {
            await sendMsg(psid, { text: `❌ Failed to create transaction: ${errData?.error || err.message}` });
        }
    }
}

// ─── Flow handlers: text input ────────────────────────────────────────────────

async function handleRegistration(psid: string, rawText: string) {
    const state = userStates[psid];
    const text  = rawText.toLowerCase().trim();

    if (state.step === 'ASK_NAME') {
        state.formData.first_name = rawText.trim();
        state.step = 'ASK_LAST_NAME';
        await sendMsg(psid, qr('📝 Step 2/5\nPlease enter your last name:', [{ title: '⬅️ Back', payload: 'BACK_REGISTER' }]));

    } else if (state.step === 'ASK_LAST_NAME') {
        state.formData.last_name = rawText.trim();
        state.step = 'ASK_EMAIL';
        await sendMsg(psid, qr('📝 Step 3/5\nPlease enter your email address:', [{ title: '⬅️ Back', payload: 'BACK_REGISTER' }]));

    } else if (state.step === 'ASK_EMAIL') {
        if (!text.includes('@')) {
            await sendMsg(psid, { text: '❌ Invalid email. Please enter a valid email address:' });
            return;
        }
        state.formData.email = rawText.trim();
        state.step = 'ASK_SAFETAG';
        await sendMsg(psid, qr('📝 Step 4/5\nChoose your Safetag (e.g. @john_doe):', [{ title: '⬅️ Back', payload: 'BACK_REGISTER' }]));

    } else if (state.step === 'ASK_SAFETAG') {
        const safetag = rawText.trim().startsWith('@') ? rawText.trim() : `@${rawText.trim()}`;
        try {
            await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(safetag)}`);
            await sendMsg(psid, { text: `❌ Safetag ${safetag} is already taken. Please choose a different one:` });
            return;
        } catch (e: any) {
            if (e.response?.status !== 404) {
                await sendMsg(psid, { text: '❌ Could not verify safetag. Please try again.' });
                return;
            }
        }
        state.formData.safetag = safetag;
        await sendMsg(psid, { text: `✅ @${safetag.replace('@', '')} is available!` });
        try {
            await axios.post(`${API_URL}/auth/email-otp/send`, { email: state.formData.email });
            state.step = 'VERIFY_OTP';
            await sendMsg(psid, qr(
                `📧 Step 5/5\nWe've sent a verification code to ${state.formData.email}.\n\nPlease reply with the 6-digit code:`,
                [{ title: '🔄 Resend Code', payload: 'RESEND_REGISTER_OTP' }]
            ));
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to send verification code. Please try again.'}` });
            delete userStates[psid];
        }

    } else if (state.step === 'VERIFY_OTP') {
        try {
            await axios.post(`${API_URL}/auth/email-otp/verify`, { email: state.formData.email, code: rawText.trim() });
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Invalid code. Please try again:'}` });
            return;
        }
        try {
            await axios.post(`${API_URL}/profiles/register`, {
                first_name:       state.formData.first_name,
                last_name:        state.formData.last_name,
                email:            state.formData.email,
                safetag:          state.formData.safetag,
                primary_platform: 'instagram',
                platform_id:      psid,
                referral_code:    state.formData.referralCode
            });
            delete userStates[psid];
            let statsLine = '';
            try {
                const statsRes = await axios.get(`${API_URL}/profiles/stats/public`);
                const { total_users, total_completed_trades } = statsRes.data;
                statsLine = `\n\n🌍 You've joined ${total_users.toLocaleString()} users who've safely completed ${total_completed_trades.toLocaleString()} trades on Safeeely.`;
            } catch (_) {}
            await sendMsg(psid, { text: `🎉 Registration Complete!\n\n✅ You're all set!\n\nYour Safetag: ${state.formData.safetag}\n📧 Email: ${state.formData.email}\n\n🔐 Your account is secure and ready to use${statsLine}` });
            await sendNextOptions(psid, [{ title: '🛒 Create Txn', payload: 'CREATE_TXN' }]);
        } catch (err: any) {
            delete userStates[psid];
            await sendMsg(psid, { text: `❌ Registration failed: ${err.response?.data?.error || err.message}` });
        }
    }
}

async function handleLogin(psid: string, rawText: string) {
    const state = userStates[psid];

    if (state.step === 'ASK_SAFETAG') {
        const safetag = rawText.trim().startsWith('@') ? rawText.trim() : `@${rawText.trim()}`;
        state.formData.safetag = safetag;
        try {
            await axios.post(`${API_URL}/auth/otp/send`, { safetag, platform: 'instagram', platform_id: psid });
            state.step = 'VERIFY_OTP';
            await sendMsg(psid, qr(
                `🔐 OTP Verification\n\nWe've sent a 6-digit code to your email and linked accounts.\n\nPlease enter the code:`,
                [{ title: '🔄 Resend Code', payload: 'RESEND_LOGIN_OTP' }]
            ));
        } catch (err: any) {
            await sendMsg(psid, qr(
                `❌ ${err.response?.data?.error || 'Safetag not found. Please check and try again.'}`,
                [{ title: '🆕 Register', payload: 'CHOICE_REGISTER' }]
            ));
            delete userStates[psid];
        }

    } else if (state.step === 'VERIFY_OTP') {
        try {
            const res = await axios.post(`${API_URL}/auth/otp/verify`, {
                safetag:     state.formData.safetag,
                platform:    'instagram',
                platform_id: psid,
                otp:         rawText.trim()
            });
            const profile = res.data.profile;
            delete userStates[psid];
            await sendMsg(psid, { text: `👋 Welcome back, ${profile.first_name || 'there'}!\n\nYour Instagram is now linked to your Safeeely account.` });
            await sendNextOptions(psid, [{ title: '🛒 Create Txn', payload: 'CREATE_TXN' }]);
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Invalid code.'}\n\nPlease enter the correct code:` });
        }
    }
}

async function handleCreateTxnText(psid: string, rawText: string, message: any) {
    const state = userStates[psid];
    const text  = rawText.toLowerCase().trim();

    if (state.step === 'ASK_PRODUCT') {
        state.formData.product_name = rawText.trim();
        state.step = 'ASK_DESCRIPTION';
        await sendMsg(psid, qr('📝 Enter a description or terms for this transaction:', [{ title: '⏭️ Skip', payload: 'SKIP_DESCRIPTION' }]));

    } else if (state.step === 'ASK_DESCRIPTION') {
        state.formData.description = rawText.trim();
        state.step = 'ASK_ATTACHMENT';
        await sendMsg(psid, qr('📎 Send a photo or file as an attachment (optional):', [{ title: '⏭️ Skip', payload: 'SKIP_ATTACHMENT' }]));

    } else if (state.step === 'ASK_ATTACHMENT') {
        // Handle text attachment URL or skip
        if (message.attachments?.length) {
            const att = message.attachments.find((a: any) => ['image', 'file', 'video'].includes(a.type));
            state.formData.attachment_url = att?.payload?.url;
        }
        state.step = 'AWAITING_CURRENCY';
        await sendMsg(psid, qr('💱 Select currency:', [
            { title: '🇳🇬 NGN', payload: 'CURRENCY_NGN' },
            { title: '🇺🇸 USD', payload: 'CURRENCY_USD' },
            { title: '🔷 USDT', payload: 'CURRENCY_USDT' }
        ]));

    } else if (state.step === 'ASK_AMOUNT') {
        const amt = parseFloat(rawText.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) {
            await sendMsg(psid, { text: '❌ Please enter a valid positive number for the amount:' });
            return;
        }
        state.formData.amount = amt;
        state.step = 'AWAITING_FEE';
        await sendMsg(psid, qr('💵 Who pays the 5% escrow fee?', [
            { title: 'Buyer Pays 💳',  payload: 'FEE_BUYER'  },
            { title: 'Seller Pays 🤝', payload: 'FEE_SELLER' },
            { title: 'Split 50/50 ⚖️', payload: 'FEE_SPLIT'  }
        ]));

    } else if (state.step === 'MILESTONE_TITLE') {
        state.formData._currentMilestoneTitle = rawText.trim();
        state.step = 'MILESTONE_AMOUNT';
        const count = (state.formData.milestones?.length || 0) + 1;
        await sendMsg(psid, { text: `🪜 Phase ${count}: Enter the amount for "${rawText.trim()}":` });

    } else if (state.step === 'MILESTONE_AMOUNT') {
        const amt = parseFloat(rawText.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) {
            await sendMsg(psid, { text: '❌ Please enter a valid positive number:' });
            return;
        }
        if (!state.formData.milestones) state.formData.milestones = [];
        state.formData.milestones.push({ title: state.formData._currentMilestoneTitle, amount: amt });
        delete state.formData._currentMilestoneTitle;

        const total = state.formData.milestones.reduce((s: number, m: any) => s + m.amount, 0);
        await sendMsg(psid, qr(
            `✅ Milestone added!\nTotal so far: ${total} ${state.formData.currency}\n\nAdd another milestone or finish?`,
            [
                { title: '➕ Add Another', payload: 'MILESTONE_ADD_MORE' },
                { title: '✅ Finish Setup', payload: 'MILESTONE_DONE'    }
            ]
        ));

    } else if (state.step === 'ASK_COUNTERPARTY') {
        const safetag = rawText.trim().startsWith('@') ? rawText.trim() : `@${rawText.trim()}`;
        try {
            const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(safetag)}`);
            const counterparty = res.data;
            state.formData.counterparty_safetag = safetag;
            state.formData.counterparty_profile = counterparty;
            state.step = 'AWAITING_CONFIRM';
            await showCounterpartyPreview(psid, counterparty, safetag);
        } catch (e: any) {
            if (e.response?.status === 404) {
                await sendMsg(psid, { text: `❌ Safetag ${safetag} not found. Please check and try again:` });
            } else {
                await sendMsg(psid, { text: '❌ Could not look up that safetag. Please try again:' });
            }
        }
    }
}

async function handleDisputeText(psid: string, rawText: string) {
    const state = userStates[psid];
    if (state.step === 'ASK_REASON') {
        try {
            await axios.post(`${API_URL}/disputes/raise`, {
                transaction_id: state.formData.txnId,
                reason:         rawText.trim(),
                raised_by:      state.formData.raisedBy,
                category:       state.formData.category
            }, { headers: BOT_AUTH_HEADERS });
            const { txnId, safetag } = state.formData;
            delete userStates[psid];
            const disputeUrl = await buildMagicLink({ platform_id: psid, scope: 'dispute', txn_id: txnId, fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag || '')}?view=dispute_details&txnId=${txnId}` });
            await sendMsg(psid, { text: '⚖️ Dispute raised. Transaction frozen. An AI mediator will review shortly and may ask for evidence.' });
            await sendMsg(psid, btnTemplate('View your dispute:', [{ type: 'web_url', url: disputeUrl, title: '👁️ View Dispute' }]));
            await sendNextOptions(psid);
        } catch (err: any) {
            delete userStates[psid];
            await sendMsg(psid, { text: `❌ Failed to raise dispute: ${err.response?.data?.error || err.message}` });
        }
    }
}

async function handleReviewText(psid: string, rawText: string, message: any) {
    const state = userStates[psid];

    if (state.step === 'ASK_COMMENT') {
        state.formData.comment = rawText.trim();
        state.step = 'ASK_PROOF';
        await sendMsg(psid, qr('📎 Send a photo as proof (optional):', [{ title: '⏭️ Skip', payload: 'SKIP_PROOF' }]));

    } else if (state.step === 'ASK_PROOF') {
        let proofUrl: string | undefined;
        if (message.attachments?.length) {
            const att = message.attachments.find((a: any) => a.type === 'image');
            proofUrl = att?.payload?.url;
        }
        await submitReview(psid, proofUrl);
    }
}

async function submitReview(psid: string, proofUrl?: string) {
    const state = userStates[psid];
    const fd    = state.formData;
    try {
        await axios.post(`${API_URL}/reviews/create`, {
            transaction_id:  fd.txnId,
            reviewer_safetag: fd.reviewerSafetag,
            reviewee_safetag: fd.revieweeSafetag,
            rating:           fd.rating,
            comment:          fd.comment || '',
            proof_url:        proofUrl
        });
        delete userStates[psid];
        await sendMsg(psid, { text: '⭐ Thanks for your review! Your feedback helps build trust in the Safeeely community.' });
        await sendNextOptions(psid);
    } catch (err: any) {
        delete userStates[psid];
        await sendMsg(psid, { text: `❌ Failed to submit review: ${err.response?.data?.error || err.message}` });
    }
}

async function submitFeedback(psid: string, comment?: string) {
    const state = userStates[psid];
    const fd    = state?.formData;
    try {
        await axios.post(`${API_URL}/feedback`, {
            reviewer_safetag: fd.safetag,
            rating:           fd.rating,
            comment:          comment || '',
            source:           fd.source || 'menu',
            source_ref_id:    fd.refId || undefined,
            platform:         'instagram',
        });
        delete userStates[psid];
        const successMsg = pickRandom(FEEDBACK_SUCCESS_MESSAGES);
        await sendMsg(psid, { text: `✅ feedback received!\n\n${successMsg}` });
        await sendNextOptions(psid);
    } catch (err: any) {
        delete userStates[psid];
        await sendMsg(psid, { text: `❌ Failed to submit: ${err.response?.data?.error || err.message}` });
    }
}

async function handleReportText(psid: string, rawText: string) {
    const state = userStates[psid];

    if (state.step === 'ASK_REPORT_SAFETAG') {
        const safetag = rawText.trim().startsWith('@') ? rawText.trim() : `@${rawText.trim()}`;
        state.formData.reportedSafetag = safetag;
        state.step = 'ASK_REPORT_REASON';
        await sendMsg(psid, qr('🚨 Why are you reporting this user?', [
            { title: 'Scam',        payload: 'REPORT_REASON_SCAM'       },
            { title: 'Fake Proof',  payload: 'REPORT_REASON_FAKE_PROOF' },
            { title: 'Harassment',  payload: 'REPORT_REASON_HARASSMENT' },
            { title: 'Other',       payload: 'REPORT_REASON_OTHER'      }
        ]));

    } else if (state.step === 'ASK_REPORT_DESCRIPTION') {
        const description = rawText.trim().toLowerCase() === 'skip' ? '' : rawText.trim();
        await submitReport(psid, description);
    }
}

async function submitReport(psid: string, description: string) {
    const state = userStates[psid];
    const fd    = state.formData;
    try {
        const p = await getProfile(psid);
        await axios.post(`${API_URL}/reports`, {
            reporter_safetag: p.safetag,
            reported_safetag: fd.reportedSafetag,
            reason:           fd.reportReason,
            description:      description || '',
            platform:         'instagram'
        }, { headers: BOT_AUTH_HEADERS });
        delete userStates[psid];
        await sendMsg(psid, { text: `✅ Report submitted. Thank you for helping keep Safeeely safe.\n\nWe will review your report of ${fd.reportedSafetag} and take action if necessary.` });
        await sendNextOptions(psid);
    } catch (err: any) {
        delete userStates[psid];
        await sendMsg(psid, { text: `❌ Failed to submit report: ${err.response?.data?.error || err.message}` });
    }
}

async function handleSmartTxnEdit(psid: string, rawText: string) {
    const state = userStates[psid];
    if (state.step === 'AWAITING_EDIT') {
        try {
            await sendMsg(psid, { text: '🎙️ Processing your request...' });
            const result = await processSmartTransaction(rawText, undefined, undefined, state.smartDraft);
            state.smartDraft = result.draft;

            if (result.is_complete) {
                await showSmartTxnDraft(psid, result.draft);
            } else {
                state.step = 'AWAITING_EDIT';
                await sendMsg(psid, { text: result.follow_up_question || 'What else would you like to change?' });
            }
        } catch (err: any) {
            delete userStates[psid];
            await sendMsg(psid, { text: '❌ Could not process your edit. Please try creating the transaction manually.' });
        }
    }
}

async function showSmartTxnDraft(psid: string, draft: SmartTransactionDraft) {
    const state = userStates[psid];
    let milestoneText = '';
    if (draft.transaction_type === 'MILESTONE' && draft.milestones?.length) {
        milestoneText = '\n📍 Milestones:\n' + draft.milestones.map((m, i) =>
            `   ${i + 1}. ${m.title} - ${m.amount} ${draft.currency}`
        ).join('\n');
    }

    const draftText =
        `✨ Smart Transaction Draft\n\nPlease review your transaction details:\n\n` +
        `📦 Type: ${draft.transaction_type || 'ONE_TIME'}\n` +
        `🛒 Product: ${draft.product_name}\n` +
        `📝 Description: ${draft.description || 'No description'}${milestoneText}\n` +
        `👤 Counterparty: ${draft.counterparty_safetag}\n` +
        `💰 Amount: ${draft.amount} ${draft.currency}\n` +
        `💵 Fee Allocation: ${draft.fee_allocation}\n` +
        `💠 Your Role: ${draft.role}\n\n` +
        `Does this look correct? Reply to edit or tap confirm.`;

    await sendMsg(psid, qr(draftText, [
        { title: '✅ Confirm',  payload: 'SMART_TXN_CONFIRM' },
        { title: '✏️ Edit',    payload: 'SMART_TXN_EDIT'    },
        { title: '❌ Cancel',  payload: 'SMART_TXN_CANCEL'  }
    ]));
    if (state) state.step = 'AWAITING_SMART_CONFIRM';
}

// ─── Main message handler ─────────────────────────────────────────────────────

async function handleMessage(psid: string, message: any) {
    // Quick replies always route as postbacks
    if (message.quick_reply) {
        await handlePostback(psid, message.quick_reply.payload);
        return;
    }

    const state   = userStates[psid];
    const rawText = (message.text || '').trim();

    // Handle attachment during ASK_ATTACHMENT or ASK_PROOF
    if (!rawText && message.attachments?.length) {
        if (state?.mode === 'CREATE_TXN' && state?.step === 'ASK_ATTACHMENT') {
            await handleCreateTxnText(psid, '', message);
            return;
        }
        if (state?.mode === 'REVIEW' && state?.step === 'ASK_PROOF') {
            await handleReviewText(psid, '', message);
            return;
        }
        return;
    }

    if (!rawText) return;

    // Active state routing
    if (state?.mode === 'REGISTER') { await handleRegistration(psid, rawText); return; }
    if (state?.mode === 'LOGIN')    { await handleLogin(psid, rawText); return; }
    if (state?.mode === 'CREATE_TXN' && [
        'ASK_PRODUCT', 'ASK_DESCRIPTION', 'ASK_ATTACHMENT',
        'ASK_AMOUNT', 'MILESTONE_TITLE', 'MILESTONE_AMOUNT', 'ASK_COUNTERPARTY'
    ].includes(state?.step)) {
        await handleCreateTxnText(psid, rawText, message);
        return;
    }
    if (state?.mode === 'DISPUTE' && state?.step === 'ASK_REASON') {
        await handleDisputeText(psid, rawText);
        return;
    }
    if (state?.mode === 'DISPUTE' && state?.step === 'ASK_CATEGORY') {
        await sendMsg(psid, qr('⚠️ Please select a category:', [
            { title: '📦 Not Delivered',  payload: 'DISPUTE_CAT_NOT_DELIVERED' },
            { title: '🔍 Not Described',  payload: 'DISPUTE_CAT_NOT_AS_DESCRIBED' },
            { title: '🔑 Credentials',    payload: 'DISPUTE_CAT_CREDENTIALS_ACCESS' },
            { title: '🔧 Incomplete',     payload: 'DISPUTE_CAT_SERVICE_INCOMPLETE' },
            { title: '💳 Payment Issue',  payload: 'DISPUTE_CAT_PAYMENT_ISSUE' },
            { title: '❓ Other',          payload: 'DISPUTE_CAT_OTHER' }
        ]));
        return;
    }
    if (state?.mode === 'REVIEW') {
        await handleReviewText(psid, rawText, message);
        return;
    }
    if (state?.mode === 'FEEDBACK' && state?.step === 'ASK_COMMENT') {
        await submitFeedback(psid, rawText.trim());
        return;
    }
    if (state?.mode === 'REPORT' && ['ASK_REPORT_SAFETAG', 'ASK_REPORT_DESCRIPTION'].includes(state?.step)) {
        await handleReportText(psid, rawText);
        return;
    }
    if (state?.mode === 'SMART_TXN' && state?.step === 'AWAITING_EDIT') {
        await handleSmartTxnEdit(psid, rawText);
        return;
    }

    const text = rawText.toLowerCase();

    // Capture referral code from text like "ref_johndoe"
    if (rawText.toLowerCase().startsWith('ref_')) {
        pendingReferrals[psid] = rawText.trim().substring(4);
        await sendMsg(psid, qr(
            '👋 Welcome to Safeeely! Referral code noted!\n\nRegister now and your friend will earn commission on your trades:',
            [{ title: '🆕 Register', payload: 'CHOICE_REGISTER' }, { title: '🔗 Log In', payload: 'CHOICE_LOGIN' }]
        ));
        return;
    }

    // Greeting trigger
    if (['hello', 'hi', 'start', 'hey', 'get started'].includes(text)) {
        await checkAndGreet(psid);
        return;
    }

    // If logged in and no active state → smart transaction
    try {
        await getProfile(psid);
        // User is registered — treat free text as smart transaction
        userStates[psid] = { mode: 'SMART_TXN', step: 'PROCESSING', smartDraft: {} };
        await sendMsg(psid, { text: '🎙️ Processing your request...' });
        try {
            const result = await processSmartTransaction(rawText);
            userStates[psid] = { mode: 'SMART_TXN', step: 'AWAITING_SMART_CONFIRM', smartDraft: result.draft };
            if (result.is_complete) {
                await showSmartTxnDraft(psid, result.draft);
            } else {
                userStates[psid].step = 'AWAITING_EDIT';
                await sendMsg(psid, qr(
                    result.follow_up_question || 'I need a bit more info. Please provide more details:',
                    [{ title: '❌ Cancel', payload: 'SMART_TXN_CANCEL' }]
                ));
            }
        } catch (_) {
            delete userStates[psid];
            await sendMsg(psid, { text: '❌ Could not process your message. Use the menu below or say "Hello" to see options.' });
            await sendNextOptions(psid, [{ title: '🛒 Create Txn', payload: 'CREATE_TXN' }]);
        }
    } catch (_) {
        // Not registered
        await sendWelcome(psid);
    }
}

// ─── Postback handler ─────────────────────────────────────────────────────────

async function handlePostback(psid: string, payload: string) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    if (payload === 'AGREE_POLICY') {
        await sendMsg(psid, qr("🚀 Let's get started!\n\nDo you already have a Safeeely account?", [
            { title: '🆕 Register', payload: 'CHOICE_REGISTER' },
            { title: '🔗 Log In',   payload: 'CHOICE_LOGIN'    }
        ]));

    } else if (payload === 'CHOICE_REGISTER' || payload === 'ICEBREAKER_REGISTER') {
        const referralCode = pendingReferrals[psid] || '';
        userStates[psid] = { mode: 'REGISTER', step: 'ASK_NAME', formData: { referralCode } };
        await sendMsg(psid, qr('📝 Registration Step 1/5\n\nPlease enter your first name:', [
            { title: '❌ Cancel', payload: 'CANCEL_AUTH' }
        ]));

    } else if (payload === 'CHOICE_LOGIN' || payload === 'ICEBREAKER_LOGIN') {
        userStates[psid] = { mode: 'LOGIN', step: 'ASK_SAFETAG', formData: {} };
        await sendMsg(psid, { text: '🔗 Safeeely Login\n\nPlease type your Safetag (e.g. @john_doe):' });

    } else if (payload === 'BACK_REGISTER') {
        const state = userStates[psid];
        if (state?.mode === 'REGISTER') {
            const stepBack: Record<string, string> = {
                ASK_LAST_NAME: 'ASK_NAME',
                ASK_EMAIL:     'ASK_LAST_NAME',
                ASK_SAFETAG:   'ASK_EMAIL',
                VERIFY_OTP:    'ASK_SAFETAG'
            };
            const prev = stepBack[state.step];
            if (prev) {
                state.step = prev;
                const prompts: Record<string, string> = {
                    ASK_NAME:      '📝 Step 1/5\nPlease enter your first name:',
                    ASK_LAST_NAME: '📝 Step 2/5\nPlease enter your last name:',
                    ASK_EMAIL:     '📝 Step 3/5\nPlease enter your email address:',
                    ASK_SAFETAG:   '📝 Step 4/5\nChoose your Safetag (e.g. @john_doe):'
                };
                await sendMsg(psid, { text: prompts[prev] });
            }
        }

    } else if (payload === 'CANCEL_AUTH') {
        delete userStates[psid];
        await sendWelcome(psid);

    } else if (payload === 'RESEND_LOGIN_OTP') {
        const state = userStates[psid];
        if (!state?.formData?.safetag) { await sendMsg(psid, { text: "❌ Session expired. Say 'Hello' to start over." }); return; }
        try {
            await axios.post(`${API_URL}/auth/otp/send`, { safetag: state.formData.safetag, platform: 'instagram', platform_id: psid });
            await sendMsg(psid, { text: '✅ New code sent to your email and linked accounts.' });
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to resend.'}` });
        }

    } else if (payload === 'RESEND_REGISTER_OTP') {
        const state = userStates[psid];
        if (!state?.formData?.email) { await sendMsg(psid, { text: "❌ Session expired. Say 'Hello' to start over." }); return; }
        try {
            await axios.post(`${API_URL}/auth/email-otp/send`, { email: state.formData.email });
            await sendMsg(psid, { text: '✅ New code sent to your email.' });
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to resend.'}` });
        }

    // ── Ice breakers ──────────────────────────────────────────────────────────
    } else if (payload === 'ICEBREAKER_ABOUT') {
        await sendMsg(psid, btnTemplate(
            '💡 About Safeeely\n\nSafeeely is an AI-powered escrow platform that protects both buyers and sellers in online trades, freelance gigs, and crypto transactions.\n\n🔒 We hold funds safely until both parties confirm the deal is done.',
            [
                { type: 'postback', payload: 'CHOICE_REGISTER', title: '🆕 Get Started' },
                { type: 'postback', payload: 'CHOICE_LOGIN',    title: '🔗 Log In'      }
            ]
        ));

    } else if (payload === 'ICEBREAKER_HELP' || payload === 'HELP') {
        await sendMsg(psid, btnTemplate(
            '❓ Safeeely Help\n\n• Create Transaction — set up an escrow deal\n• My Transactions — view and manage deals\n• Balance — check and withdraw earnings\n• Referral — invite friends and earn commission\n\nFor support: support@safeeely.com',
            [
                { type: 'postback', payload: 'CHOICE_REGISTER', title: '🆕 Get Started' },
                { type: 'postback', payload: 'REPORT_USER',      title: '🚨 Report User' }
            ]
        ));

    // ── Main menu / navigation ────────────────────────────────────────────────
    } else if (payload === 'MAIN_MENU') {
        delete userStates[psid];
        await sendNextOptions(psid, [
            { title: '🛒 Create Txn', payload: 'CREATE_TXN' },
            { title: '📋 My Txns',   payload: 'MY_TXNS'    }
        ]);

    // ── Settings & account ────────────────────────────────────────────────────
    } else if (payload === 'SETTINGS') {
        delete userStates[psid];
        await showSettings(psid);

    } else if (payload === 'OTHER_SETTINGS') {
        await showOtherSettings(psid);

    } else if (payload === 'LINKED_ACCOUNTS') {
        try {
            const p = await getProfile(psid);
            const linkedRes = await axios.get(`${API_URL}/profiles/${encodeURIComponent(p.safetag)}/linked-accounts`);
            const linked: any[] = linkedRes.data || [];
            const list = linked.length
                ? linked.map((l: any) => `• ${l.platform}${l.is_primary ? ' ⭐ (primary)' : ''}`).join('\n')
                : 'No linked accounts yet.';
            await sendMsg(psid, btnTemplate(
                `🔗 Linked Accounts\n\n${list}\n\nLink more accounts by logging in from other platforms (Telegram, Discord, WhatsApp).`,
                [{ type: 'postback', payload: 'OTHER_SETTINGS', title: '🔙 Back' }]
            ));
        } catch (_) {
            await sendMsg(psid, { text: '❌ Could not load linked accounts.' });
        }

    } else if (payload === 'START_DELETION') {
        await sendMsg(psid, btnTemplate(
            '⚠️ Delete Account\n\nAre you sure? This will:\n• Remove your Safeeely profile\n• Unlink all platforms\n• Keep transaction records for legal purposes\n\nThis action cannot be undone.',
            [
                { type: 'postback', payload: 'CONFIRM_DELETE', title: '⚠️ Confirm Delete' },
                { type: 'postback', payload: 'SETTINGS',       title: '❌ Cancel'          }
            ]
        ));

    } else if (payload === 'CONFIRM_DELETE') {
        try {
            const p = await getProfile(psid);
            await axios.post(`${API_URL}/profiles/${encodeURIComponent(p.safetag)}/deactivate`, { reason: 'User requested deletion' }, { headers: BOT_AUTH_HEADERS });
            delete userStates[psid];
            await sendMsg(psid, { text: '✅ Your account has been deleted. We\'re sorry to see you go. Your transaction history is preserved for legal compliance.' });
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ Failed to delete account: ${err.response?.data?.error || err.message}` });
        }

    // ── Balance ───────────────────────────────────────────────────────────────
    } else if (payload === 'BALANCE') {
        delete userStates[psid];
        await showBalance(psid);

    // ── Referral ──────────────────────────────────────────────────────────────
    } else if (payload === 'REFERRAL') {
        delete userStates[psid];
        await showReferral(psid);

    // ── Reviews ───────────────────────────────────────────────────────────────
    } else if (payload === 'REVIEWS') {
        try {
            const p = await getProfile(psid);
            const safetag = p.safetag.startsWith('@') ? p.safetag : `@${p.safetag}`;
            const reviewsUrl = `${REVIEWS_URL}/${safetag}`;
            const [statsRes, badgesRes] = await Promise.all([
                axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(safetag)}`),
                axios.get(`${API_URL}/profiles/${encodeURIComponent(safetag)}/badges`),
            ]);
            const { average_rating, review_count } = statsRes.data;
            const badges = badgesRes.data || [];
            const rating = Number(average_rating || 0);
            const starsCount = Math.round(rating);
            const stars = '⭐'.repeat(starsCount) + '☆'.repeat(Math.max(0, 5 - starsCount));
            let badgeLine = badges.length > 0 ? `\n🏆 Badges: ${badges.map((b: any) => `${b.emoji || ''} ${b.label}`).join(' | ')}` : '';
            const msg = `⭐ Reviews & Ratings\n\nYour trust score: ${rating.toFixed(1)}/5 ${stars}\nBased on ${review_count} review${review_count !== 1 ? 's' : ''}.${badgeLine}\n\nTap below to view your full review history.`;
            await sendMsg(psid, btnTemplate(msg, [{ type: 'web_url', url: reviewsUrl, title: '⭐ View My Reviews' }]));
        } catch (_) {
            await sendMsg(psid, { text: '❌ Could not load reviews.' });
        }

    // ── My transactions ───────────────────────────────────────────────────────
    } else if (payload === 'MY_TXNS') {
        delete userStates[psid];
        await sendMsg(psid, qr('📋 My Transactions\n\nFilter by status:', [
            { title: '🔄 Ongoing',   payload: 'FILTER_ONGOING'   },
            { title: '✅ Completed', payload: 'FILTER_COMPLETED' },
            { title: '⚠️ Disputed', payload: 'FILTER_DISPUTED'  },
            { title: '📋 All',       payload: 'FILTER_ALL'       }
        ]));

    } else if (['FILTER_ONGOING', 'FILTER_COMPLETED', 'FILTER_DISPUTED', 'FILTER_ALL'].includes(payload)) {
        await showTransactions(psid, payload);

    } else if (payload.startsWith('VIEW_TXN_')) {
        const txnId = payload.replace('VIEW_TXN_', '');
        await showTransactionDetail(psid, txnId);

    // ── Transaction actions ───────────────────────────────────────────────────
    } else if (payload.startsWith('ACCEPT_TXN_') || payload.startsWith('txn_action_accept|')) {
        const txnId = payload.startsWith('ACCEPT_TXN_') ? payload.replace('ACCEPT_TXN_', '') : payload.replace('txn_action_accept|', '');
        try {
            const p = await getProfile(psid);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'accept', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            await sendMsg(psid, { text: '✅ Transaction accepted! The buyer will be notified to make payment.' });
            await sendNextOptions(psid, [{ title: '📋 My Txns', payload: 'MY_TXNS' }]);
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to accept transaction.'}` });
        }

    } else if (payload.startsWith('DECLINE_TXN_') || payload.startsWith('txn_action_decline|')) {
        const txnId = payload.startsWith('DECLINE_TXN_') ? payload.replace('DECLINE_TXN_', '') : payload.replace('txn_action_decline|', '');
        try {
            const p = await getProfile(psid);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'decline', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            await sendMsg(psid, { text: '❌ Transaction declined.' });
            await sendNextOptions(psid);
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to decline.'}` });
        }

    } else if (payload.startsWith('COMPLETE_TXN_')) {
        const txnId = payload.replace('COMPLETE_TXN_', '');
        try {
            const p = await getProfile(psid);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_prompt', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            const opts: any[] = res.data.follow_up_options || [];
            const msg = (res.data.follow_up_msg || 'Mark delivery as completed?').replace(/<[^>]*>/g, '');
            const replyOpts = opts.filter((o: any) => !o.url);
            const urlOpts = opts.filter((o: any) => o.url);
            if (replyOpts.length > 0) {
                await sendMsg(psid, btnTemplate(msg, replyOpts.slice(0, 3).map((o: any) => ({ type: 'postback', title: o.label.substring(0, 20), payload: o.customId }))));
            }
            for (const u of urlOpts) await sendMsg(psid, btnTemplate(u.label, [{ type: 'web_url', url: u.url, title: u.label.substring(0, 20) }]));
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to mark complete.'}` });
        }

    } else if (payload.startsWith('MILE_CONFIRM|')) {
        const [, txnId, mId] = payload.split('|');
        try {
            const p = await getProfile(psid);
            await axios.patch(`${API_URL}/transactions/${txnId}/milestones/${mId}/status`, { status: 'COMPLETED', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            await sendMsg(psid, { text: '📦 Phase marked as complete! The buyer has been notified to review your proof and release the funds.' });
            await showTransactionDetail(psid, txnId);
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to mark milestone complete.'}` });
        }

    } else if (payload.startsWith('COMPLETE_MILE|')) {
        const [, txnId, mId] = payload.split('|');
        await sendMsg(psid, btnTemplate(
            '📎 Upload your proof of delivery so the buyer can verify before releasing funds:',
            [{ type: 'web_url', url: `${REVIEWS_URL}/upload/${txnId}`, title: '📎 Upload Proof' }]
        ));
        await sendMsg(psid, qr('Once uploaded, confirm below:', [
            { title: '✅ Mark as Complete', payload: `MILE_CONFIRM|${txnId}|${mId}` }
        ]));

    } else if (payload.startsWith('RELEASE_MILE|')) {
        const [, txnId, mId] = payload.split('|');
        try {
            const p = await getProfile(psid);
            await axios.patch(`${API_URL}/transactions/${txnId}/milestones/${mId}/status`, { status: 'RELEASED', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            await sendMsg(psid, { text: '💸 Funds released for this milestone! The seller has been notified.' });
            await showTransactionDetail(psid, txnId);
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to release milestone.'}` });
        }

    } else if (payload.startsWith('RECEIVED_TXN_')) {
        const txnId = payload.replace('RECEIVED_TXN_', '');
        try {
            const p = await getProfile(psid);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'confirm_receipt', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            await sendMsg(psid, { text: '✅ Transaction completed! Funds will be released to the seller.' });
            await sendNextOptions(psid);
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed to mark received.'}` });
        }

    } else if (payload.startsWith('txn_action_complete_prompt|')) {
        const txnId = payload.replace('txn_action_complete_prompt|', '');
        try {
            const txnCheck = await axios.get(`${API_URL}/transactions/${txnId}`);
            if (txnCheck.data?.transaction_type === 'MILESTONE') {
                await showTransactionDetail(psid, txnId);
                return;
            }
            const p = await getProfile(psid);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_prompt', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            const opts: any[] = res.data.follow_up_options || [];
            const msg = (res.data.follow_up_msg || 'Mark delivery as completed?').replace(/<[^>]*>/g, '');
            const replyOpts = opts.filter((o: any) => !o.url);
            const urlOpts = opts.filter((o: any) => o.url);
            if (replyOpts.length > 0) {
                await sendMsg(psid, btnTemplate(msg, replyOpts.slice(0, 3).map((o: any) => ({ type: 'postback', title: o.label.substring(0, 20), payload: o.customId }))));
            }
            for (const u of urlOpts) await sendMsg(psid, btnTemplate(u.label, [{ type: 'web_url', url: u.url, title: u.label.substring(0, 20) }]));
        } catch (err: any) { await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed.'}` }); }

    } else if (payload.startsWith('txn_action_complete_yes|')) {
        const txnId = payload.replace('txn_action_complete_yes|', '');
        try {
            const p = await getProfile(psid);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'complete_yes', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            const opts: any[] = res.data.follow_up_options || [];
            const msg = (res.data.follow_up_msg || '📎 Please upload proof of delivery.').replace(/<[^>]*>/g, '');
            const replyOpts = opts.filter((o: any) => !o.url);
            const urlOpts = opts.filter((o: any) => o.url);
            if (replyOpts.length > 0) {
                await sendMsg(psid, btnTemplate(msg, replyOpts.slice(0, 3).map((o: any) => ({ type: 'postback', title: o.label.substring(0, 20), payload: o.customId }))));
            } else {
                await sendMsg(psid, { text: msg });
            }
            for (const u of urlOpts) await sendMsg(psid, btnTemplate(u.label, [{ type: 'web_url', url: u.url, title: u.label.substring(0, 20) }]));
        } catch (err: any) { await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed.'}` }); }

    } else if (payload.startsWith('txn_refund_initiate|')) {
        const txnId = payload.replace('txn_refund_initiate|', '');
        await sendMsg(psid, qr('💸 Why are you cancelling?\n\nThe buyer will receive a full refund. Your cancellation count will increase.', [
            { title: '📦 Out of stock', payload: `txn_refund_reason|${txnId}|out_of_stock` },
            { title: '🚫 Cannot fulfil', payload: `txn_refund_reason|${txnId}|cannot_fulfil` },
            { title: '🤝 Mutual cancel', payload: `txn_refund_reason|${txnId}|mutual_cancel` },
        ]));

    } else if (payload.startsWith('txn_refund_reason|')) {
        const parts = payload.split('|');
        const txnId = parts[1];
        const reason = parts[2] || 'No reason provided';
        try {
            const txnRes = await axios.get(`${API_URL}/transactions/${txnId}`, { headers: BOT_AUTH_HEADERS });
            const t = txnRes.data;
            await sendMsg(psid, qr(`⚠️ Confirm Cancellation\n\nYou are about to return ${t.amount} ${t.currency} to the buyer. This cannot be undone.`, [
                { title: '✅ Yes, Refund', payload: `txn_refund_confirm|${txnId}|${reason}` },
                { title: '❌ Cancel',      payload: 'MAIN_MENU' },
            ]));
        } catch (err: any) { await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed.'}` }); }

    } else if (payload.startsWith('txn_refund_confirm|')) {
        const parts = payload.split('|');
        const txnId = parts[1];
        const reason = parts[2] || 'No reason provided';
        try {
            const p = await getProfile(psid);
            await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'seller_cancel', updater_safetag: p.safetag, cancellation_reason: reason }, { headers: BOT_AUTH_HEADERS });
            await sendMsg(psid, { text: '✅ Transaction cancelled. A full refund has been issued to the buyer.' });
            await sendNextOptions(psid);
        } catch (err: any) { await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed.'}` }); }

    } else if (payload.startsWith('txn_action_confirm_receipt|')) {
        const txnId = payload.replace('txn_action_confirm_receipt|', '');
        try {
            const p = await getProfile(psid);
            const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'confirm_receipt', updater_safetag: p.safetag }, { headers: BOT_AUTH_HEADERS });
            const msg = (res.data.follow_up_msg || '✅ Transaction completed! Funds will be released to the seller.').replace(/<[^>]*>/g, '');
            await sendMsg(psid, { text: msg });
            await sendNextOptions(psid);
        } catch (err: any) { await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Failed.'}` }); }

    } else if (payload.startsWith('txn_pay_')) {
        const txnId = payload.replace('txn_pay_', '');
        try {
            await axios.post(`${API_URL}/transactions/${txnId}/initialize-payment`, {}, { headers: BOT_AUTH_HEADERS });
        } catch (err: any) {
            if (err?.response?.data?.error === 'ALREADY_PAID') {
                await sendMsg(psid, { text: '✅ Payment already confirmed for this transaction.' });
                return;
            }
            // Non-ALREADY_PAID errors are non-fatal — fall through to show pay button
        }
        const payUrl = `${REVIEWS_URL}/pay/${txnId}`;
        await sendMsg(psid, btnTemplate('Tap below to complete your secure payment:', [{ type: 'web_url', url: payUrl, title: '💳 Pay Now' }]));

    } else if (payload.startsWith('view_txn_details|')) {
        await showTransactionDetail(psid, payload.replace('view_txn_details|', ''));

    } else if (payload.startsWith('view_txn_')) {
        await showTransactionDetail(psid, payload.replace('view_txn_', ''));

    } else if (payload.startsWith('view_docs_')) {
        const txnId = payload.replace('view_docs_', '');
        await sendMsg(psid, btnTemplate('Tap to view delivery documents:', [{ type: 'web_url', url: `${REVIEWS_URL}/delivery/${txnId}`, title: '📎 View Documents' }]));

    } else if (payload.startsWith('leave_review_')) {
        const txnId = payload.replace('leave_review_', '');
        try {
            const p = await getProfile(psid);
            const txnRes = await axios.get(`${API_URL}/transactions/${txnId}`);
            const t = txnRes.data;
            const revieweeSafetag = t.buyer.safetag === p.safetag ? t.seller.safetag : t.buyer.safetag;
            userStates[psid] = { mode: 'REVIEW', step: 'ASK_RATING', formData: { txnId, reviewerSafetag: p.safetag, revieweeSafetag, rating: 0 } };
            await sendMsg(psid, qr('⭐ Leave a Review\n\nHow would you rate this transaction?', [
                { title: '⭐ 1 Star',    payload: 'RATING_1' },
                { title: '⭐⭐ 2 Stars', payload: 'RATING_2' },
                { title: '⭐⭐⭐ 3',    payload: 'RATING_3' },
                { title: '⭐⭐⭐⭐ 4',  payload: 'RATING_4' },
                { title: '⭐⭐⭐⭐⭐5', payload: 'RATING_5' }
            ]));
        } catch (_) { await sendMsg(psid, { text: '❌ Could not start review.' }); }

    } else if (payload.startsWith('DISPUTE_CAT_') && userStates[psid]?.mode === 'DISPUTE') {
        const categoryMap: Record<string, string> = {
            DISPUTE_CAT_NOT_DELIVERED:      'NOT_DELIVERED',
            DISPUTE_CAT_NOT_AS_DESCRIBED:   'NOT_AS_DESCRIBED',
            DISPUTE_CAT_CREDENTIALS_ACCESS: 'CREDENTIALS_ACCESS',
            DISPUTE_CAT_SERVICE_INCOMPLETE: 'SERVICE_INCOMPLETE',
            DISPUTE_CAT_PAYMENT_ISSUE:      'PAYMENT_ISSUE',
            DISPUTE_CAT_OTHER:              'OTHER'
        };
        userStates[psid].formData.category = categoryMap[payload] || 'OTHER';
        userStates[psid].step = 'ASK_REASON';
        await sendMsg(psid, { text: '✏️ Step 2 of 2: Describe the Issue\n\nPlease describe the issue with this transaction:' });

    } else if (payload.startsWith('txn_dispute_') || payload.startsWith('DISPUTE_TXN_')) {
        const txnId = payload.startsWith('txn_dispute_') ? payload.replace('txn_dispute_', '') : payload.replace('DISPUTE_TXN_', '');
        try {
            const p = await getProfile(psid);
            userStates[psid] = { mode: 'DISPUTE', step: 'ASK_CATEGORY', formData: { txnId, raisedBy: p.id, safetag: p.safetag } };
            await sendMsg(psid, qr('⚠️ Raise Dispute — Step 1 of 2\n\nSelect the category that best describes your issue:', [
                { title: '📦 Not Delivered',  payload: 'DISPUTE_CAT_NOT_DELIVERED' },
                { title: '🔍 Not Described',  payload: 'DISPUTE_CAT_NOT_AS_DESCRIBED' },
                { title: '🔑 Credentials',    payload: 'DISPUTE_CAT_CREDENTIALS_ACCESS' },
                { title: '🔧 Incomplete',     payload: 'DISPUTE_CAT_SERVICE_INCOMPLETE' },
                { title: '💳 Payment Issue',  payload: 'DISPUTE_CAT_PAYMENT_ISSUE' },
                { title: '❓ Other',          payload: 'DISPUTE_CAT_OTHER' }
            ]));
        } catch (_) {
            await sendMsg(psid, { text: '❌ Could not start dispute.' });
        }

    } else if (payload.startsWith('DISPUTE_RETURN_BUYER_') || payload.startsWith('DISPUTE_RETURN_SELLER_')) {
        const role = payload.startsWith('DISPUTE_RETURN_BUYER_') ? 'BUYER' : 'SELLER';
        const disputeId = payload.replace('DISPUTE_RETURN_BUYER_', '').replace('DISPUTE_RETURN_SELLER_', '');
        try {
            const p = await getProfile(psid);
            await axios.post(`${API_URL}/disputes/${disputeId}/confirm-return`, { confirmer_id: p.id, role });
            const msg = role === 'BUYER'
                ? '📦 Shipping confirmed — seller notified. Refund issued once they confirm receipt.'
                : '✅ Receipt confirmed — buyer refund credit issued.';
            await sendMsg(psid, { text: msg });
        } catch (err: any) {
            await sendMsg(psid, { text: `❌ ${err.response?.data?.error || 'Could not process confirmation.'}` });
        }

    } else if (payload.startsWith('REVIEW_TXN_')) {
        // FORMAT: REVIEW_TXN_{txnId}_{revieweeSafetag}
        const parts          = payload.replace('REVIEW_TXN_', '').split('_');
        const txnId          = parts[0];
        const revieweeSafetag = parts.slice(1).join('_');
        try {
            const p = await getProfile(psid);
            userStates[psid] = {
                mode: 'REVIEW',
                step: 'ASK_RATING',
                formData: { txnId, reviewerSafetag: p.safetag, revieweeSafetag, rating: 0 }
            };
            await sendMsg(psid, qr('⭐ Leave a Review\n\nHow would you rate this transaction?', [
                { title: '⭐ 1 Star',    payload: 'RATING_1' },
                { title: '⭐⭐ 2 Stars', payload: 'RATING_2' },
                { title: '⭐⭐⭐ 3',    payload: 'RATING_3' },
                { title: '⭐⭐⭐⭐ 4',  payload: 'RATING_4' },
                { title: '⭐⭐⭐⭐⭐5', payload: 'RATING_5' }
            ]));
        } catch (_) {
            await sendMsg(psid, { text: '❌ Could not start review.' });
        }

    } else if (payload.startsWith('RATING_')) {
        const state = userStates[psid];
        if (state?.mode === 'REVIEW' && state?.step === 'ASK_RATING') {
            state.formData.rating = parseInt(payload.replace('RATING_', ''), 10);
            state.step = 'ASK_COMMENT';
            await sendMsg(psid, { text: '💬 Add a comment about your experience (optional — or just reply with "skip"):' });
        }

    } else if (payload === 'SKIP_PROOF') {
        await submitReview(psid);

    } else if (payload === 'SEND_FEEDBACK' || payload.startsWith('pf_rate_menu|')) {
        try {
            const p = await getProfile(psid);
            let source = 'menu';
            let refId: string | undefined;
            if (payload.startsWith('pf_rate_menu|')) {
                const parts = payload.split('|');
                source = parts[1];
                refId  = parts[2];
            }
            userStates[psid] = { mode: 'FEEDBACK', step: 'ASK_RATING', formData: { safetag: p.safetag, source, refId, rating: 0 } };
            await sendMsg(psid, qr('💭 Rate Safeeely\n\nhow many stars would you give us? 👇', [
                { title: '⭐ 1',       payload: 'FB_RATING_1' },
                { title: '⭐⭐ 2',     payload: 'FB_RATING_2' },
                { title: '⭐⭐⭐ 3',   payload: 'FB_RATING_3' },
                { title: '⭐⭐⭐⭐ 4', payload: 'FB_RATING_4' },
                { title: '⭐x5',       payload: 'FB_RATING_5' },
            ]));
        } catch (_) { await sendMsg(psid, { text: '❌ Could not start feedback.' }); }

    } else if (payload.startsWith('FB_RATING_')) {
        const state = userStates[psid];
        if (state?.mode === 'FEEDBACK' && state?.step === 'ASK_RATING') {
            const rating = parseInt(payload.replace('FB_RATING_', ''), 10);
            state.formData.rating = rating;
            state.step = 'ASK_COMMENT';
            const commentPrompt = getCommentPrompt(rating);
            await sendMsg(psid, qr(commentPrompt, [{ title: '⏭️ Skip', payload: 'SKIP_FB_COMMENT' }]));
        }

    } else if (payload === 'SKIP_FB_COMMENT') {
        await submitFeedback(psid);

    // ── Create transaction ────────────────────────────────────────────────────
    } else if (payload === 'CREATE_TXN') {
        userStates[psid] = { mode: 'CREATE_TXN', step: 'AWAITING_ROLE', formData: {} };
        await sendMsg(psid, qr('🛒 Create Transaction\n\nWhat is your role?', [
            { title: '🛒 Buyer',  payload: 'ROLE_BUYER'  },
            { title: '🤝 Seller', payload: 'ROLE_SELLER' }
        ]));

    } else if (payload === 'ROLE_BUYER' || payload === 'ROLE_SELLER') {
        const state = userStates[psid];
        if (!state || state.mode !== 'CREATE_TXN') return;
        state.formData.role = payload === 'ROLE_BUYER' ? 'buyer' : 'seller';
        state.step = 'AWAITING_TYPE';
        await sendMsg(psid, qr('📦 Transaction type:', [
            { title: '💸 One-Time',  payload: 'TYPE_ONE_TIME'  },
            { title: '🪜 Milestone', payload: 'TYPE_MILESTONE' }
        ]));

    } else if (payload === 'TYPE_ONE_TIME' || payload === 'TYPE_MILESTONE') {
        const state = userStates[psid];
        if (!state || state.mode !== 'CREATE_TXN') return;
        state.formData.transaction_type = payload === 'TYPE_ONE_TIME' ? 'ONE_TIME' : 'MILESTONE';
        state.step = 'ASK_PRODUCT';
        await sendMsg(psid, { text: '📦 Enter the product or service name:' });

    } else if (payload === 'SKIP_DESCRIPTION') {
        const state = userStates[psid];
        if (state?.mode === 'CREATE_TXN') {
            state.formData.description = '';
            state.step = 'ASK_ATTACHMENT';
            await sendMsg(psid, qr('📎 Send a photo or file as an attachment (optional):', [{ title: '⏭️ Skip', payload: 'SKIP_ATTACHMENT' }]));
        }

    } else if (payload === 'SKIP_ATTACHMENT') {
        const state = userStates[psid];
        if (state?.mode === 'CREATE_TXN') {
            state.step = 'AWAITING_CURRENCY';
            await sendMsg(psid, qr('💱 Select currency:', [
                { title: '🇳🇬 NGN', payload: 'CURRENCY_NGN'  },
                { title: '🇺🇸 USD', payload: 'CURRENCY_USD'  },
                { title: '🔷 USDT', payload: 'CURRENCY_USDT' }
            ]));
        }

    } else if (['CURRENCY_NGN', 'CURRENCY_USD', 'CURRENCY_USDT'].includes(payload)) {
        const state = userStates[psid];
        if (!state || state.mode !== 'CREATE_TXN') return;
        state.formData.currency = payload.replace('CURRENCY_', '');
        if (state.formData.transaction_type === 'ONE_TIME') {
            state.step = 'ASK_AMOUNT';
            await sendMsg(psid, { text: `💰 Enter the amount (in ${state.formData.currency}):` });
        } else {
            state.step = 'MILESTONE_TITLE';
            await sendMsg(psid, { text: '🪜 Milestone Setup\n\nEnter the title for Phase 1 (e.g. "Initial Deposit"):' });
        }

    } else if (payload === 'MILESTONE_ADD_MORE') {
        const state = userStates[psid];
        if (state?.mode === 'CREATE_TXN') {
            const count = (state.formData.milestones?.length || 0) + 1;
            state.step = 'MILESTONE_TITLE';
            await sendMsg(psid, { text: `🪜 Enter the title for Phase ${count}:` });
        }

    } else if (payload === 'MILESTONE_DONE') {
        const state = userStates[psid];
        if (state?.mode === 'CREATE_TXN') {
            state.step = 'AWAITING_FEE';
            await sendMsg(psid, qr('💵 Who pays the 5% escrow fee?', [
                { title: 'Buyer Pays 💳',   payload: 'FEE_BUYER'  },
                { title: 'Seller Pays 🤝',  payload: 'FEE_SELLER' },
                { title: 'Split 50/50 ⚖️',  payload: 'FEE_SPLIT'  }
            ]));
        }

    } else if (['FEE_BUYER', 'FEE_SELLER', 'FEE_SPLIT'].includes(payload)) {
        const state = userStates[psid];
        if (!state || state.mode !== 'CREATE_TXN') return;
        state.formData.fee_allocation = payload === 'FEE_BUYER' ? 'buyer' : payload === 'FEE_SELLER' ? 'seller' : 'split';
        state.step = 'ASK_COUNTERPARTY';
        const other = state.formData.role === 'buyer' ? 'seller' : 'buyer';
        await sendMsg(psid, { text: `👤 Enter the safetag of the ${other} (e.g. @their_tag):` });

    } else if (payload === 'CONFIRM_COUNTERPARTY') {
        const state = userStates[psid];
        if (state?.mode === 'CREATE_TXN') {
            await showTransactionSummary(psid);
        }

    } else if (payload === 'CANCEL_TXN') {
        delete userStates[psid];
        await sendMsg(psid, { text: '❌ Transaction cancelled.' });
        await sendNextOptions(psid, [{ title: '🛒 Create Txn', payload: 'CREATE_TXN' }]);

    } else if (payload === 'CREATE_TXN_CONFIRM') {
        const state = userStates[psid];
        if (!state?.formData) return;
        const fd = state.formData;
        const isSeller = fd.role === 'seller';
        const displayAmt = fd.transaction_type === 'ONE_TIME'
            ? `${fd.amount} ${fd.currency}`
            : `${(fd.milestones || []).reduce((s: number, m: any) => s + Number(m.amount), 0)} ${fd.currency}`;
        const invoiceText = isSeller
            ? `📄 Smart Invoice\n\nWant to send your buyer a professional invoice?\n\nA branded invoice PDF will be emailed to your buyer:\n  📦 Item: ${fd.product_name}\n  💰 Amount: ${displayAmt}\n  👤 Buyer: ${fd.counterparty_safetag}\n\nIncludes a Pay with Safeeely button for easy payment.`
            : `📄 Smart Invoice\n\nWould you like an invoice for this transaction?\n\nA professional invoice from your seller, emailed to you:\n  📦 Item: ${fd.product_name}\n  💰 Amount: ${displayAmt}\n  🏪 Seller: ${fd.counterparty_safetag}\n\nPerfect for your records or expense tracking.`;
        await sendMsg(psid, qr(invoiceText, [
            { title: isSeller ? '📧 Send Invoice' : '📧 Get Invoice', payload: 'INVOICE_YES' },
            { title: '❌ No, Skip', payload: 'INVOICE_NO' }
        ]));
        state.step = 'INVOICE_PROMPT';

    } else if (payload === 'INVOICE_YES' || payload === 'INVOICE_NO') {
        const state = userStates[psid];
        if (!state?.formData) return;
        state.formData.send_invoice = payload === 'INVOICE_YES';
        await createTransaction(psid);

    // ── Smart transaction ─────────────────────────────────────────────────────
    } else if (payload === 'SMART_TXN_CONFIRM') {
        const state = userStates[psid];
        if (!state?.smartDraft) return;
        const draft = state.smartDraft as SmartTransactionDraft;
        try {
            const counterpartySafetag = draft.counterparty_safetag || '';
            const safetag = counterpartySafetag.startsWith('@') ? counterpartySafetag : `@${counterpartySafetag}`;
            const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(safetag)}`);
            const profile = res.data;
            userStates[psid] = {
                mode: 'CREATE_TXN',
                step: 'AWAITING_CONFIRM',
                formData: {
                    role:                  draft.role,
                    transaction_type:      draft.transaction_type || 'ONE_TIME',
                    product_name:          draft.product_name,
                    description:           draft.description || '',
                    currency:              draft.currency,
                    amount:                draft.amount,
                    milestones:            draft.milestones,
                    fee_allocation:        draft.fee_allocation,
                    counterparty_safetag:  safetag,
                    counterparty_profile:  profile
                }
            };
            await showCounterpartyPreview(psid, profile, safetag);
        } catch (err: any) {
            delete userStates[psid];
            await sendMsg(psid, { text: `❌ Could not find counterparty ${draft.counterparty_safetag}. Please create the transaction manually.` });
            await handlePostback(psid, 'CREATE_TXN');
        }

    } else if (payload === 'SMART_TXN_EDIT') {
        const state = userStates[psid];
        if (state) {
            state.step = 'AWAITING_EDIT';
            await sendMsg(psid, { text: '✏️ What would you like to change? Describe the update:' });
        }

    } else if (payload === 'SMART_TXN_CANCEL') {
        delete userStates[psid];
        await sendMsg(psid, { text: '❌ Smart transaction cancelled.' });
        await sendNextOptions(psid, [{ title: '🛒 Create Txn', payload: 'CREATE_TXN' }]);

    // ── Report User ───────────────────────────────────────────────────────────
    } else if (payload === 'REPORT_USER') {
        delete userStates[psid];
        userStates[psid] = { mode: 'REPORT', step: 'ASK_REPORT_SAFETAG', formData: {} };
        await sendMsg(psid, { text: '🚨 Report a User\n\nPlease enter the safetag of the user you want to report (e.g. @their_tag):' });

    } else if (payload.startsWith('REPORT_REASON_')) {
        const state = userStates[psid];
        if (state?.mode === 'REPORT' && state?.step === 'ASK_REPORT_REASON') {
            const reasonMap: Record<string, string> = {
                REPORT_REASON_SCAM:       'Scam',
                REPORT_REASON_FAKE_PROOF: 'Fake Proof',
                REPORT_REASON_HARASSMENT: 'Harassment',
                REPORT_REASON_OTHER:      'Other'
            };
            state.formData.reportReason = reasonMap[payload] || 'Other';
            state.step = 'ASK_REPORT_DESCRIPTION';
            await sendMsg(psid, qr('📝 Add more details about this report (optional — type "skip" to skip):', [
                { title: '⏭️ Skip', payload: 'REPORT_SKIP_DESC' }
            ]));
        }

    } else if (payload === 'REPORT_SKIP_DESC') {
        const state = userStates[psid];
        if (state?.mode === 'REPORT') {
            await submitReport(psid, '');
        }
    }
}

// ─── Webhook routes ───────────────────────────────────────────────────────────

app.get('/webhook', (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === HUB_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    // Verify Meta X-Hub-Signature-256 before processing anything
    const metaAppSecret = process.env.META_APP_SECRET;
    if (!metaAppSecret) {
        console.error('❌ META_APP_SECRET not configured — rejecting webhook');
        return res.sendStatus(503);
    }
    const sigHeader = req.headers['x-hub-signature-256'] as string;
    if (!sigHeader) {
        console.error('❌ Missing X-Hub-Signature-256 header');
        return res.sendStatus(401);
    }
    const rawBody = (req as any).rawBody as Buffer;
    const expected = 'sha256=' + crypto.createHmac('sha256', metaAppSecret).update(rawBody).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected))) {
        console.error('❌ Instagram webhook signature mismatch');
        return res.sendStatus(401);
    }

    const body = req.body;
    if (body.object === 'instagram') {
        if (body.entry?.length) {
            for (const entry of body.entry) {
                if (!entry.messaging) continue;
                for (const event of entry.messaging) {
                    const psid = event.sender.id;
                    axios.patch(`${API_URL}/profiles/platform-activity`, { platform: 'instagram', platform_id: psid }).catch(() => {});
                    try {
                        if (event.message)  await handleMessage(psid, event.message);
                        if (event.postback) await handlePostback(psid, event.postback.payload);
                    } catch (err: any) {
                        console.error(`❌ Unhandled error for ${psid}:`, err.message);
                    }
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || process.env.INSTAGRAM_PORT || 10002;
app.listen(PORT, async () => {
    console.log(`📸 Instagram Webhook listener on port ${PORT}`);
    await setupMenus();
});
