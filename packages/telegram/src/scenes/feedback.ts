import { Scenes, Markup } from 'telegraf';
import axios from 'axios';
import { getCommentPrompt, pickRandom, FEEDBACK_SUCCESS_MESSAGES } from '@safepal/shared';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';

export const feedbackScene = new Scenes.WizardScene(
    'feedback_wizard',
    // Step 1: show 5-star picker
    async (ctx) => {
        const state = ctx.scene.state as any;
        await ctx.reply(
            `✨ <b>Rate Safeeely</b>\n\nhow many stars would you give us? tap below 👇`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('⭐', 'fb_star_1'),
                        Markup.button.callback('⭐⭐', 'fb_star_2'),
                        Markup.button.callback('⭐⭐⭐', 'fb_star_3'),
                    ],
                    [
                        Markup.button.callback('⭐⭐⭐⭐', 'fb_star_4'),
                        Markup.button.callback('⭐⭐⭐⭐⭐', 'fb_star_5'),
                    ],
                ])
            }
        );
        return ctx.wizard.next();
    },
    // Step 2: rating received → ask for comment
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = (ctx.callbackQuery as any).data as string;
        if (!data.startsWith('fb_star_')) return;

        const rating = parseInt(data.split('_')[2]);
        (ctx.scene.state as any).rating = rating;
        await ctx.answerCbQuery();

        const commentPrompt = getCommentPrompt(rating);
        await ctx.editMessageText(
            `${'⭐'.repeat(rating)} <b>${rating}/5</b>\n\n${commentPrompt}`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('⏭️ Skip', 'fb_skip_comment')]])
            }
        );
        return ctx.wizard.next();
    },
    // Step 3: collect comment or skip → submit
    async (ctx) => {
        const state = ctx.scene.state as any;
        let comment: string | undefined;

        if (ctx.callbackQuery && (ctx.callbackQuery as any).data === 'fb_skip_comment') {
            await ctx.answerCbQuery();
        } else if (ctx.message && (ctx.message as any).text) {
            comment = (ctx.message as any).text;
        } else {
            return;
        }

        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
            const safetag = profileRes.data.safetag;

            await axios.post(`${API_URL}/feedback`, {
                reviewer_safetag: safetag,
                rating: state.rating,
                comment,
                source: state.source || 'menu',
                source_ref_id: state.refId || undefined,
                platform: 'telegram',
            });

            const successMsg = pickRandom(FEEDBACK_SUCCESS_MESSAGES);
            await ctx.reply(
                `✅ <b>feedback received!</b>\n\n${successMsg}`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🏠 Main Menu', 'main_menu')],
                    ])
                }
            );
        } catch (err: any) {
            console.error('Telegram Feedback Error:', err.message);
            await ctx.reply('something went wrong on our end 😅 try again later?');
        }

        return ctx.scene.leave();
    }
);
