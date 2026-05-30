import { Scenes } from 'telegraf';
import axios from 'axios';
import { buildMagicLink } from '../utils/magicLink';

function formatAccountAge(createdAt: string): string {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''}`;
}

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
let REVIEWS_URL = process.env.REVIEWS_URL || 'http://localhost:3001';
if (REVIEWS_URL.includes('localhost')) {
    REVIEWS_URL = REVIEWS_URL.replace('localhost', '127.0.0.1');
}

export const transactionScene = new Scenes.WizardScene(
    'transaction_wizard',
    // Step 0: Role Selection
    async (ctx: any) => {
        if (ctx.scene.session.state.smartDraft) {
            const draft = ctx.scene.session.state.smartDraft;
            ctx.wizard.state.formData = {
                role: draft.role,
                product_name: draft.product_name,
                description: draft.description || '',
                amount: draft.amount,
                currency: draft.currency,
                fee_allocation: draft.fee_allocation,
                counterparty_safetag: draft.counterparty_safetag,
                transaction_type: draft.transaction_type || 'ONE_TIME',
                milestones: draft.milestones || []
            };
            ctx.wizard.state.isSmartDraft = true;
            ctx.reply(`🛒 <b>Step 4/8: Attachments</b>\n\n📎 Upload Attachments (Optional)\n\n1️⃣ Upload via chat\n2️⃣ Skip this step`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '2️⃣ Skip this step', callback_data: 'skip_attachments' }]
                    ]
                }
            });
            ctx.wizard.selectStep(4);
            return;
        }
        console.log(`[Transaction Wizard] Step 0: Initializing... (User: ${ctx.from?.id})`);
        ctx.wizard.state.formData = {
            product_name: undefined,
            description: '',
            amount: 0,
            currency: 'NGN',
            fee_allocation: 'buyer',
            transaction_type: 'ONE_TIME',
            milestones: []
        };
        ctx.reply('🛒 <b>Create New Transaction</b>\n\nAre you buying or selling?', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '1️⃣ I am a buyer', callback_data: 'role_buyer' }],
                    [{ text: '2️⃣ I am a seller', callback_data: 'role_seller' }],
                    [{ text: '3️⃣ 🔙 Main Menu', callback_data: 'main_menu' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 1: Transaction Type
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const role = ctx.callbackQuery.data === 'role_buyer' ? 'buyer' : 'seller';
        ctx.wizard.state.formData.role = role;
        await ctx.answerCbQuery();

        ctx.reply(`🛒 <b>Step 1/8: Transaction Type</b>\n\nChoose the type of transaction for this ${role === 'buyer' ? 'purchase' : 'sale'}:`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📦 One-Time Payment', callback_data: 'ONE_TIME' }],
                    [{ text: '🪜 Milestone-Based (Phased)', callback_data: 'MILESTONE' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 2: Product Name
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const validTypes = ['ONE_TIME', 'MILESTONE'];
        if (!validTypes.includes(ctx.callbackQuery.data)) return;
        ctx.wizard.state.formData.transaction_type = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        const type = ctx.wizard.state.formData.transaction_type;
        const role = ctx.wizard.state.formData.role;
        
        ctx.reply(`🛒 <b>Step 2/8: ${type === 'MILESTONE' ? 'Project' : 'Product'} Name</b>\n\nWhat is the ${type === 'MILESTONE' ? 'project' : 'product'} name?\n\nPlease enter the name:`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 3: Description
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return;
        if (!ctx.message?.text) return;
        
        ctx.wizard.state.formData.product_name = ctx.message.text;
        ctx.reply(`🛒 <b>Step 3/8: Description</b>\n\nPlease provide a detailed description:`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 4: Attachments
    async (ctx: any) => {
        if (ctx.wizard.state.isSmartDraft) {
            if (ctx.callbackQuery) {
                try { await ctx.answerCbQuery(); } catch(e){}
            }
            // Fast-forward to Profile Validation step
            ctx.wizard.selectStep(11);
            return ctx.wizard.steps[11](ctx);
        }

        if (ctx.message?.text?.startsWith('/')) return;
        if (!ctx.message?.text) return;
        
        ctx.wizard.state.formData.description = ctx.message.text;
        ctx.reply(`🛒 <b>Step 4/8: Attachments</b>\n\n📎 Upload Attachments (Optional)\n\n1️⃣ Upload via chat\n2️⃣ Skip this step`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '2️⃣ Skip this step', callback_data: 'skip_attachments' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 5: Currency
    async (ctx: any) => {
        if (ctx.callbackQuery) await ctx.answerCbQuery();
        ctx.reply(`🛒 <b>Step 5/8: Currency</b>\n\nSelect the currency:`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🇳🇬 NGN (Naira)', callback_data: 'NGN' }, { text: '🇺🇸 USD (Dollar)', callback_data: 'USD' }],
                    [{ text: '🪙 USDT (Tether)', callback_data: 'USDT' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 6: Price OR Milestone Setup
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const VALID_CURRENCIES = ['NGN', 'USD', 'USDT'];
        if (VALID_CURRENCIES.includes(ctx.callbackQuery.data)) {
            ctx.wizard.state.formData.currency = ctx.callbackQuery.data;
        }
        await ctx.answerCbQuery();

        const type = ctx.wizard.state.formData.transaction_type;
        if (type === 'ONE_TIME') {
            ctx.reply(`🛒 <b>Step 6/8: Amount</b>\n\nEnter the total amount in ${ctx.wizard.state.formData.currency}:`, { parse_mode: 'HTML' });
            return ctx.wizard.next();
        } else {
            const count = ctx.wizard.state.formData.milestones.length + 1;
            ctx.reply(`🪜 <b>Milestone Setup (Phase ${count})</b>\n\nEnter the title for this milestone (e.g., "Initial Deposit", "Project Completion"):`, { parse_mode: 'HTML' });
            return ctx.wizard.next();
        }
    },
    // Step 7: Fee Allocation OR Milestone Amount
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return;
        if (!ctx.message?.text) return;

        const type = ctx.wizard.state.formData.transaction_type;
        if (type === 'ONE_TIME') {
            const amount = parseFloat(ctx.message.text);
            if (isNaN(amount) || amount <= 0) {
                ctx.reply('❌ Invalid amount. Please enter a valid number:');
                return;
            }
            ctx.wizard.state.formData.amount = amount;
            const fee = amount * 0.05;
            ctx.reply(`🛒 <b>Step 7/8: Fee Allocation</b>\n\n💵 Who pays the 5% transaction fee?\n\nAmount: ${amount} ${ctx.wizard.state.formData.currency}\nFee: ${fee} ${ctx.wizard.state.formData.currency}`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👤 Buyer (pays 100%)', callback_data: 'buyer' }],
                        [{ text: '👤 Seller (pays 100%)', callback_data: 'seller' }],
                        [{ text: '🤝 Split (50/50)', callback_data: 'split' }]
                    ]
                }
            });
            ctx.wizard.selectStep(9); // Skip milestone logic
            return;
        } else {
            // Milestone Title received
            ctx.wizard.state.currentMilestoneTitle = ctx.message.text;
            const count = ctx.wizard.state.formData.milestones.length + 1;
            ctx.reply(`🪜 <b>Phase ${count}: Amount</b>\n\nEnter the amount for "<b>${ctx.wizard.state.currentMilestoneTitle}</b>":`, { parse_mode: 'HTML' });
            return ctx.wizard.next();
        }
    },
    // Step 8: Milestone Next Action
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return;
        if (!ctx.message?.text) return;

        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) {
            ctx.reply('❌ Invalid amount. Please enter a valid number:');
            return;
        }

        ctx.wizard.state.formData.milestones.push({
            title: ctx.wizard.state.currentMilestoneTitle,
            amount: amount
        });

        // Calculate running total
        const total = ctx.wizard.state.formData.milestones.reduce((sum: number, m: any) => sum + m.amount, 0);
        ctx.wizard.state.formData.amount = total;

        ctx.reply(`✅ Added Milestone: <b>${ctx.wizard.state.currentMilestoneTitle}</b> (${amount} ${ctx.wizard.state.formData.currency})\n\nTotal Project Amount so far: <b>${total} ${ctx.wizard.state.formData.currency}</b>`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Add Another Phase', callback_data: 'add_more' }],
                    [{ text: '✅ Finish Milestone Setup', callback_data: 'finish' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 9: Fee Allocation Transition
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'add_more') {
            ctx.wizard.selectStep(6);
            return ctx.wizard.steps[6](ctx);
        }

        // Proceed to Fee Allocation
        const amount = ctx.wizard.state.formData.amount;
        const fee = amount * 0.05;
        ctx.reply(`🛒 <b>Step 7/8: Fee Allocation</b>\n\n💵 Who pays the 5% transaction fee?\n\nTotal Project Amount: ${amount} ${ctx.wizard.state.formData.currency}\nTotal Fee: ${fee} ${ctx.wizard.state.formData.currency}`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👤 Buyer (pays 100%)', callback_data: 'buyer' }],
                    [{ text: '👤 Seller (pays 100%)', callback_data: 'seller' }],
                    [{ text: '🤝 Split (50/50)', callback_data: 'split' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 10: Enter Other Party Safetag
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        ctx.wizard.state.formData.fee_allocation = ctx.callbackQuery.data;
        await ctx.answerCbQuery();
        const role = ctx.wizard.state.formData.role;
        ctx.reply(`👤 <b>Enter ${role === 'buyer' ? 'Seller' : 'Buyer'}'s Safetag</b>\n\nEnter the ${role === 'buyer' ? 'seller' : 'buyer'}'s Safetag (e.g., <code>@safetag_abc123</code>):`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 11: Validate Safetag & Show Profile Preview
    async (ctx: any) => {
        let otherSafetag: string;
        if (ctx.message?.text && !ctx.message?.text.startsWith('/')) {
            otherSafetag = ctx.message.text.startsWith('@') ? ctx.message.text.trim() : `@${ctx.message.text.trim()}`;
            ctx.wizard.state.formData.counterparty_safetag = otherSafetag.replace('@', '');
        } else if (ctx.wizard.state.isSmartDraft) {
            otherSafetag = ctx.wizard.state.formData.counterparty_safetag;
            if (!otherSafetag.startsWith('@')) otherSafetag = `@${otherSafetag}`;
        } else {
            return;
        }
        
        const role = ctx.wizard.state.formData.role;
        try {
            // 1. Fetch target profile
            const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(otherSafetag)}`);
            const profile = res.data;
            ctx.wizard.state.formData.other_safetag = profile.safetag;
            ctx.wizard.state.formData.other_id = profile.id;

            // 2. Fetch current user profile (used for display in the confirm step)
            let mySafetag = '';
            try {
                const myProfileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
                mySafetag = myProfileRes.data.safetag || '';
            } catch (e: any) {}

            // 3. Get review stats
            let ratingStr = 'No';
            let ratingSuffix = 'reviews yet';
            try {
                const statsRes = await axios.get(`${API_URL}/reviews/stats/${profile.safetag}`);
                const { average_rating, review_count } = statsRes.data;
                if (review_count > 0) {
                    ratingStr = `${average_rating.toFixed(1)}/5`;
                    ratingSuffix = `(${review_count} reviews)`;
                }
                ctx.wizard.state.formData.other_rating = ratingStr;
            } catch (e: any) {
                ctx.wizard.state.formData.other_rating = 'No';
            }

            // 4. Get completed trades count
            let completedTradesLine = '';
            try {
                const statsRes = await axios.get(`${API_URL}/profiles/${encodeURIComponent(profile.safetag)}/stats`);
                const { completed_trades } = statsRes.data;
                completedTradesLine = `\n${completed_trades === 0 ? '⚠️' : '✅'} Completed trades: <b>${completed_trades}</b>`;
            } catch (_) {}

            // 5. Account age line
            let accountAgeLine = '';
            if (profile.created_at) {
                accountAgeLine = `\n📅 Member for: <b>${formatAccountAge(profile.created_at)}</b>`;
            }

            // 6. Construct safe URL for Telegram button
            let reviewsUrlBase = REVIEWS_URL;
            if (!reviewsUrlBase.startsWith('http')) reviewsUrlBase = `http://${reviewsUrlBase}`;
            const cleanBase = reviewsUrlBase.endsWith('/') ? reviewsUrlBase.slice(0, -1) : reviewsUrlBase;
            const reviewsUrl = `${cleanBase}/reviews/${encodeURIComponent(profile.safetag)}`;

            const isVerified = profile.kyc_status === 'VERIFIED';
            const verifiedEmoji = isVerified ? '✅' : '❌';
            const verifiedText = isVerified ? 'Verified' : 'Unverified';

            const buttons: any[] = [
                [{ text: '✅ Yes, Continue', callback_data: 'profile_confirm' }],
                [{ text: '❌ No, Change', callback_data: 'profile_back' }]
            ];

            if (reviewsUrl && reviewsUrl.startsWith('http')) {
                buttons.push([{ text: '⭐ View Reviews ↗️', url: reviewsUrl }]);
            }

            const profileType = role === 'buyer' ? 'Seller' : 'Buyer';

            await ctx.reply(`👤 <b>${profileType} Profile</b>\n\n` +
                `<code>${profile.safetag}</code>\n` +
                `⭐ <b>Rating: ${ratingStr} ${ratingSuffix}</b>\n` +
                `${verifiedEmoji} 💳 <b>${verifiedText} ${profileType}</b>` +
                `${completedTradesLine}` +
                `${accountAgeLine}` +
                `\n\nContinue with this ${profileType.toLowerCase()}?`, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: { inline_keyboard: buttons }
            });
            return ctx.wizard.next();
        } catch (err: any) {
            ctx.reply(`❌ <b>${role === 'buyer' ? 'Seller' : 'Buyer'} not found</b>\n\nPlease check and try again:`, { parse_mode: 'HTML' });
            return;
        }
    },
    // Step 12: Review Summary
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        if (ctx.callbackQuery.data === 'profile_back') {
            const role = ctx.wizard.state.formData.role;
            ctx.reply(`👤 <b>Enter ${role === 'buyer' ? 'Seller' : 'Buyer'}'s Safetag</b>:`, { parse_mode: 'HTML' });
            ctx.wizard.back();
            return;
        }
        await ctx.answerCbQuery();

        const { product_name, description, amount, currency, fee_allocation, other_safetag, role, transaction_type, milestones } = ctx.wizard.state.formData;
        const fee = amount * 0.05;
        const total = fee_allocation === 'buyer' ? amount + fee : (fee_allocation === 'split' ? amount + (fee / 2) : amount);

        let milestoneList = '';
        if (transaction_type === 'MILESTONE' && milestones) {
            milestoneList = '\n📍 <b>Milestones:</b>\n' + milestones.map((m: any, i: number) => `   ${i+1}. ${m.title} - ${m.amount} ${currency}`).join('\n');
        }

        // Determine buyer/seller safetags for the pair-history check
        let mySafetag = '';
        try {
            const myProfileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
            mySafetag = myProfileRes.data.safetag || '';
        } catch (e: any) {}

        const buyerSafetag = role === 'buyer' ? mySafetag : other_safetag;
        const sellerSafetag = role === 'seller' ? mySafetag : other_safetag;

        // Risk-factor warning at confirmation step
        let warningBlock = '';
        try {
            const [pairRes, sellerStatsRes, sellerReviewRes] = await Promise.all([
                axios.get(`${API_URL}/transactions/pair-history?buyer=${encodeURIComponent(buyerSafetag)}&seller=${encodeURIComponent(sellerSafetag)}`),
                axios.get(`${API_URL}/profiles/${encodeURIComponent(sellerSafetag)}/stats`),
                axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(sellerSafetag)}`),
            ]);

            const pairCount = pairRes.data.completed_count ?? 0;
            const completedTrades = sellerStatsRes.data.completed_trades ?? 0;
            const memberDays = Math.floor((Date.now() - new Date(sellerStatsRes.data.member_since).getTime()) / 86_400_000);
            const reviewCount = sellerReviewRes.data.review_count ?? 0;

            const risks: string[] = [];
            if (completedTrades === 0) risks.push('⚠️ Seller has no completed trades on Safeeely');
            if (memberDays < 14) risks.push(`⚠️ Seller joined only ${memberDays} day${memberDays !== 1 ? 's' : ''} ago`);
            if (reviewCount === 0) risks.push('⚠️ Seller has no reviews yet');
            if (pairCount === 0) risks.push('⚠️ You have never completed a trade with this person before');

            if (risks.length >= 2) {
                warningBlock = `🚨 <b>Risk Factors Detected</b>\n\n${risks.join('\n')}\n\nThese are common patterns in scam attempts. Only proceed if you have verified this seller independently.\n\n`;
            }
        } catch (_) {}

        const summary = `${warningBlock}📋 <b>Transaction Summary</b>\n\nPlease review your transaction details:\n\n` +
            `🛒 Product/Service: <b>${product_name}</b>\n` +
            `📝 Description: <b>${description || 'No description'}</b>${milestoneList}\n` +
            `💰 Amount: <b>${amount} ${currency}</b>\n` +
            `💵 Fee: <b>${fee.toFixed(2)} ${currency} (${fee_allocation})</b>\n` +
            `💳 Total: <b>${total.toFixed(2)} ${currency}</b>\n` +
            `👤 ${role === 'buyer' ? 'Seller' : 'Buyer'}: <code>${other_safetag}</code>\n` +
            `⭐ ${role === 'buyer' ? 'Seller' : 'Buyer'} Rating: <b>${ctx.wizard.state.formData.other_rating || 'No'}</b>`;

        ctx.reply(summary, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '1️⃣ ✅ Confirm', callback_data: 'confirm' }],
                    [{ text: '2️⃣ ❌ Cancel', callback_data: 'cancel' }],
                    [{ text: '3️⃣ ✏️ Edit', callback_data: 'profile_back' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 13: Smart Invoice Prompt
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'cancel') {
            ctx.reply('❌ Cancelled.');
            return ctx.scene.leave();
        }

        if (action !== 'confirm') return;

        // Fetch and cache the user's own safetag before showing the invoice prompt
        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from.id}`);
            ctx.wizard.state.formData.my_safetag = profileRes.data.safetag;
        } catch (err: any) {
            ctx.reply('❌ Could not fetch your profile. Please try again.');
            return ctx.scene.leave();
        }

        const { role, product_name, amount, currency, other_safetag } = ctx.wizard.state.formData;
        const isSeller = role === 'seller';

        const invoiceMsg = isSeller
            ? `📄 <b>Smart Invoice</b>\n\nWant to send your buyer a professional invoice?\n\nA branded invoice PDF will be emailed to your buyer with the full transaction details:\n  📦 <b>Item:</b> ${product_name}\n  💰 <b>Amount:</b> ${amount} ${currency}\n  👤 <b>Buyer: ${other_safetag}</b>\n\n<i>It includes a Pay with Safeeely button so they can settle directly from their inbox.</i>`
            : `📄 <b>Smart Invoice</b>\n\nWould you like an invoice for this transaction?\n\nA professional invoice from your seller will be emailed straight to you with full details:\n  📦 <b>Item:</b> ${product_name}\n  💰 <b>Amount:</b> ${amount} ${currency}\n  🏪 <b>Seller: ${other_safetag}</b>\n\n<i>Perfect for your records or expense tracking.</i>`;

        const yesLabel = isSeller ? '📧 Yes, Send Invoice' : '📧 Yes, Email Me an Invoice';

        ctx.reply(invoiceMsg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: yesLabel, callback_data: 'invoice_yes' }],
                    [{ text: '❌ No, Skip', callback_data: 'invoice_no' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 14: Finalize (after invoice choice)
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        const sendInvoice = action === 'invoice_yes';
        const { role, product_name, description, amount, currency, fee_allocation, other_safetag, transaction_type, milestones, my_safetag } = ctx.wizard.state.formData;

        try {
            const res = await axios.post(`${API_URL}/transactions/create`, {
                buyer_safetag: role === 'buyer' ? my_safetag : other_safetag,
                seller_safetag: role === 'seller' ? my_safetag : other_safetag,
                product_name,
                description,
                amount,
                currency,
                fee_allocation,
                initiator_safetag: my_safetag,
                transaction_type,
                milestones,
                send_invoice: sendInvoice,
                group_id: (ctx as any).session?.incomingGroupId || undefined,
            });

            // Clear group context after use so future transactions aren't incorrectly tagged
            if ((ctx as any).session?.incomingGroupId) {
                delete (ctx as any).session.incomingGroupId;
            }

            const counterpartyRole = role === 'buyer' ? 'Seller' : 'Buyer';
            const finalMsg = `✅ <b>Transaction Created!</b>\n\n` +
                `Your transaction has been created and sent to the ${counterpartyRole.toLowerCase()}.\n\n` +
                `📋 <b>Transaction ID: ${res.data.txn_code}</b>\n` +
                `👤 <b>${counterpartyRole}: ${other_safetag}</b>\n` +
                `💰 <b>Amount: ${amount} ${currency}</b>\n\n` +
                `📬 <b>You'll be notified when:</b>\n` +
                `• ${counterpartyRole} accepts your request\n` +
                `• Payment is required\n` +
                `• Delivery is confirmed\n\n` +
                `⏳ <b>Current Status: Awaiting ${counterpartyRole} Acceptance</b>` +
                (sendInvoice ? '\n\n📧 <b>Invoice emailed to buyer!</b>' : '');

            ctx.reply(finalMsg, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '1️⃣ 👁️ View Transaction', callback_data: `view_txn_details|${res.data.id}` }],
                        [{ text: '2️⃣ 🔙 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            });
        } catch (err: any) {
            ctx.reply(`❌ Error: ${err.response?.data?.error || err.message}`);
        }
        return ctx.scene.leave();
    }
);

