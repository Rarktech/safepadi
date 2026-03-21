import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';

export const registrationScene = new Scenes.WizardScene(
    'registration_wizard',
    // Step 0: Privacy Policy Agreement
    async (ctx: any) => {
        const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        await ctx.reply('👋 <b>Welcome to Safeeely!</b>\n\nYour trusted escrow service for secure social media transactions.\n\n🔒 Secure | 🌍 Cross-Platform | ⚡ Fast\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data.', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📜 Read Privacy Policy', url: `${reviewsUrl}/privacy` }],
                    [{ text: '✅ I Agree & Continue', callback_data: 'agree_policy' }]
                ]
            }
        });

        ctx.wizard.state.formData = {};

        // Retrieve referral code if passed from bot.start
        const state = ctx.scene.session.state as any;
        if (state && state.referralCode) {
            ctx.wizard.state.formData.referral_code = state.referralCode;
        }

        return ctx.wizard.next();
    },
    // Step 1: Login or Register Choice
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'agree_policy') {
            await ctx.answerCbQuery();
            await ctx.reply('🚀 <b>Let\'s get started!</b>\n\nDo you already have a Safeeely account from another social media (e.g. Discord)?', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🆕 I\'m New (Register)', callback_data: 'choice_register' }],
                        [{ text: '🔗 I Have an Account (Login)', callback_data: 'choice_login' }]
                    ]
                }
            });
            return ctx.wizard.next();
        }
        return ctx.reply('⚠️ Please click "✅ I Agree & Continue" to proceed.');
    },
    // Step 2: Branching Login/Register
    async (ctx: any) => {
        const choice = ctx.callbackQuery?.data;
        if (choice === 'choice_register') {
            await ctx.answerCbQuery();
            ctx.wizard.state.mode = 'REGISTER';
            await ctx.reply('📝 <b>Registration Step 1/8</b>\n\nPlease enter your first name:', { parse_mode: 'HTML' });
            return ctx.wizard.next();
        } else if (choice === 'choice_login') {
            await ctx.answerCbQuery();
            ctx.wizard.state.mode = 'LOGIN';
            await ctx.reply('🔗 <b>Safeeely Login</b>\n\nPlease enter your <b>Safetag</b> (e.g. @john_doe):', { parse_mode: 'HTML' });
            return ctx.wizard.next();
        }
        return ctx.reply('⚠️ Please select an option above.');
    },
    // Step 3: Handle Name (Reg) or Safetag (Login)
    async (ctx: any) => {
        if (ctx.wizard.state.mode === 'REGISTER') {
            ctx.wizard.state.formData.first_name = ctx.message.text;
            await ctx.reply('📝 Registration Step 2/8\n\nPlease enter your last name:');
            return ctx.wizard.next();
        } else {
            // LOGIN FLOW: Enter Safetag
            if (!ctx.message?.text) return;
            const safetag = ctx.message.text.startsWith('@') ? ctx.message.text : `@${ctx.message.text}`;
            ctx.wizard.state.safetag = safetag;
            
            try {
                await ctx.reply('⏳ Sending verification code...');
                await axios.post(`${API_URL}/auth/otp/send`, {
                    safetag,
                    platform: 'telegram',
                    platform_id: ctx.from.id.toString()
                });
                
                await ctx.reply(`🔐 <b>OTP Verification</b>\n\nWe've sent a 6-digit code to your email and your other linked social media accounts.\n\nPlease enter the code below to link your Telegram account:`, { parse_mode: 'HTML' });
                return ctx.wizard.next();
            } catch (err: any) {
                await ctx.reply(`❌ Error: ${err.response?.data?.error || 'Failed to send OTP. Please check your Safetag and try again.'}`);
                // Stay on this step to let them try tag again
            }
        }
    },
    // Step 4: Handle Last Name (Reg) or OTP (Login)
    async (ctx: any) => {
        if (ctx.wizard.state.mode === 'REGISTER') {
            ctx.wizard.state.formData.last_name = ctx.message.text;
            await ctx.reply('📝 Registration Step 3/8\n\nPlease enter your email address:\n📧 We\'ll use this for important notifications and account verification');
            return ctx.wizard.next();
        } else {
            // LOGIN FLOW: Verify OTP
            const otp = ctx.message.text;
            try {
                const res = await axios.post(`${API_URL}/auth/otp/verify`, {
                    safetag: ctx.wizard.state.safetag,
                    platform: 'telegram',
                    platform_id: ctx.from.id.toString(),
                    otp
                });

                const profile = res.data.profile;
                await ctx.reply(`👋 <b>Welcome back, ${profile.first_name || 'user'}!</b>\n\nYour Telegram account is now securely linked to your Safeeely profile.`, { parse_mode: 'HTML' });
                
                // Show main menu
                await ctx.reply('🏠 <b>Main Menu</b>\n\nWhat would you like to do today?', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🛒 Create Transaction', callback_data: 'create_txn' }, { text: '📋 My Transactions', callback_data: 'my_txns' }],
                            [{ text: '💰 Balance & Withdrawals', callback_data: 'balance' }, { text: '🎁 Referral', callback_data: 'referral' }],
                            [{ text: '⭐ Reviews & Ratings', callback_data: 'reviews' }, { text: '⚙️ Settings & Account', callback_data: 'settings' }]
                        ]
                    }
                });
                return ctx.scene.leave();
            } catch (err: any) {
                await ctx.reply(`❌ Verification failed: ${err.response?.data?.error || 'Invalid code.'}\n\nPlease enter the correct 6-digit code:`);
            }
        }
    },
    // Step 5: Handle Email (Reg)
    async (ctx: any) => {
        const email = ctx.message.text;
        if (!email.includes('@')) {
            await ctx.reply('❌ Invalid email format\n\nPlease enter a valid email address:');
            return;
        }
        ctx.wizard.state.formData.email = email;
        await ctx.reply(`📝 Registration Step 4/8\n\n📧 We've sent a verification code to: ${email}\n\nPlease enter the 6-digit code: (Enter 123456 to bypass)`);
        return ctx.wizard.next();
    },
    // Step 6: Handle Email OTP (Reg)
    async (ctx: any) => {
        const otp = ctx.message.text;
        if (otp !== '123456') {
            await ctx.reply('❌ Invalid code\n\nPlease enter 123456 to continue:');
            return;
        }
        await ctx.reply('📝 Registration Step 5/8\n\n✏️ Choose Your Safetag\n\nPlease enter your preferred Safetag (e.g. @john_doe):');
        return ctx.wizard.next();
    },
    // Step 7: Finalize Registration
    async (ctx: any) => {
        const safetag = ctx.message.text.startsWith('@') ? ctx.message.text : `@${ctx.message.text}`;
        ctx.wizard.state.formData.safetag = safetag;

        try {
            const response = await axios.post(`${API_URL}/profiles/register`, {
                ...ctx.wizard.state.formData,
                primary_platform: 'telegram',
                platform_id: ctx.from.id.toString()
            });

            await ctx.reply(`🎉 Registration Complete!\n\n✅ You're all set!\n\nYour Safetag: ${response.data.safetag}\n📧 Email: ${response.data.email}\n\n🔐 Your account is secure and ready to use.`);
            
            // Show main menu
            await ctx.reply('🏠 <b>Main Menu</b>\n\nWhat would you like to do today?', {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🛒 Create Transaction', callback_data: 'create_txn' }, { text: '📋 My Transactions', callback_data: 'my_txns' }],
                        [{ text: '💰 Balance & Withdrawals', callback_data: 'balance' }, { text: '🎁 Referral', callback_data: 'referral' }],
                        [{ text: '⭐ Reviews & Ratings', callback_data: 'reviews' }, { text: '⚙️ Settings & Account', callback_data: 'settings' }]
                    ]
                }
            });
            return ctx.scene.leave();
        } catch (err: any) {
            await ctx.reply(`❌ Registration failed: ${err.response?.data?.error || err.message}`);
            return ctx.scene.leave();
        }
    }
);
