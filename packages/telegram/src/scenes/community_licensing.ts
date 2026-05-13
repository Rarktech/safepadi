import { Scenes } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3000/api';

const TIER_INFO: Record<string, { label: string; share: number; desc: string }> = {
    free: { label: 'Free', share: 10, desc: 'Basic escrow with Safeeely branding' },
    pro: { label: 'Pro', share: 25, desc: 'Custom welcome message + weekly earnings digest' },
    enterprise: { label: 'Enterprise', share: 40, desc: 'Highest share + custom fee rates for your group' },
};

// Step 0: Confirm group identity
const step0 = new Scenes.WizardScene<any>(
    'community_licensing_wizard',
    async (ctx) => {
        const { telegram_group_id, group_name } = ctx.wizard.state;

        await ctx.reply(
            `🏘️ <b>License Your Group</b>\n\nYou're setting up:\n\n<b>${group_name}</b>\n\nIs this the correct group?`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Yes, that\'s it', callback_data: 'cl_confirm_group' },
                            { text: '❌ Cancel', callback_data: 'cl_cancel' },
                        ],
                    ],
                },
            }
        );
        return ctx.wizard.next();
    },

    // Step 1: Choose license tier
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'cl_cancel') {
            await ctx.reply('❌ Group licensing cancelled.');
            return ctx.scene.leave();
        }

        await ctx.reply(
            `💼 <b>Choose Your License Tier</b>\n\nEach tier earns you a cut of every platform fee from deals in your group:\n\n` +
            `🟢 <b>Free</b> — Earn <b>10%</b> of platform fees\n${TIER_INFO.free.desc}\n\n` +
            `🔵 <b>Pro</b> — Earn <b>25%</b> of platform fees\n${TIER_INFO.pro.desc}\n\n` +
            `🟡 <b>Enterprise</b> — Earn <b>40%</b> of platform fees\n${TIER_INFO.enterprise.desc}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🟢 Free (10%)', callback_data: 'cl_tier_free' }],
                        [{ text: '🔵 Pro (25%)', callback_data: 'cl_tier_pro' }],
                        [{ text: '🟡 Enterprise (40%)', callback_data: 'cl_tier_enterprise' }],
                        [{ text: '❌ Cancel', callback_data: 'cl_cancel' }],
                    ],
                },
            }
        );
        return ctx.wizard.next();
    },

    // Step 2: Confirm and register
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'cl_cancel') {
            await ctx.reply('❌ Group licensing cancelled.');
            return ctx.scene.leave();
        }

        const tierKey = action.replace('cl_tier_', '');
        const tier = TIER_INFO[tierKey];
        if (!tier) {
            await ctx.reply('⚠️ Please choose a tier from the options above.');
            return;
        }

        ctx.wizard.state.license_tier = tierKey;

        const { group_name } = ctx.wizard.state;

        await ctx.reply(
            `✅ <b>Confirm Your Setup</b>\n\n` +
            `📌 Group: <b>${group_name}</b>\n` +
            `💼 Tier: <b>${tier.label}</b>\n` +
            `💰 Your cut: <b>${tier.share}%</b> of every platform fee in your group\n\n` +
            `Tap <b>Activate</b> to go live!`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🚀 Activate Group', callback_data: 'cl_activate' },
                            { text: '❌ Cancel', callback_data: 'cl_cancel' },
                        ],
                    ],
                },
            }
        );
        return ctx.wizard.next();
    },

    // Step 3: Register via API and post welcome to group
    async (ctx: any) => {
        if (!ctx.callbackQuery) return;
        const action = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (action === 'cl_cancel') {
            await ctx.reply('❌ Group licensing cancelled.');
            return ctx.scene.leave();
        }

        const { telegram_group_id, group_name, license_tier } = ctx.wizard.state;
        const adminTelegramId = ctx.from?.id;

        try {
            const res = await axios.post(`${API_URL}/communities/register`, {
                telegram_group_id,
                group_name,
                admin_telegram_id: String(adminTelegramId),
                license_tier,
            });

            const groupId = res.data.group?.id;
            const botUsername = (ctx as any).botInfo?.username || process.env.TELEGRAM_BOT_USERNAME || 'SafeeelyBot';
            const deepLink = `https://t.me/${botUsername}?start=group_${groupId}`;

            // Post welcome message in the group
            try {
                await ctx.telegram.sendMessage(
                    telegram_group_id,
                    `🔒 <b>This group is now powered by Safeeely escrow!</b>\n\nBuying or selling here? Tap below to start a secure trade — your money is protected until delivery is confirmed.`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🛡️ Start Secure Trade', url: deepLink },
                            ]],
                        },
                    }
                );
            } catch (groupMsgErr) {
                console.error('Could not post welcome to group (bot may not have send permissions):', groupMsgErr);
            }

            // Confirm to admin in DM
            const tier = TIER_INFO[license_tier] || TIER_INFO.free;
            await ctx.reply(
                `🎉 <b>Your group is live!</b>\n\n` +
                `<b>${group_name}</b> is now an official Safeeely escrow group.\n\n` +
                `💼 Tier: <b>${tier.label}</b>\n` +
                `💰 You earn: <b>${tier.share}%</b> of every platform fee from trades in your group\n\n` +
                `📣 I've posted the trade button in your group. Share the link below with your members:\n\n` +
                `<code>${deepLink}</code>\n\n` +
                `Use <b>📊 My Group</b> from the main menu to track earnings and activity.`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
                    },
                }
            );
        } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message;
            await ctx.reply(`❌ Failed to activate group: ${errMsg}`);
        }

        return ctx.scene.leave();
    }
);

export const communityLicensingScene = step0;
