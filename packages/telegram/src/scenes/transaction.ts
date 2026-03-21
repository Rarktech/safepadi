import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL = process.env.REVIEWS_URL || 'http://localhost:3001';

export const transactionScene = new Scenes.WizardScene(
    'transaction_wizard',
    // Step 0: Role Selection
    async (ctx: any) => {
        console.log(`[Transaction Wizard] Step 0: Initializing... (User: ${ctx.from?.id})`);
        ctx.wizard.state.formData = {
            product_name: undefined,
            description: '',
            amount: 0,
            currency: 'NGN',
            fee_allocation: 'buyer'
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
    // Step 1: Product Name
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const role = ctx.callbackQuery.data === 'role_buyer' ? 'buyer' : 'seller';
        ctx.wizard.state.formData.role = role;
        await ctx.answerCbQuery();

        ctx.reply(`🛒 <b>${role === 'buyer' ? 'Buyer' : 'Seller'} Transaction - Step 1/7</b>\n\nWhat do you want to ${role === 'buyer' ? 'buy' : 'sell'}?\n\nPlease enter the product or service name:`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 2: Description
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return; // Ignore commands
        if (!ctx.message?.text) return;
        
        ctx.wizard.state.formData.product_name = ctx.message.text;
        console.log(`[Transaction Wizard] Product Name set: ${ctx.wizard.state.formData.product_name}`);
        
        ctx.reply(`🛒 <b>Step 2/7: Description</b>\n\nPlease provide a detailed description:\n\n📝 Include specs, condition, or special requirements:`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 3: Attachments (Skip for now)
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return; // Ignore commands
        if (!ctx.message?.text) return;
        
        ctx.wizard.state.formData.description = ctx.message.text;
        console.log(`[Transaction Wizard] Description set: ${ctx.wizard.state.formData.description}`);
        
        ctx.reply(`🛒 <b>Step 3/7: Attachments</b>\n\n📎 Upload Attachments (Optional)\n\n1️⃣ Upload via chat\n2️⃣ Skip this step`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '2️⃣ Skip this step', callback_data: 'skip_attachments' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 4: Currency
    async (ctx: any) => {
        if (ctx.callbackQuery) await ctx.answerCbQuery();
        ctx.reply(`🛒 <b>Step 4/7: Currency</b>\n\n💱 Choose Currency\n\nSelect the currency for this transaction:`, {
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
    // Step 5: Price
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        ctx.wizard.state.formData.currency = ctx.callbackQuery.data;
        await ctx.answerCbQuery();
        ctx.reply(`🛒 <b>Step 5/7: Amount</b>\n\n💰 How much is the price?\n\nEnter the amount in ${ctx.wizard.state.formData.currency}:`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 6: Fee Allocation
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return; // Ignore commands
        if (!ctx.message?.text) return;
        
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) {
            ctx.reply('❌ Invalid amount. Please enter a valid number (e.g. 5000):');
            return;
        }
        ctx.wizard.state.formData.amount = amount;
        console.log(`[Transaction Wizard] Amount set: ${amount}`);
        const fee = amount * 0.05;
        ctx.reply(`🛒 <b>Step 6/7: Fee Allocation</b>\n\n💵 Who pays the 5% transaction fee?\n\nAmount: ${amount} ${ctx.wizard.state.formData.currency}\nFee: ${fee} ${ctx.wizard.state.formData.currency}`, {
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
    // Step 7: Enter Other Party Safetag
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        ctx.wizard.state.formData.fee_allocation = ctx.callbackQuery.data;
        await ctx.answerCbQuery();
        const role = ctx.wizard.state.formData.role;
        ctx.reply(`👤 <b>Enter ${role === 'buyer' ? 'Seller' : 'Buyer'}'s Safetag</b>\n\nEnter the ${role === 'buyer' ? 'seller' : 'buyer'}'s Safetag (e.g., <code>@safetag_abc123</code>):\n\n💡 You can also search by name if you're not sure`, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 8: Validate Safetag & Show Profile Preview
    async (ctx: any) => {
        if (ctx.message?.text?.startsWith('/')) return; // Ignore commands
        if (!ctx.message?.text) return;
        // Step 8: Validate Safetag & Show Profile Preview
        const otherSafetag = ctx.message.text.startsWith('@') ? ctx.message.text.trim() : `@${ctx.message.text.trim()}`;
        const role = ctx.wizard.state.formData.role;

        try {
            // 1. Fetch target profile
            const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(otherSafetag)}`);
            const profile = res.data;
            ctx.wizard.state.formData.other_safetag = profile.safetag;
            ctx.wizard.state.formData.other_id = profile.id;

            // 2. Fetch current user profile (for the ?viewer= param)
            let mySafetag = '';
            try {
                const myProfileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
                mySafetag = myProfileRes.data.safetag || '';
            } catch (e: any) {
                console.log('Current user profile fetch failed:', e.message);
            }

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
                console.log('Review stats fetch failed:', e.message);
                ctx.wizard.state.formData.other_rating = 'No';
            }

            // 4. Construct safe URL for Telegram button
            let reviewsUrlBase = REVIEWS_URL;
            if (!reviewsUrlBase.startsWith('http')) {
                reviewsUrlBase = `http://${reviewsUrlBase}`;
            }
            // Ensure no double slash if REVIEWS_URL ends with one
            const cleanBase = reviewsUrlBase.endsWith('/') ? reviewsUrlBase.slice(0, -1) : reviewsUrlBase;
            const reviewsUrl = `${cleanBase}/reviews/${encodeURIComponent(profile.safetag)}?viewer=${encodeURIComponent(mySafetag)}`;

            console.log('Generating Reviews URL for Telegram button:', reviewsUrl);

            const isVerified = profile.kyc_status === 'VERIFIED';
            const verifiedEmoji = isVerified ? '✅🪪' : '❌🪪';
            const verifiedLabel = `${verifiedEmoji} Verified ${role === 'buyer' ? 'Seller' : 'Buyer'}`;

            await ctx.reply(`👤 <b>${role === 'buyer' ? 'Seller' : 'Buyer'} Profile</b>\n\n<code>${profile.safetag}</code>\n⭐ Rating: ${ratingStr} ${ratingSuffix}\n${verifiedLabel}\n\nContinue with this ${role === 'buyer' ? 'seller' : 'buyer'}?`, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Yes, Continue', callback_data: 'profile_confirm' }],
                        [{ text: '❌ No, Change', callback_data: 'profile_back' }],
                        [{ text: '⭐ View Reviews', url: reviewsUrl }]
                    ]
                }
            });
            return ctx.wizard.next();
        } catch (err: any) {
            console.error(`Profile lookup error for ${otherSafetag}:`, err.message);
            ctx.reply(`❌ <b>${role === 'buyer' ? 'Seller' : 'Buyer'} not found</b>\n\nThe Safetag "<code>${otherSafetag}</code>" doesn't exist.\n\nPlease check and try again:`, { parse_mode: 'HTML' });
            return; // Stay on this step
        }
    },
    // Step 9: Review Summary
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        if (ctx.callbackQuery.data === 'profile_back') {
            const role = ctx.wizard.state.formData.role;
            ctx.reply(`👤 <b>Enter ${role === 'buyer' ? 'Seller' : 'Buyer'}'s Safetag</b>:`, { parse_mode: 'HTML' });
            ctx.wizard.back();
            return;
        }
        await ctx.answerCbQuery();

        const { product_name, description, amount, currency, fee_allocation, other_safetag, role } = ctx.wizard.state.formData;
        const fee = amount * 0.05;
        const total = fee_allocation === 'buyer' ? amount + fee : (fee_allocation === 'split' ? amount + (fee / 2) : amount);

        const summary = `📋 <b>Transaction Summary</b>\n\nPlease review your transaction details:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🛒 Product/Service: <b>${product_name}</b>\n📝 Description: ${description}\n💰 Amount: <b>${amount} ${currency}</b>\n💵 Fee: <b>${fee.toFixed(2)} ${currency}</b> (${fee_allocation})\n💳 Total: <b>${total.toFixed(2)} ${currency}</b>\n👤 ${role === 'buyer' ? 'Seller' : 'Buyer'}: <code>${other_safetag}</code>\n⭐ ${role === 'buyer' ? 'Seller' : 'Buyer'} Rating: ${ctx.wizard.state.formData.other_rating || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        ctx.reply(summary, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '1️⃣ ✅ Confirm', callback_data: 'confirm' }],
                    [{ text: '2️⃣ ❌ Cancel', callback_data: 'cancel' }],
                    [{ text: '3️⃣ ✏️ Edit', callback_data: 'edit' }]
                ]
            }
        });
        return ctx.wizard.next();
    },
    // Step 10: Finalize or Edit
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'cancel') {
            ctx.reply('❌ Transaction creation cancelled.');
            return ctx.scene.leave();
        }

        if (action === 'edit') {
            ctx.reply('✏️ To edit, please start the process again (temporary limitation).');
            return ctx.scene.leave();
        }

        if (action === 'confirm') {
            try {
                const my_platform_id = ctx.from.id.toString();
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${my_platform_id}`);
                const mySafetag = profileRes.data.safetag;

                const { role, product_name, description, amount, currency, fee_allocation, other_safetag } = ctx.wizard.state.formData;

                const payload = {
                    buyer_safetag: role === 'buyer' ? mySafetag : other_safetag,
                    seller_safetag: role === 'seller' ? mySafetag : other_safetag,
                    product_name,
                    description,
                    amount,
                    currency,
                    fee_allocation,
                    initiator_safetag: mySafetag
                };

                const res = await axios.post(`${API_URL}/transactions/create`, payload);

                const successMsg = `✅ <b>Transaction Created!</b>\n\nYour transaction has been created and sent to the ${role === 'buyer' ? 'seller' : 'buyer'}.\n\n📋 Transaction ID: <b>${res.data.txn_code}</b>\n👤 ${role === 'buyer' ? 'Seller' : 'Buyer'}: <code>${other_safetag}</code>\n💰 Amount: <b>${amount} ${currency}</b>\n\n📬 You'll be notified when:\n• ${role === 'buyer' ? 'Seller' : 'Buyer'} accepts your request\n• Payment is required\n• Delivery is confirmed\n\n⏳ Current Status: <b>Awaiting ${role === 'buyer' ? 'Seller' : 'Buyer'} Acceptance</b>`;

                ctx.reply(successMsg, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '1️⃣ View Transaction', callback_data: `view_txn_${res.data.id}` }],
                            [{ text: '2️⃣ 🔙 Main Menu', callback_data: 'main_menu' }]
                        ]
                    }
                });
            } catch (err: any) {
                console.error('Finalize Error:', err);
                const errData = err.response?.data;
                if (errData?.error === 'USER_BLOCKED') {
                    await ctx.reply(
                        `🚫 <b>User Blocked</b>\n\nThe safetag <code>@${errData.safetag}</code> has been blocked by the platform and cannot participate in transactions.\n\nPlease choose a different safetag or create a new transaction.`,
                        {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔄 Choose Different Safetag', callback_data: 'profile_back' }],
                                    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                                ]
                            }
                        }
                    );
                } else {
                    ctx.reply(`❌ Error: ${errData?.error || err.message}`);
                }
            }
            return ctx.scene.leave();
        }
    }
);
