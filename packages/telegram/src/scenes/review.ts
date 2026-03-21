import { Scenes, Markup } from 'telegraf';
import axios from 'axios';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';

export const reviewScene = new Scenes.WizardScene(
    'review_wizard',
    async (ctx) => {
        const state = ctx.scene.state as any;
        await ctx.reply(`⭐ <b>Leave a Review</b>\n\nHow many stars would you give the other party? (1-5)`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⭐ 1', 'stars_1'), Markup.button.callback('⭐ 2', 'stars_2')],
                [Markup.button.callback('⭐ 3', 'stars_3'), Markup.button.callback('⭐ 4', 'stars_4')],
                [Markup.button.callback('⭐ 5', 'stars_5')]
            ])
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const stars = parseInt((ctx.callbackQuery as any).data.split('_')[1]);
        (ctx.scene.state as any).stars = stars;
        await ctx.answerCbQuery();
        await ctx.editMessageText(`⭐ <b>Rating: ${stars}/5</b>\n\nWould you like to upload a photo/proof for this review?\n\nIf yes, <b>send the photo now</b>. If not, click <b>Skip</b>.`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('Skip (No Photo)', 'skip_photo')]])
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        const state = ctx.scene.state as any;
        if (ctx.callbackQuery && (ctx.callbackQuery as any).data === 'skip_photo') {
            await ctx.answerCbQuery();
            await ctx.editMessageText('📝 <b>Final Step</b>\n\nPlease send your review remark/comment now:', { parse_mode: 'HTML' });
            return ctx.wizard.next();
        }

        if (ctx.message && (ctx.message as any).photo) {
            const photo = (ctx.message as any).photo;
            const fileId = photo[photo.length - 1].file_id;
            const link = await ctx.telegram.getFileLink(fileId);
            state.proofUrl = link.href;
            await ctx.reply('✅ <b>Photo Attached!</b> Now, please send your review remark/comment:', { parse_mode: 'HTML' });
            return ctx.wizard.next();
        }

        return; // Wait for message
    },
    async (ctx) => {
        const state = ctx.scene.state as any;
        if (ctx.message && (ctx.message as any).text) {
            const remark = (ctx.message as any).text;

            try {
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/telegram/${ctx.from?.id}`);
                const mySafetag = profileRes.data.safetag;

                const txnRes = await axios.get(`${API_URL}/transactions/${state.txnId}`);
                const txn = txnRes.data;
                const otherTag = mySafetag === txn.buyer.safetag ? txn.seller.safetag : txn.buyer.safetag;

                await axios.post(`${API_URL}/reviews/create`, {
                    transaction_id: state.txnId,
                    reviewer_safetag: mySafetag,
                    reviewee_safetag: otherTag,
                    rating: state.stars,
                    comment: remark,
                    proof_url: state.proofUrl
                });

                await ctx.reply('🎉 <b>Thank you for leaving a review!</b>\n\nThis helps make buying and selling safer for everyone in the community.', {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🛒 Create Transaction', 'create_txn')],
                        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
                    ])
                });
            } catch (err: any) {
                console.error('Telegram Review Error:', err.message);
                await ctx.reply('❌ Error saving review. Please try again later.');
            }
            return ctx.scene.leave();
        }
    }
);
