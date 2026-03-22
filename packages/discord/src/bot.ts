import { Client, GatewayIntentBits, Partials, Collection, InteractionReplyOptions } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL = process.env.REVIEWS_URL || 'http://localhost:3001';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});

client.on('ready', () => {
    console.log(`✅ Safeeely Discord Bot is logged in as ${client.user?.tag} (PID: ${process.pid})`);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

const reviewStates = new Collection<string, { txnId: string, stars?: number, proofUrl?: string, role?: string }>();
const AWAITING_REVIEW_REMARK = new Collection<string, boolean>();
const txnDrafts = new Collection<string, {
    role: string,
    product: string,
    desc: string,
    currency?: string,
    amount?: string,
    other?: string,
    fee_allocation?: string
}>();

const formatMessageForDiscord = (text: string): string => {
    if (!text) return text;
    return text
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<i>(.*?)<\/i>/gi, '_$1_')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/gi, '[$2]($1)');
};

const sendMainMenu = async (messageOrInteraction: any) => {
    const rawContent = '🏠 **Main Menu**\n\nWhat would you like to do today?';
    const content = formatMessageForDiscord(rawContent);
    const components = [
        {
            type: 1,
            components: [
                { type: 2, label: '🛒 Create Transaction', style: 1, customId: 'create_txn' },
                { type: 2, label: '📋 My Transactions', style: 2, customId: 'my_txns' },
            ],
        },
        {
            type: 1,
            components: [
                { type: 2, label: '💰 Balance & Withdrawals', style: 2, customId: 'balance' },
                { type: 2, label: '🎁 Referral', style: 2, customId: 'referral' },
            ],
        },
        {
            type: 1,
            components: [
                { type: 2, label: '⭐ Reviews & Ratings', style: 2, customId: 'reviews' },
                { type: 2, label: '⚙️ Settings & Account', style: 2, customId: 'settings' },
            ],
        },
    ];

    try {
        if (messageOrInteraction.replied || messageOrInteraction.deferred) {
            await messageOrInteraction.editReply({ content, components });
        } else if (messageOrInteraction.isButton?.() || messageOrInteraction.isStringSelectMenu?.()) {
            await messageOrInteraction.update({ content, components });
        } else if (messageOrInteraction.reply) {
            await messageOrInteraction.reply({ content, components });
        }
    } catch (err: any) {
        console.error('Error sending main menu:', err.message);
    }
};

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    console.log(`💬 Discord msg from ${message.author.tag}: ${message.content}`);

    // Handle Image Proof Uploads (Delivery or Review)
    if (message.attachments.size > 0) {
        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${message.author.id}`);
            const mySafetag = profileRes.data.safetag;

            // Check if user is in review flow and awaiting proof
            const reviewState = reviewStates.get(message.author.id);
            if (reviewState && reviewState.stars && !reviewState.proofUrl) {
                reviewState.proofUrl = message.attachments.first()?.url;
                await message.reply('✅ **Proof Attached!** Now, please provide a brief remark/comment for your review:');
                AWAITING_REVIEW_REMARK.set(message.author.id, true);
                return;
            }

            const txnsRes = await axios.get(`${API_URL}/transactions`, {
                params: { seller_safetag: mySafetag, status: 'AWAITING_PROOF' }
            });

            if (txnsRes.data && txnsRes.data.length > 0) {
                const txn = txnsRes.data[0];
                const proofUrl = message.attachments.first()?.url;

                if (proofUrl) {
                    await axios.post(`${API_URL}/transactions/${txn.id}/upload-proof`, {
                        proof_url: proofUrl
                    });
                    return; // Stop processing further
                }
            }
        } catch (err: any) {
            console.error('Discord Image Upload Error:', err.message);
        }
    }

    // Handle Review Remarks
    if (AWAITING_REVIEW_REMARK.has(message.author.id)) {
        const reviewState = reviewStates.get(message.author.id);
        const remark = message.content;

        if (reviewState && reviewState.stars) {
            try {
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${message.author.id}`);
                const mySafetag = profileRes.data.safetag;

                const txnRes = await axios.get(`${API_URL}/transactions/${reviewState.txnId}`);
                const txn = txnRes.data;
                const otherTag = mySafetag === txn.buyer.safetag ? txn.seller.safetag : txn.buyer.safetag;

                await axios.post(`${API_URL}/reviews/create`, {
                    transaction_id: reviewState.txnId,
                    reviewer_safetag: mySafetag,
                    reviewee_safetag: otherTag,
                    rating: reviewState.stars,
                    comment: remark,
                    proof_url: reviewState.proofUrl
                });

                await message.reply({
                    content: '🎉 **Thank you for leaving a review!**\n\nThis helps make buying and selling safer for everyone in the community.',
                    components: [
                        {
                            type: 1, components: [
                                { type: 2, label: '🛒 Create Transaction', style: 1, customId: 'create_txn' },
                                { type: 2, label: '🏠 Main Menu', style: 2, customId: 'main_menu_back' }
                            ]
                        }
                    ]
                });

                reviewStates.delete(message.author.id);
                AWAITING_REVIEW_REMARK.delete(message.author.id);
                return;
            } catch (err: any) {
                console.error('Review Save Error:', err.message);
                await message.reply('❌ Error saving review. Please try again later.');
            }
        }
    }

    if (message.content.startsWith('!start') || message.content.startsWith('!menu')) {
        let referralCode = '';
        const parts = message.content.split(' ');
        if (parts.length > 1 && parts[1].startsWith('ref_')) {
            referralCode = parts[1].substring(4);
        }

        console.log(`📩 Command received: ${message.content} from ${message.author.tag}`);
        try {
            const response = await axios.get(`${API_URL}/profiles/by_platform/discord/${message.author.id}`);
            if (response.data && response.data.safetag) {
                await sendMainMenu(message);
            }
        } catch (err: any) {
            if (err.response?.status === 404) {
                const customId = referralCode ? `start_registration|${referralCode}` : 'start_registration';
                await message.reply({
                    content: '👋 **Welcome to Safeeely!**\n\nYour trusted escrow service for secure social media transactions.\n\n🔒 Secure | 🌍 Cross-Platform | ⚡ Fast\n\nIt looks like you\'re new here. Do you already have a Safeeely account from another platform?',
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '🆕 I\'m New (Register)', style: 1, custom_id: customId },
                                { type: 2, label: '🔗 I Have an Account (Login)', style: 2, custom_id: `start_login` }
                            ]
                        }
                    ]
                });
            } else {
                console.error('❌ API Error in messageCreate:', err.message);
                message.reply('❌ An error occurred while connecting to Safeeely services.');
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        const customId = (interaction as any).customId;

        if (interaction.isButton()) {
            console.log(`🔘 Button Clicked: ${customId} by ${interaction.user.tag}`);

            // ⚡ IMMEDIATE acknowledgment for status updates to avoid "Interaction failed" (3s window)
            if (customId.startsWith('txn_action_')) {
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                const parts = customId.replace('txn_action_', '').split('|');
                const act = parts[0];
                const txnId = parts[1];
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: act, updater_safetag: profileRes.data.safetag });
                    const dat = res.data;

                    await interaction.editReply({
                        content: formatMessageForDiscord(dat.follow_up_msg),
                        components: dat.follow_up_options ? [{
                            type: 1,
                            components: dat.follow_up_options.map((o: any) => ({
                                type: 2,
                                label: o.label,
                                style: o.url ? 5 : (o.customId?.includes('accept') || o.customId?.includes('confirm') ? 3 : (o.customId?.includes('decline') || o.customId?.includes('cancel') ? 4 : 2)),
                                ...(o.url ? { url: o.url } : { custom_id: o.customId })
                            }))
                        }] : []
                    });
                    return; // ⚡ Correct: Handled
                } catch (err: any) {
                    console.error('Action processing failed:', err.message);
                    await interaction.followUp({ content: `❌ Action failed: ${err.response?.data?.error || err.message}`, ephemeral: true }).catch(() => {});
                    return;
                }
            }

            if (interaction.replied || interaction.deferred) return;

            if (customId.startsWith('start_registration')) {
                const referralCode = customId.split('|')[1] || '';
                const agreeId = referralCode ? `accept_policy|${referralCode}` : 'accept_policy';
                await interaction.reply({
                    content: '📜 **Safeeely Privacy Policy**\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data.',
                    components: [{ type: 1, components: [{ type: 2, label: '📜 Read Policy', style: 5, url: `${REVIEWS_URL}/privacy` }, { type: 2, label: '✅ I Agree', style: 3, custom_id: agreeId }] }],
                    ephemeral: true
                });
            } else if (customId === 'start_login') {
                // @ts-ignore
                await interaction.showModal({
                    title: '🔗 Safeeely Login',
                    custom_id: 'login_modal',
                    components: [{ type: 1, components: [{ type: 4, custom_id: 'safetag', label: 'Your Safetag', style: 1, placeholder: '@username', required: true }] }]
                });
            } else if (customId.startsWith('accept_policy')) {
                const referralCode = customId.split('|')[1] || '';
                // @ts-ignore
                await interaction.showModal({
                    title: '📝 Safeeely Registration',
                    custom_id: referralCode ? `registration_modal|${referralCode}` : 'registration_modal',
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'first_name', label: 'First Name', style: 1, placeholder: 'Enter your first name', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'last_name', label: 'Last Name', style: 1, placeholder: 'Enter your last name', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'email', label: 'Email Address', style: 1, placeholder: 'example@email.com', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'safetag', label: 'Choose Your Safetag', style: 1, placeholder: '@username', required: true }] },
                    ]
                });
            } else if (customId === 'create_txn') {
                await interaction.reply({
                    content: '🛒 **Create New Transaction**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAre you the **Buyer** or the **Seller** in this transaction?\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '🛒 I am the Buyer', style: 1, custom_id: 'txn_role|buyer', emoji: { name: '🛒' } },
                                { type: 2, label: '💰 I am the Seller', style: 2, custom_id: 'txn_role|seller', emoji: { name: '💰' } }
                            ]
                        },
                        {
                            type: 1,
                            components: [{ type: 2, label: '🔙 Back to Menu', style: 2, custom_id: 'main_menu' }]
                        }
                    ],
                    ephemeral: true
                });
            } else if (customId.startsWith('txn_role|')) {
                const role = customId.split('|')[1];
                // @ts-ignore
                await interaction.showModal({
                    title: `📦 ${role.toUpperCase()} - Product Details`,
                    custom_id: `txn_modal_step1|${role}`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'product_name', label: 'What is the Product/Service?', style: 1, placeholder: 'e.g. Instagram Account @handle', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'description', label: 'Detailed Description', style: 2, placeholder: 'Include specs, condition, or special requirements...', required: true }] }
                    ]
                });
            } else if (customId.startsWith('txn_curr_select|')) {
                const currency = customId.split('|')[1];
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost. Please start over.', ephemeral: true });
                draft.currency = currency;

                // @ts-ignore
                await interaction.showModal({
                    title: '💰 Transaction Amount',
                    custom_id: `txn_modal_amount`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'amount', label: `Amount in ${currency}`, style: 1, placeholder: 'Enter numbers only, e.g. 5000', required: true }] }
                    ]
                });
            } else if (customId.startsWith('txn_fee_select|')) {
                const fee_allocation = customId.split('|')[1];
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost. Please start over.', ephemeral: true });
                draft.fee_allocation = fee_allocation;

                // @ts-ignore
                await interaction.showModal({
                    title: '👤 Counterparty Details',
                    custom_id: `txn_modal_other`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'other_party', label: 'Other Party Safetag', style: 1, placeholder: 'e.g. @john_doe', required: true }] }
                    ]
                });
            } else if (customId === 'txn_confirm_final') {
                await interaction.deferReply({ ephemeral: true });
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply('❌ Draft missing.');
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const creatorTag = profileRes.data.safetag;
                    const res = await axios.post(`${API_URL}/transactions/create`, {
                        buyer_safetag: draft.role === 'buyer' ? creatorTag : draft.other,
                        seller_safetag: draft.role === 'seller' ? creatorTag : draft.other,
                        product_name: draft.product,
                        description: draft.desc,
                        amount: parseFloat(draft.amount || '0'),
                        currency: draft.currency,
                        fee_allocation: draft.fee_allocation?.toLowerCase(),
                        initiator_safetag: creatorTag
                    });
                    txnDrafts.delete(interaction.user.id);
                    await interaction.editReply({
                        content: `✅ **Transaction Created Successfully!**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: **${res.data.txn_code}**\n🛒 Product: **${draft.product}**\n💰 Total: **${draft.amount} ${draft.currency}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📬 The other party has been notified and must accept to proceed.`,
                        components: [{ type: 1, components: [{ type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }] }]
                    });
                } catch (err: any) {
                    const errData = err.response?.data;
                    if (errData?.error === 'USER_BLOCKED') {
                        await interaction.editReply({
                            content: `🚫 **User Blocked**\n\nThe safetag **@${errData.safetag}** has been blocked by the platform and cannot participate in transactions.\n\nPlease choose a different safetag or create a new transaction.`,
                            components: [{
                                type: 1, components: [
                                    { type: 2, label: '🔄 Create New Transaction', style: 1, custom_id: 'create_txn' },
                                    { type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }
                                ]
                            }]
                        });
                    } else {
                        await interaction.editReply(`❌ Failed: ${errData?.error || err.message}`);
                    }
                }
            } else if (customId === 'txn_cancel') {
                txnDrafts.delete(interaction.user.id);
                await interaction.update({ content: '❌ Cancelled.', components: [{ type: 1, components: [{ type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }] }] });
            } else if (customId === 'my_txns') {
                await interaction.reply({
                    content: '📋 **My Transactions**\n\nChoose a category to view:',
                    components: [
                        {
                            type: 1, components: [
                                { type: 2, label: '🔄 Ongoing', style: 1, custom_id: 'view_txns_category|ongoing' },
                                { type: 2, label: '✅ Completed', style: 2, custom_id: 'view_txns_category|completed' }
                            ]
                        },
                        {
                            type: 1, components: [
                                { type: 2, label: '⚠️ Disputed', style: 4, custom_id: 'view_txns_category|disputed' },
                                { type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }
                    ],
                    ephemeral: true
                });
            } else if (customId === 'main_menu' || customId === 'main_menu_back') {
                await sendMainMenu(interaction);
            } else if (customId.startsWith('view_txns_category|')) {
                const category = customId.split('|')[1];
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const txnsRes = await axios.get(`${API_URL}/transactions`, { params: { safetag: profileRes.data.safetag, category } });
                    const txns = txnsRes.data;
                    if (!txns.length) return interaction.editReply({ content: `No ${category} transactions found.`, components: [{ type: 1, components: [{ type: 2, label: '🔙 Back', style: 2, custom_id: 'my_txns' }] }] });
                    const options = txns.slice(0, 25).map((t: any) => ({ label: `${t.product_name.slice(0, 50)}`, description: `${t.amount} ${t.currency} | ${t.txn_code}`, value: `view_txn_select_val|${t.id}` }));
                    await interaction.editReply({
                        content: `📋 **${category.toUpperCase()} Transactions**`,
                        components: [{ type: 1, components: [{ type: 3, custom_id: 'view_txn_select', placeholder: 'Select...', options }] }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId.startsWith('txn_resume|')) {
                const txnId = customId.split('|')[1];
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const statusRes = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'resume', updater_safetag: profileRes.data.safetag });
                    const dat = statusRes.data;
                    await interaction.editReply({
                        content: formatMessageForDiscord(dat.follow_up_msg),
                        components: dat.follow_up_options ? [{ type: 1, components: dat.follow_up_options.map((o: any) => ({ type: 2, label: o.label, style: o.url ? 5 : 2, ...(o.url ? { url: o.url } : { custom_id: o.customId }) })) }] : []
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId.startsWith('txn_dispute_')) {
                const tid = customId.split('_')[2];
                // @ts-ignore
                await interaction.showModal({ title: '⚠️ Dispute', custom_id: `dispute_modal|${tid}`, components: [{ type: 1, components: [{ type: 4, custom_id: 'reason', label: 'Reason', style: 2, min_length: 10, required: true }] }] });
            } else if (customId === 'balance') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    const bRes = await axios.get(`${API_URL}/profiles/${safetag}/balance`);
                    const { balances } = bRes.data;

                    let msg = '💰 **Available Balance**\n\n';
                    if (!balances || balances.length === 0) {
                        msg += 'You currently have no available balance. Complete transactions to earn!';
                    } else {
                        balances.forEach((b: any) => {
                            const emoji = b.currency === 'NGN' ? '🇳🇬' : (b.currency === 'USD' ? '🇺🇸' : '🪙');
                            msg += `${emoji} **${b.amount.toLocaleString()} ${b.currency}**\n`;
                        });
                        msg += '\n_Balances are calculated from your completed (finalized) sales._';
                    }

                    await interaction.editReply({
                        content: msg,
                        components: [{
                            type: 1, components: [
                                { type: 2, label: '💸 Withdraw Funds', style: 5, url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}?viewer=${encodeURIComponent(safetag)}` },
                                { type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Balance Error: ${err.message}`); }
            } else if (customId === 'referral') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    const sRes = await axios.get(`${API_URL}/referrals/${safetag}/stats`);
                    const stats = sRes.data;

                    const cleanSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                    const referralLink = `${REVIEWS_URL}/${cleanSafetag}`;

                    const msg = `🎁 **My Referrals**\n\nInvite friends and earn up to **1.5% commision for life on all secured purchases**!\n\n🔗 **Your Invite Link:**\n\`${referralLink}\`\n\n📊 **Statistics:**\n👥 Tier 1 Referrals: **${stats.tier1Count}**\n👥 Tier 2 Referrals: **${stats.tier2Count}**\n💰 Total Earned: **$${stats.totalEarned.toFixed(2)}**\n💵 Available: **$${stats.availableCommission.toFixed(2)}**`;

                    const components = [{
                        type: 1, components: [
                            { type: 2, label: '💸 Withdraw Earnings', style: 5, url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}?viewer=${encodeURIComponent(safetag)}#referrals` },
                            { type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                        ]
                    }];

                    try {
                        const cardUrl = `${API_URL}/referrals/${safetag}/card`;
                        const imageResponse = await axios.get(cardUrl, {
                            responseType: 'arraybuffer',
                            timeout: 30000
                        });
                        
                        await interaction.editReply({
                            content: msg,
                            files: [{
                                attachment: Buffer.from(imageResponse.data),
                                name: 'referral-card.png'
                            }],
                            components
                        });
                    } catch (imgErr) {
                        console.error('Failed to generate referral card image, falling back to text:', imgErr);
                        await interaction.editReply({
                            content: msg,
                            components
                        });
                    }
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'reviews') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    const sRes = await axios.get(`${API_URL}/reviews/stats/${safetag}`);
                    const { average_rating, review_count } = sRes.data;

                    const rating = average_rating || 0;
                    const starsInt = Math.round(rating);
                    const stars = '⭐'.repeat(starsInt) + '☆'.repeat(5 - starsInt);

                    const msg = `⭐ **Reviews & Ratings**\n\nYou have a trust score of **${rating.toFixed(1)}/5 ${stars}** (based on **${review_count}** reviews).\n\nYou can view your full review history on our external platform.`;

                    await interaction.editReply({
                        content: msg,
                        components: [{
                            type: 1, components: [
                                { type: 2, label: '👌 View Reviews', style: 5, url: `${REVIEWS_URL}/reviews/${encodeURIComponent(safetag)}?viewer=${encodeURIComponent(safetag)}` },
                                { type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'settings') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const p = profileRes.data;
                    const msg = `⚙️ **Account Settings**\n\n` +
                        `👤 Safetag: \`${p.safetag}\`\n` +
                        `📧 Email: ${p.email}\n` +
                        `👤 Name: ${p.first_name} ${p.last_name}\n\n` +
                        `Manage your account and privacy preferences below:`;
                    await interaction.editReply({
                        content: msg,
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: '❌ Delete Account', style: 4, custom_id: 'start_deletion' },
                                { type: 2, label: '🛡️ KYC Settings', style: 5, url: `${REVIEWS_URL}/kyc?viewer=${encodeURIComponent(p.safetag)}` },
                                { type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'start_deletion') {
                await interaction.reply({
                    content: '⚠️ **Account Deletion**\n\n' +
                        'By deleting your account:\n' +
                        '• Your personal details (name, email) will be removed.\n' +
                        '• All linked social media accounts will be unlinked.\n' +
                        '• Your payout methods will be deleted.\n\n' +
                        '**Note:** Your transaction history will remain on the platform for record-keeping and dispute resolution purposes.\n\n' +
                        'Are you sure you want to proceed?',
                    components: [{
                        type: 1,
                        components: [
                            { type: 2, label: '❌ Yes, Delete My Account', style: 4, custom_id: 'confirm_deletion_modal' },
                            { type: 2, label: '🏠 Cancel', style: 2, custom_id: 'settings' }
                        ]
                    }],
                    ephemeral: true
                });
            } else if (customId === 'confirm_deletion_modal') {
                // @ts-ignore
                await interaction.showModal({
                    title: '👋 Account Feedback',
                    custom_id: 'deletion_feedback_modal',
                    components: [{
                        type: 1,
                        components: [{
                            type: 4,
                            custom_id: 'reason',
                            label: 'Why are you leaving? (Optional)',
                            style: 2,
                            placeholder: 'Your feedback helps us improve...',
                            required: false
                        }]
                    }]
                });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (customId === 'view_txn_select') {
                const txnId = interaction.values[0].replace('view_txn_select_val|', '');
                await interaction.deferReply({ ephemeral: true });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const myTag = profileRes.data.safetag;
                    const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                    const t = res.data;

                    const otherTag = t.buyer.safetag === myTag ? t.seller.safetag : t.buyer.safetag;

                    const msg = `📋 **Transaction Details**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: **${t.txn_code}**\n🛒 Product: **${t.product_name}**\n📝 Desc: ${t.description || 'N/A'}\n💰 Amount: **${t.amount} ${t.currency}**\n💵 Fee: **${t.fee_amount.toFixed(2)} ${t.currency}** (${t.fee_allocation})\n💳 Total: **${t.total_amount.toFixed(2)} ${t.currency}**\n👤 Buyer: \`${t.buyer.safetag}\`\n👤 Seller: \`${t.seller.safetag}\`\n💠 Status: **${t.status.replace(/_/g, ' ')}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                    const components: any[] = [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '🔙 Back', style: 2, custom_id: 'my_txns' },
                                { type: 2, label: '⭐ View Counterparty Reviews', style: 5, url: `${REVIEWS_URL}/reviews/${encodeURIComponent(otherTag)}?viewer=${encodeURIComponent(myTag)}` }
                            ]
                        }
                    ];

                    const isOngoing = ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status);
                    if (isOngoing) {
                        components[0].components.push({ type: 2, label: '🚀 Action', style: 1, custom_id: `txn_resume|${t.id}` });
                    }

                    await interaction.editReply({ content: msg, components });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'txn_curr') {
                const currency = (interaction as any).values[0];
                const draft = txnDrafts.get(interaction.user.id);
                if (draft) draft.currency = currency;
                await interaction.update({
                    content: `🛒 **Transaction: ${draft?.product}**\nRole: **${draft?.role?.toUpperCase()}**\nCurrency: **${currency}**`,
                    components: [{ type: 1, components: [{ type: 2, label: '🔢 Enter Details', style: 1, custom_id: `txn_continue` }] }]
                });
            }
        }

        if (interaction.isModalSubmit()) {
            console.log(`📝 Modal: ${customId} by ${interaction.user.tag}`);
            if (customId.startsWith('registration_modal')) {
                const referralCode = customId.split('|')[1] || '';
                await interaction.deferReply({ ephemeral: true });
                const firstName = interaction.fields.getTextInputValue('first_name');
                const lastName = interaction.fields.getTextInputValue('last_name');
                const email = interaction.fields.getTextInputValue('email');
                const safetag = interaction.fields.getTextInputValue('safetag');
                const finalSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                try {
                    const payload: any = { safetag: finalSafetag, email, first_name: firstName, last_name: lastName, primary_platform: 'discord', platform_id: interaction.user.id };
                    if (referralCode) payload.referral_code = referralCode;
                    await axios.post(`${API_URL}/profiles/register`, payload);
                    await interaction.editReply(`🎉 **Registered!** Your Safetag is **${finalSafetag}**`);
                    await sendMainMenu(interaction);
                } catch (err: any) { await interaction.editReply(`❌ Failed: ${err.response?.data?.error || err.message}`); }
            } else if (customId === 'login_modal') {
                const safetag = interaction.fields.getTextInputValue('safetag');
                const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                await interaction.deferReply({ ephemeral: true });
                try {
                    await axios.post(`${API_URL}/auth/otp/send`, { safetag: cleanTag, platform: 'discord', platform_id: interaction.user.id });
                    await interaction.editReply({
                        content: `🔐 **OTP Sent** to your linked accounts.\nPlease enter it to link this Discord:`,
                        components: [{ type: 1, components: [{ type: 2, label: '🔢 Enter OTP', style: 1, custom_id: `verify_otp_btn|${cleanTag}` }] }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.response?.data?.error || 'Failed.'}`); }
            } else if (customId.startsWith('otp_verify_modal|')) {
                const safetag = customId.split('|')[1];
                const otp = interaction.fields.getTextInputValue('otp_code');
                await interaction.deferReply({ ephemeral: true });
                try {
                    const res = await axios.post(`${API_URL}/auth/otp/verify`, { safetag, platform: 'discord', platform_id: interaction.user.id, otp });
                    await interaction.editReply(`👋 **Welcome back!** Your Discord is linked.`);
                    await sendMainMenu(interaction);
                } catch (err: any) { await interaction.editReply(`❌ Verification failed: ${err.response?.data?.error || 'Invalid.'}`); }
            } else if (customId.startsWith('dispute_modal|')) {
                const txnId = customId.split('|')[1];
                await interaction.deferReply({ ephemeral: true });
                const reason = interaction.fields.getTextInputValue('reason');
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    await axios.post(`${API_URL}/disputes/raise`, { transaction_id: txnId, raised_by: profileRes.data.id, reason });
                    await interaction.editReply({ content: `✅ **Dispute Raised!** The transaction is frozen.`, components: [{ type: 1, components: [{ type: 2, label: '🏠 Menu', style: 2, custom_id: 'main_menu' }] }] });
                } catch (err: any) { await interaction.editReply(`❌ Failed: ${err.message}`); }
            } else if (customId.startsWith('txn_modal_step1|')) {
                const role = customId.split('|')[1];
                txnDrafts.set(interaction.user.id, {
                    role,
                    product: interaction.fields.getTextInputValue('product_name'),
                    desc: interaction.fields.getTextInputValue('description')
                });

                await interaction.reply({
                    content: '💱 **Choose Currency**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect the currency for this transaction:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '🇳🇬 NGN (Naira)', style: 2, custom_id: 'txn_curr_select|NGN', emoji: { name: '🇳🇬' } },
                                { type: 2, label: '🇺🇸 USD (Dollar)', style: 2, custom_id: 'txn_curr_select|USD', emoji: { name: '🇺🇸' } },
                                { type: 2, label: '🪙 USDT (Tether)', style: 2, custom_id: 'txn_curr_select|USDT', emoji: { name: '🪙' } }
                            ]
                        }
                    ],
                    ephemeral: true
                });
            } else if (customId === 'txn_modal_amount') {
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '❌ Invalid amount. Please enter a valid number (e.g. 5000).', ephemeral: true });
                }

                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost.', ephemeral: true });
                draft.amount = amountStr;

                const fee = amount * 0.05;

                await interaction.reply({
                    content: `💵 **Fee Allocation**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nWho pays the **5% transaction fee**?\n\n💰 Amount: **${amount} ${draft.currency}**\n💵 Fee: **${fee.toFixed(2)} ${draft.currency}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '👤 Buyer pays 100%', style: 1, custom_id: 'txn_fee_select|buyer' },
                                { type: 2, label: '👤 Seller pays 100%', style: 2, custom_id: 'txn_fee_select|seller' },
                                { type: 2, label: '🤝 Split (50/50)', style: 2, custom_id: 'txn_fee_select|split' }
                            ]
                        }
                    ],
                    ephemeral: true
                });
            } else if (customId === 'txn_modal_other') {
                await interaction.deferReply({ ephemeral: true });
                const other = interaction.fields.getTextInputValue('other_party');
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply('❌ State lost.');

                const cleanOther = other.startsWith('@') ? other : `@${other}`;
                draft.other = cleanOther;

                try {
                    const res = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(cleanOther)}`);
                    const statsRes = await axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(cleanOther)}`);
                    const { average_rating, review_count } = statsRes.data;

                    const rating = average_rating || 0;
                    const starsInt = Math.round(rating);
                    const stars = '⭐'.repeat(starsInt) + '☆'.repeat(5 - starsInt);

                    const amount = parseFloat(draft.amount || '0');
                    const feeAllocation = draft.fee_allocation || 'buyer';
                    const fee = amount * 0.05;
                    const total = feeAllocation === 'buyer' ? amount + fee : (feeAllocation === 'split' ? amount + (fee / 2) : amount);

                    const profile = res.data;
                    const isVerified = profile.kyc_status === 'VERIFIED';
                    const verifiedEmoji = isVerified ? '✅🪪' : '❌🪪';
                    const verifiedText = isVerified ? 'Verified' : 'Verified'; 

                    const summary = `📋 **Transaction Summary**\n\nPlease review the details carefully:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🛒 Product: **${draft.product}**\n📝 Desc: ${draft.desc}\n💰 Amount: **${draft.amount} ${draft.currency}**\n💵 Fee: **${fee.toFixed(2)} ${draft.currency}** (${feeAllocation})\n💳 Total: **${total.toFixed(2)} ${draft.currency}**\n👤 Party: \`${cleanOther}\` ${verifiedEmoji} ${verifiedText}\n⭐ Rating: **${rating.toFixed(1)}/5 ${stars}** (${review_count} reviews)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nProceed with creating this transaction?`;

                    await interaction.editReply({
                        content: summary,
                        components: [
                            {
                                type: 1,
                                components: [
                                    { type: 2, label: '✅ Yes, Create', style: 3, custom_id: `txn_confirm_final`, emoji: { name: '✅' } },
                                    { type: 2, label: '❌ No, Cancel', style: 4, custom_id: 'txn_cancel', emoji: { name: '❌' } },
                                    { type: 2, label: '⭐ View Reviews', style: 5, url: `${REVIEWS_URL}/reviews/${encodeURIComponent(cleanOther)}` }
                                ]
                            }
                        ]
                    });
                } catch (err: any) {
                    await interaction.editReply(`❌ User **${cleanOther}** not found. Please ensure the Safetag is correct.`);
                }
            } else if (customId === 'deletion_feedback_modal') {
                await interaction.deferReply({ ephemeral: true });
                const reason = interaction.fields.getTextInputValue('reason') || 'No feedback provided';
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;

                    await axios.post(`${API_URL}/profiles/${encodeURIComponent(safetag)}/deactivate`, { reason });

                    await interaction.editReply({
                        content: '✅ **Account Deleted Successfully**\n\nYour personal data has been removed. Thank you for using Safeeely.',
                        components: []
                    });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.response?.data?.error || err.message}`);
                }
            }
        }
    } catch (err: any) {
        console.error('❌ Interaction Error:', err.message);
        if (interaction.isRepliable()) {
            try {
                if (interaction.replied || interaction.deferred) await interaction.followUp({ content: `❌ Error: ${err.message}`, ephemeral: true });
                else await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
            } catch (e) { }
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('❌ Failed to login to Discord:', err.message);
});

// ⚓ Dummy HTTP Server to satisfy Render "Web Service" port check
import http from 'http';
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Safeeely Discord Bot is Healthy\n');
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Discord Bot Health-Check server is listening on port ${PORT}`);
});
