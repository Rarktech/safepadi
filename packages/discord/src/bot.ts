import { Client, GatewayIntentBits, Partials, Collection, InteractionReplyOptions, MessageFlags } from 'discord.js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { buildMagicLink, fetchBotBalance } from './utils/magicLink';
import path from 'path';
import http from 'http';
import * as Sentry from '@sentry/node';
import { processSmartTransaction, SmartTransactionDraft, getCommentPrompt, pickRandom, FEEDBACK_SUCCESS_MESSAGES } from '@safepal/shared';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
});

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const REVIEWS_URL = process.env.REVIEWS_URL || 'http://localhost:3001';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const BOT_AUTH_HEADERS = process.env.BOT_API_SECRET
    ? { 'Authorization': `Bearer ${process.env.BOT_API_SECRET}`, 'x-bot-platform': 'discord' }
    : {};

console.log(`🤖 Bot Startup Configuration:`);
console.log(`📡 API_URL: ${API_URL}`);
console.log(`🔗 REVIEWS_URL: ${REVIEWS_URL}`);
console.log(`🔑 Bot token: ${BOT_TOKEN ? '[SET]' : 'MISSING'}`);

// 🚀 NETWORK RATE-LIMIT FIX (Per Audit: "Too Many Axios Calls")
// This interceptor automatically caches Safetag profile lookups so that clicking buttons 
// doesn't cause 2-3 duplicate API calls to the internal server, preventing internal 429s.
const profileCache = new Collection<string, { data: any, expires: number }>();
const AWAITING_REQUESTS = new Map<string, Promise<any>>();

axios.interceptors.request.use(async (config) => {
    if (config.method === 'get' && config.url?.includes('/profiles/by_platform/discord/')) {
        const cached = profileCache.get(config.url);
        if (cached && cached.expires > Date.now()) {
            config.adapter = async () => ({
                data: cached.data,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: config,
                request: {}
            } as any);
        }
    }
    return config;
});

axios.interceptors.response.use((response) => {
    if (response.config.method === 'get' && response.config.url?.includes('/profiles/by_platform/discord/')) {
        profileCache.set(response.config.url, { 
            data: response.data, 
            expires: Date.now() + 5 * 60 * 1000 // Cache safetag mappings for 5 minutes
        });
    }
    return response;
});

// 🚀 Network Diagnostics Removed to prevent "Silent 429" triggers on Render startup.

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

// ⚓ Dummy HTTP Server to satisfy Render "Web Service" port check
// MUST start immediately (not inside Discord 'ready' event) so Render doesn't kill it during slow rate-limited boots!
const port = process.env.PORT || 3002;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Safeeely Discord Bot is Healthy\n');
}).listen(port, () => {
    console.log(`🌐 Health-Check server is listening on port ${port}`);
});

client.on('shardReady', (id) => {
    console.log(`🛰️ Shard ${id} is Ready.`);
});

client.on('error', (error) => {
    console.error('❌ [Discord Error]:', (error as any).message || error);
});

client.on('shardError', (error) => {
    console.error('❌ [Discord Shard Error]:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

const reviewStates = new Collection<string, { txnId: string, stars?: number, proofUrl?: string, role?: string }>();
const pendingDisputeData = new Map<string, { txnId: string; category: string }>();
const AWAITING_REVIEW_REMARK = new Collection<string, boolean>();
const feedbackStates = new Collection<string, { source: string; refId?: string; rating?: number; safetag?: string }>();
const AWAITING_FEEDBACK_COMMENT = new Collection<string, boolean>();
const smartTxnSessions = new Collection<string, SmartTransactionDraft>();
const regDrafts = new Collection<string, { firstName: string, lastName: string, email: string, safetag: string, referralCode: string }>();
const txnDrafts = new Collection<string, {
    role: string,
    product: string,
    desc: string,
    currency?: string,
    amount?: string,
    other?: string,
    fee_allocation?: string,
    transaction_type?: 'ONE_TIME' | 'MILESTONE',
    milestones?: { title: string, amount: number }[],
    creatorTag?: string,
    incomingGroupId?: string,
}>();

// Community bot — per-guild cooldown and incoming group session tracking
const guildTradeCooldown = new Map<string, number>();
const GUILD_TRADE_COOLDOWN_MS = 5 * 60 * 1000;
const incomingGuildIds = new Collection<string, { communityId: string; expires: number }>();
const communityWithdrawSessions = new Collection<string, { groupId: string; currency: string }>();

const formatMessageForDiscord = (text: string): string => {
    if (!text) return text;
    return text
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<i>(.*?)<\/i>/gi, '_$1_')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/gi, '[$2]($1)');
};

const sendMainMenu = async (messageOrInteraction: any) => {
    const userId: string | undefined = messageOrInteraction.author?.id || messageOrInteraction.user?.id;
    const rawContent = '🏠 **Main Menu**\n\nWhat would you like to do today?';
    const content = formatMessageForDiscord(rawContent);
    const components: any[] = [
        {
            type: 1,
            components: [
                { type: 2, label: '🛒 Create Transaction', style: 1, custom_id: 'create_txn' },
                { type: 2, label: '📋 My Transactions', style: 2, custom_id: 'my_txns' },
            ],
        },
        {
            type: 1,
            components: [
                { type: 2, label: '💰 Balance & Withdrawals', style: 2, custom_id: 'balance' },
                { type: 2, label: '🎁 Referral', style: 2, custom_id: 'referral' },
            ],
        },
        {
            type: 1,
            components: [
                { type: 2, label: '⭐ Reviews & Ratings', style: 2, custom_id: 'reviews' },
                { type: 2, label: '⚙️ Settings & Account', style: 2, custom_id: 'settings' },
            ],
        },
    ];

    if (userId) {
        try {
            const communityRes = await axios.get(`${API_URL}/communities/by_admin_platform/discord/${userId}`);
            const groupCount: number = communityRes.data?.communities?.length || 0;
            if (groupCount > 0) {
                const label = groupCount === 1 ? '📊 My Server' : `📊 My Servers (${groupCount})`;
                components.push({ type: 1, components: [{ type: 2, label, style: 2, custom_id: 'my_group_dashboard' }] });
            }
        } catch { /* no community button on error */ }
    }

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

// Respond to !deal / !trade / @mention in a licensed Discord server
async function handleGuildTradeRequest(message: any) {
    const guildId: string = message.guildId;
    const now = Date.now();
    const last = guildTradeCooldown.get(guildId);
    if (last && now - last < GUILD_TRADE_COOLDOWN_MS) return;
    guildTradeCooldown.set(guildId, now);

    try {
        const communityRes = await axios.get(`${API_URL}/communities/by_discord/${guildId}`);
        const group = communityRes.data?.group;
        if (group && group.status === 'active') {
            return message.reply({
                content: `🛡️ **Start a Secure Trade**\n\nThis server uses Safeeely escrow. Click below to open a private transaction — your payment is held safely until delivery is confirmed.`,
                components: [{
                    type: 1,
                    components: [{ type: 2, label: '🛡️ Start Secure Trade', style: 3, custom_id: `start_group_trade_${group.id}` }],
                }],
            });
        }
    } catch { /* guild not licensed — fall through */ }

    return message.reply({
        content: `⚡ **Secure payments aren't set up here yet.**\n\nServer admin: activate Safeeely in 2 minutes and earn a commission on every deal.`,
        components: [{
            type: 1,
            components: [{ type: 2, label: '⚡ Set Up Server Payments', style: 1, custom_id: `setup_server_${guildId}` }],
        }],
    });
}

// When bot is added to a Discord server — post setup prompt
client.on('guildCreate', async (guild) => {
    const channels = [
        guild.systemChannel,
        guild.publicUpdatesChannel,
        (guild.channels.cache.find((c: any) => c.type === 0) as any),
    ].filter(Boolean);

    for (const channel of channels) {
        try {
            await (channel as any).send({
                content: `👋 Hi! I'm **Safeeely** — secure escrow for your buy/sell server.\n\nTo activate Safeeely payments for **${guild.name}**, the admin who added me should click below and complete a quick setup.`,
                components: [{
                    type: 1,
                    components: [{ type: 2, label: '⚡ Set Up Server Payments', style: 1, custom_id: `setup_server_${guild.id}` }],
                }],
            });
            break;
        } catch { continue; }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Guild channel: only respond to !deal, !trade, or @mention — ignore everything else
    if (message.guild) {
        const text = message.content.toLowerCase();
        if (text.startsWith('!deal') || text.startsWith('!trade') || message.mentions.has(client.user!)) {
            await handleGuildTradeRequest(message);
        }
        return;
    }

    console.log(`💬 Discord msg from ${message.author.tag}: ${message.content}`);

    // Fallback: catch users who type their 6-digit email verification code as a plain message
    const pendingRegDraft = regDrafts.get(message.author.id);
    if (pendingRegDraft && /^\d{6}$/.test(message.content.trim())) {
        try {
            await axios.post(`${API_URL}/auth/email-otp/verify`, { email: pendingRegDraft.email, code: message.content.trim() });
            const payload: any = { safetag: pendingRegDraft.safetag, email: pendingRegDraft.email, first_name: pendingRegDraft.firstName, last_name: pendingRegDraft.lastName, primary_platform: 'discord', platform_id: message.author.id };
            if (pendingRegDraft.referralCode) payload.referral_code = pendingRegDraft.referralCode;
            await axios.post(`${API_URL}/profiles/register`, payload);
            regDrafts.delete(message.author.id);
            await message.reply(`🎉 **Registration Complete!**\n\n✅ You're all set!\n\nYour Safetag: **${pendingRegDraft.safetag}**\n📧 Email: ${pendingRegDraft.email}\n\n🔐 Your account is secure and ready to use`);
            await sendMainMenu(message);
        } catch (err: any) {
            await message.reply(`❌ ${err.response?.data?.error || 'Invalid code. Please try again or click Resend Code.'}`);
        }
        return;
    }

    // Handle Attachments (Proof Images vs AI Voice Notes)
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first()!;
        const isImage = attachment.contentType?.startsWith('image/') || attachment.name.toLowerCase().endsWith('.png') || attachment.name.toLowerCase().endsWith('.jpg') || attachment.name.toLowerCase().endsWith('.jpeg');
        const isAudio = attachment.contentType?.startsWith('audio/') || attachment.name.toLowerCase().endsWith('.ogg') || attachment.name.toLowerCase().endsWith('.mp3') || attachment.name.toLowerCase().includes('voice-message');

        try {
            const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${message.author.id}`);
            const mySafetag = profileRes.data.safetag;

            // 🎙️ VOICE AI: If it's audio, process as Smart Transaction
            if (isAudio) {
                await message.reply("🎙️ **Processing your voice request...**");
                try {
                    const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                    const audioBuffer = Buffer.from(response.data);
                    const mimeType = attachment.contentType || 'audio/ogg';

                    const existingDraft = smartTxnSessions.get(message.author.id);
                    const aiResult = await processSmartTransaction('', audioBuffer, mimeType, existingDraft);
                    
                    smartTxnSessions.set(message.author.id, aiResult.draft);

                    if (aiResult.is_complete) {
                        const draft = aiResult.draft;
                        const desc = draft.description ? `\n📝 **Description:** ${draft.description}` : '';
                        
                        let milestoneText = '';
                        if (draft.transaction_type === 'MILESTONE' && draft.milestones) {
                            milestoneText = `\n\n🪜 **Milestones:**\n` + draft.milestones.map((m, i) => `   ${i+1}. ${m.title} (${m.amount} ${draft.currency})`).join('\n');
                        }

                        const draftText = `✨ **Smart Transaction Draft**\n\nPlease review your transaction details:\n\n🛒 **Product:** ${draft.product_name}${desc}\n📦 **Type:** ${draft.transaction_type}\n👤 **Counterparty:** ${draft.counterparty_safetag}\n💰 **Total Amount:** ${draft.amount} ${draft.currency}\n💵 **Fee Allocation:** ${draft.fee_allocation}\n💠 **Your Role:** ${draft.role}${milestoneText}\n\nDoes this look correct? You can reply to edit or click confirm below.`;
                        
                        if (message.guild) {
                            try {
                                await message.author.send({
                                    content: draftText,
                                    components: [{
                                        type: 1,
                                        components: [
                                            { type: 2, label: '✅ Confirm & Proceed', style: 3, custom_id: 'smart_txn_confirm' },
                                            { type: 2, label: '❌ Cancel', style: 4, custom_id: 'smart_txn_cancel' }
                                        ]
                                    }]
                                });
                                await message.reply("✨ **Draft Created!** I've sent the details to your DMs for privacy. Please check them to confirm.");
                            } catch (dmErr) {
                                await message.reply("⚠️ **I couldn't DM you.** Please enable DMs from server members so I can send you the private draft.");
                            }
                        } else {
                            await message.reply({
                                content: draftText,
                                components: [{
                                    type: 1,
                                    components: [
                                        { type: 2, label: '✅ Confirm & Proceed', style: 3, custom_id: 'smart_txn_confirm' },
                                        { type: 2, label: '❌ Cancel', style: 4, custom_id: 'smart_txn_cancel' }
                                    ]
                                }]
                            });
                        }
                    } else {
                        await message.reply(aiResult.follow_up_question || "Please provide the missing details.");
                    }
                } catch (e: any) {
                    console.error('Smart Txn Error:', e.message);
                    await message.reply("❌ Sorry, I had trouble processing that voice note. Please try again.");
                }
                return;
            }

            // 🖼️ IMAGE PROOF: If it's an image, check if awaiting proof
            if (isImage) {
                // Check if user is in review flow and awaiting proof
                const reviewState = reviewStates.get(message.author.id);
                if (reviewState && reviewState.stars && !reviewState.proofUrl) {
                    reviewState.proofUrl = attachment.url;
                    await message.reply('✅ **Proof Attached!** Now, please provide a brief remark/comment for your review:');
                    AWAITING_REVIEW_REMARK.set(message.author.id, true);
                    return;
                }

                const txnsRes = await axios.get(`${API_URL}/transactions`, {
                    params: { seller_safetag: mySafetag, status: 'AWAITING_PROOF' }
                });

                if (txnsRes.data && txnsRes.data.length > 0) {
                    const txn = txnsRes.data[0];
                    await axios.post(`${API_URL}/transactions/${txn.id}/upload-proof`, {
                        proof_url: attachment.url,
                        file_name: attachment.name || 'Discord Upload',
                        file_size: attachment.size || 0,
                    });
                    await message.reply(`✅ **Proof Uploaded** for transaction **${txn.txn_code}**!`);
                    return;
                }
            }
        } catch (err: any) {
            console.error('Discord Attachment Error:', err.message);
        }
    }

    // Handle Text AI Processing (if not a command)
    if (!message.content.startsWith('!') && !AWAITING_REVIEW_REMARK.has(message.author.id)) {
        const existingDraft = smartTxnSessions.get(message.author.id);
        // Only process as AI if it looks like a transaction intent or there's an ongoing session
        if (existingDraft || message.content.split(' ').length > 3) {
            try {
                const aiResult = await processSmartTransaction(message.content, undefined, undefined, existingDraft);
                smartTxnSessions.set(message.author.id, aiResult.draft);

                if (aiResult.is_complete) {
                    const draft = aiResult.draft;
                    const desc = draft.description ? `\n📝 **Description:** ${draft.description}` : '';
                    
                    let milestoneText = '';
                    if (draft.transaction_type === 'MILESTONE' && draft.milestones) {
                        milestoneText = `\n\n🪜 **Milestones:**\n` + draft.milestones.map((m, i) => `   ${i+1}. ${m.title} (${m.amount} ${draft.currency})`).join('\n');
                    }

                    const draftText = `✨ **Smart Transaction Draft**\n\nPlease review your transaction details:\n\n🛒 **Product:** ${draft.product_name}${desc}\n📦 **Type:** ${draft.transaction_type}\n👤 **Counterparty:** ${draft.counterparty_safetag}\n💰 **Total Amount:** ${draft.amount} ${draft.currency}\n💵 **Fee Allocation:** ${draft.fee_allocation}\n💠 **Your Role:** ${draft.role}${milestoneText}\n\nDoes this look correct? You can reply to edit or click confirm below.`;
                    
                    if (message.guild) {
                        try {
                            await message.author.send({
                                content: draftText,
                                components: [{
                                    type: 1,
                                    components: [
                                        { type: 2, label: '✅ Confirm & Proceed', style: 3, custom_id: 'smart_txn_confirm' },
                                        { type: 2, label: '❌ Cancel', style: 4, custom_id: 'smart_txn_cancel' }
                                    ]
                                }]
                            });
                            await message.reply("✨ **Draft Created!** I've sent the details to your DMs for privacy. Please check them to confirm.");
                        } catch (dmErr) {
                            await message.reply("⚠️ **I couldn't DM you.** Please enable DMs from server members so I can send you the private draft.");
                        }
                    } else {
                        await message.reply({
                            content: draftText,
                            components: [{
                                type: 1,
                                components: [
                                    { type: 2, label: '✅ Confirm & Proceed', style: 3, custom_id: 'smart_txn_confirm' },
                                    { type: 2, label: '❌ Cancel', style: 4, custom_id: 'smart_txn_cancel' }
                                ]
                            }]
                        });
                    }
                } else if (existingDraft || aiResult.follow_up_question) {
                     // Only reply if there was an actual follow-up or session
                     await message.reply(aiResult.follow_up_question || "Please provide more details.");
                }
            } catch (e) {
                console.error('Text AI Error:', e);
            }
            return;
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
                                { type: 2, label: '🛒 Create Transaction', style: 1, custom_id: 'create_txn' },
                                { type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu_back' }
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

    // Handle Feedback Comments
    if (AWAITING_FEEDBACK_COMMENT.has(message.author.id)) {
        const fbState = feedbackStates.get(message.author.id);
        if (fbState && fbState.rating) {
            try {
                await axios.post(`${API_URL}/feedback`, {
                    reviewer_safetag: fbState.safetag,
                    rating: fbState.rating,
                    comment: message.content,
                    source: fbState.source || 'menu',
                    source_ref_id: fbState.refId || undefined,
                    platform: 'discord',
                });
                const successMsg = pickRandom(FEEDBACK_SUCCESS_MESSAGES);
                await message.reply({
                    content: `✅ **feedback received!**\n\n${successMsg}`,
                    components: [{ type: 1, components: [{ type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }] }]
                });
            } catch (err: any) {
                await message.reply('something went wrong on our end 😅 try again later?');
            }
            feedbackStates.delete(message.author.id);
            AWAITING_FEEDBACK_COMMENT.delete(message.author.id);
            return;
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
                if (response.data.is_deactivated) {
                    await message.reply('⚠️ Your Safeeely account has been deactivated. Please contact support@safeeely.com if you believe this is a mistake.');
                    return;
                }
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
                console.error(`❌ API Error in messageCreate (${API_URL}):`, {
                    message: err.message,
                    code: err.code,
                    status: err.response?.status,
                    data: err.response?.data
                });
                message.reply(`❌ An error occurred while connecting to Safeeely services. (Error: ${err.message})`);
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
                    const res = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: act, updater_safetag: profileRes.data.safetag }, { headers: BOT_AUTH_HEADERS });
                    const dat = res.data;

                    const payload: any = {
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
                    };

                    if (dat.follow_up_receipt_url) {
                        try {
                            const internalApiBase = (process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3000/api').replace('/api', '');
                            const fetchUrl = dat.follow_up_receipt_url.replace(/.*(?=\/api\/receipts)/, internalApiBase);
                            const imgRes = await axios.get(fetchUrl, { responseType: 'arraybuffer', timeout: 15000 });
                            payload.files = [{ attachment: Buffer.from(imgRes.data), name: 'receipt.png' }];
                        } catch (imgErr: any) {
                            console.error('Failed to attach receipt to Discord action:', imgErr.message);
                        }
                    }

                    await interaction.editReply({ components: [] });
                    await interaction.followUp(payload);
                    return; // ⚡ Correct: Handled
                } catch (err: any) {
                    console.error('Action processing failed:', err.message);
                    await interaction.followUp({ content: `❌ Action failed: ${err.response?.data?.error || err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
                    return;
                }
            }

            if (customId.startsWith('txn_pay_')) {
                const txnId = customId.replace('txn_pay_', '');
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await interaction.editReply({
                    content: '💳 **Ready to Pay**\n\nClick the button below to complete your secure payment on Safeeely.',
                    components: [{ type: 1, components: [{ type: 2, label: '💳 Pay Now', style: 5, url: `${REVIEWS_URL}/pay/${txnId}` }] }]
                });
                return;
            }

            if (customId.startsWith('view_txn_details|')) {
                const txnId = customId.split('|')[1];
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const myTag = profileRes.data.safetag;
                    const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                    const t = res.data;
                    const otherTag = t.buyer.safetag === myTag ? t.seller.safetag : t.buyer.safetag;

                    let milestoneInfo = '';
                    const mButtons: any[] = [];
                    if (t.transaction_type === 'MILESTONE' && t.milestones?.length > 0) {
                        milestoneInfo = '\n\n🪜 **Milestone Progress:**\n';
                        t.milestones.sort((a: any, b: any) => a.index_num - b.index_num).forEach((m: any) => {
                            const statusEmoji = m.status === 'RELEASED' ? '✅' : (m.status === 'COMPLETED' ? '📦' : '⏳');
                            milestoneInfo += `${statusEmoji} ${m.title}: **${m.amount} ${t.currency}** (${m.status})\n`;
                            if (m.status === 'PENDING' && myTag === t.seller.safetag && t.status === 'PAID') {
                                mButtons.push({ type: 2, label: `📦 Complete "${m.title.slice(0,20)}"`, style: 1, custom_id: `m_status|${t.id}|${m.id}|COMPLETED` });
                            } else if (m.status === 'COMPLETED' && myTag === t.buyer.safetag) {
                                mButtons.push({ type: 2, label: `💸 Release "${m.title.slice(0,20)}"`, style: 3, custom_id: `m_status|${t.id}|${m.id}|RELEASED` });
                            }
                        });
                    }

                    const msg = `📋 **Transaction Details**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: **${t.txn_code}**\n📦 Type: **${t.transaction_type}**\n🛒 Product: **${t.product_name}**\n📝 Desc: ${t.description || 'N/A'}\n💰 Total: **${t.amount} ${t.currency}**\n💵 Fee: **${(t.fee_amount || 0).toFixed(2)} ${t.currency}** (${t.fee_allocation})\n💳 Escrow: **${(t.total_amount || 0).toFixed(2)} ${t.currency}**\n👤 Buyer: \`${t.buyer.safetag}\`\n👤 Seller: \`${t.seller.safetag}\`\n💠 Status: **${t.status.replace(/_/g, ' ')}**${milestoneInfo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                    const components: any[] = [];
                    if (mButtons.length > 0) {
                        for (let i = 0; i < mButtons.length; i += 5) components.push({ type: 1, components: mButtons.slice(i, i + 5) });
                    }
                    const navButtons: any[] = [
                        { type: 2, label: '🔙 Back', style: 2, custom_id: 'my_txns' },
                        { type: 2, label: '⭐ Reviews', style: 5, url: `${REVIEWS_URL}/reviews/${encodeURIComponent(otherTag)}` }
                    ];
                    const isOngoing = ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status);
                    if (isOngoing) navButtons.push({ type: 2, label: '🚀 Action', style: 1, custom_id: `txn_resume|${t.id}` });
                    components.push({ type: 1, components: navButtons });
                    await interaction.editReply({ content: msg, components });
                } catch (err: any) { await interaction.editReply({ content: `❌ Error: ${err.message}` }); }
                return;
            }

            if (customId.startsWith('m_status|')) {
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                const parts = customId.split('|');
                const txnId = parts[1];
                const mId = parts[2];
                const status = parts[3];

                try {
                    await axios.patch(`${API_URL}/transactions/${txnId}/milestones/${mId}/status`, { status, updater_safetag: (await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`)).data.safetag }, { headers: BOT_AUTH_HEADERS });
                    
                    // Refresh view
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const myTag = profileRes.data.safetag;
                    const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                    const t = res.data;

                    let milestoneInfo = '\n\n🪜 **Milestone Progress:**\n';
                    const mButtons: any[] = [];
                    t.milestones.sort((a: any, b: any) => a.index_num - b.index_num).forEach((m: any) => {
                        const statusEmoji = m.status === 'RELEASED' ? '✅' : (m.status === 'COMPLETED' ? '📦' : '⏳');
                        milestoneInfo += `${statusEmoji} ${m.title}: **${m.amount} ${t.currency}** (${m.status})\n`;
                        if (m.status === 'PENDING' && myTag === t.seller.safetag && t.status === 'PAID') {
                            mButtons.push({ type: 2, label: `📦 Complete "${m.title.slice(0,20)}"`, style: 1, custom_id: `m_status|${t.id}|${m.id}|COMPLETED` });
                        } else if (m.status === 'COMPLETED' && myTag === t.buyer.safetag) {
                            mButtons.push({ type: 2, label: `💸 Release "${m.title.slice(0,20)}"`, style: 3, custom_id: `m_status|${t.id}|${m.id}|RELEASED` });
                        }
                    });

                    const msg = `📋 **Transaction Details**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: **${t.txn_code}**\n📦 Type: **${t.transaction_type}**\n🛒 Product: **${t.product_name}**\n💠 Status: **${t.status.replace(/_/g, ' ')}**${milestoneInfo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                    const components: any[] = [];
                    if (mButtons.length > 0) components.push({ type: 1, components: mButtons.slice(0, 5) });
                    components.push({ type: 1, components: [{ type: 2, label: '🔙 Back', style: 2, custom_id: 'my_txns' }] });

                    await interaction.editReply({ content: msg, components });
                    return;
                } catch (err: any) {
                    console.error('Milestone Update Error:', err.message);
                    await interaction.followUp({ content: '❌ Failed to update milestone.', flags: MessageFlags.Ephemeral }).catch(() => {});
                    return;
                }
            }

            if (customId.startsWith('txn_refund_initiate|')) {
                const txnId = customId.split('|')[1];
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await interaction.editReply({
                    content: '💸 **Refund Buyer — Select a Reason**\n\nWhy are you cancelling this transaction?\n\nThe buyer will receive a **full refund**. Your seller cancellation count will increase.',
                    components: [{
                        type: 1,
                        components: [
                            { type: 2, label: '📦 Out of stock',      style: 2, custom_id: `txn_refund_reason|${txnId}|out_of_stock` },
                            { type: 2, label: '🚫 Cannot fulfil',     style: 2, custom_id: `txn_refund_reason|${txnId}|cannot_fulfil` },
                            { type: 2, label: '🤝 Mutual cancel',     style: 2, custom_id: `txn_refund_reason|${txnId}|mutual_cancel` },
                        ]
                    }]
                });
                return;
            }

            if (customId.startsWith('txn_refund_reason|')) {
                const parts = customId.split('|');
                const txnId = parts[1];
                const reason = parts[2];
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                    const txn = res.data;
                    const reasonLabels: Record<string, string> = {
                        out_of_stock: 'Item no longer available / out of stock',
                        cannot_fulfil: 'Unable to fulfil this order',
                        mutual_cancel: 'Mutually agreed to cancel with buyer',
                    };
                    await interaction.editReply({
                        content: `⚠️ **Confirm Cancellation**\n\nYou are about to return **${txn.amount} ${txn.currency}** to **${txn.buyer?.safetag}**.\n\nReason: ${reasonLabels[reason] || reason}\n\nThis will cancel the transaction and **cannot be undone**. Your seller cancellation count will increase.`,
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: '✅ Yes, Refund Buyer', style: 4, custom_id: `txn_refund_confirm|${txnId}|${reason}` },
                                { type: 2, label: '❌ Cancel',            style: 2, custom_id: 'my_txns' },
                            ]
                        }]
                    });
                } catch (err: any) {
                    await interaction.editReply({ content: `❌ Could not load transaction: ${err.message}` });
                }
                return;
            }

            if (customId.startsWith('txn_refund_confirm|')) {
                const parts = customId.split('|');
                const txnId = parts[1];
                const reason = parts[2];
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    await axios.patch(
                        `${API_URL}/transactions/${txnId}/status`,
                        { status: 'seller_cancel', updater_safetag: profileRes.data.safetag, cancellation_reason: reason },
                        { headers: BOT_AUTH_HEADERS }
                    );
                    await interaction.followUp({
                        content: '✅ **Cancellation Confirmed**\n\nA full refund has been issued to the buyer. The transaction has been cancelled.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (err: any) {
                    const msg = err.response?.data?.error || err.message;
                    await interaction.followUp({ content: `❌ Refund failed: ${msg}`, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
                return;
            }

            if (interaction.replied || interaction.deferred) return;

            if (customId.startsWith('start_registration')) {
                const referralCode = customId.split('|')[1] || '';
                const agreeId = referralCode ? `accept_policy|${referralCode}` : 'accept_policy';
                await interaction.reply({
                    content: '📜 **Safeeely Privacy Policy**\n\nBefore we begin, please review and agree to our Privacy Policy to protect your data.',
                    components: [{ type: 1, components: [{ type: 2, label: '📜 Read Policy', style: 5, url: `${REVIEWS_URL}/privacy` }, { type: 2, label: '✅ I Agree', style: 3, custom_id: agreeId }] }],
                    flags: MessageFlags.Ephemeral
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
                    flags: MessageFlags.Ephemeral
                });
            } else if (customId.startsWith('txn_role|')) {
                const role = customId.split('|')[1];
                await interaction.reply({
                    content: `📦 **Project Type: ${role.toUpperCase()}**\n\nChoose the type of transaction:`,
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '⚡ One-Time Payment', style: 1, custom_id: `txn_type|${role}|ONE_TIME` },
                                { type: 2, label: '🪜 Milestone-Based Project', style: 2, custom_id: `txn_type|${role}|MILESTONE` }
                            ]
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                });
            } else if (customId.startsWith('txn_type|')) {
                const [_, role, type] = customId.split('|');
                // @ts-ignore
                await interaction.showModal({
                    title: `📦 ${role.toUpperCase()} - Product Details`,
                    custom_id: `txn_modal_step1|${role}|${type}`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'product_name', label: 'What is the Product/Service?', style: 1, placeholder: 'e.g. Instagram Account @handle', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'description', label: 'Detailed Description', style: 2, placeholder: 'Include specs, condition, or special requirements...', required: true }] }
                    ]
                });
            } else if (customId.startsWith('txn_curr_select|')) {
                const currency = customId.split('|')[1];
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost. Please start over.', flags: MessageFlags.Ephemeral });
                draft.currency = currency;

                if (draft.transaction_type === 'MILESTONE') {
                    await interaction.reply({
                        content: `🪜 **Milestone Setup**\n\nCurrency: **${currency}**\n\nNo phases added yet. Please add your first milestone phase:`,
                        components: [{
                            type: 1,
                            components: [{ type: 2, label: '➕ Add Milestone Phase', style: 1, custom_id: 'txn_milestone_add' }]
                        }],
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    // @ts-ignore
                    await interaction.showModal({
                        title: '💰 Transaction Amount',
                        custom_id: `txn_modal_amount`,
                        components: [
                            { type: 1, components: [{ type: 4, custom_id: 'amount', label: `Amount in ${currency}`, style: 1, placeholder: 'Enter numbers only, e.g. 5000', required: true }] }
                        ]
                    });
                }
            } else if (customId === 'txn_milestone_add') {
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost.', flags: MessageFlags.Ephemeral });
                // @ts-ignore
                await interaction.showModal({
                    title: '🪜 Add Milestone Phase',
                    custom_id: 'txn_modal_milestone',
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'title', label: 'Phase Title', style: 1, placeholder: 'e.g. Initial Deposit', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'amount', label: `Amount in ${draft.currency}`, style: 1, placeholder: 'e.g. 1000', required: true }] }
                    ]
                });
            } else if (customId === 'txn_milestone_finish') {
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost.', flags: MessageFlags.Ephemeral });
                const amount = parseFloat(draft.amount || '0');
                const fee = amount * 0.05;

                await interaction.reply({
                    content: `💵 **Fee Allocation**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nWho pays the **5% transaction fee**?\n\n💰 Total Amount: **${amount} ${draft.currency}**\n💵 Total Fee: **${fee.toFixed(2)} ${draft.currency}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '👤 Buyer (Pays 100%)', style: 2, custom_id: 'txn_fee_select|buyer' },
                                { type: 2, label: '💰 Seller (Pays 100%)', style: 2, custom_id: 'txn_fee_select|seller' },
                                { type: 2, label: '🤝 Split (50/50)', style: 2, custom_id: 'txn_fee_select|split' }
                            ]
                        }
                    ],
                    flags: MessageFlags.Ephemeral
                });
            } else if (customId.startsWith('txn_fee_select|')) {
                const fee_allocation = customId.split('|')[1];
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost. Please start over.', flags: MessageFlags.Ephemeral });
                draft.fee_allocation = fee_allocation;

                // @ts-ignore
                await interaction.showModal({
                    title: '👤 Counterparty Details',
                    custom_id: `txn_modal_other`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'other_party', label: 'Other Party Safetag', style: 1, placeholder: 'e.g. @john_doe', required: true }] }
                    ]
                });
            } else if (customId === 'txn_profile_confirm') {
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost.', flags: MessageFlags.Ephemeral });
                
                const amount = parseFloat(draft.amount || '0');
                const feeAllocation = draft.fee_allocation || 'buyer';
                const fee = amount * 0.05;
                const total = feeAllocation === 'buyer' ? amount + fee : (feeAllocation === 'split' ? amount + (fee / 2) : amount);

                let mList = '';
                if (draft.transaction_type === 'MILESTONE' && draft.milestones) {
                    mList = '\n📍 **Milestones:**\n' + draft.milestones.map((m, i) => `   ${i+1}. ${m.title} - ${m.amount} ${draft.currency}`).join('\n');
                }

                const summary = `📋 **Transaction Summary**\n\nPlease review your transaction details:\n\n` +
                    `🛒 Product/Service: **${draft.product}**\n` +
                    `📝 Description: **${draft.desc || 'No description'}**${mList}\n` +
                    `💰 Amount: **${amount} ${draft.currency}**\n` +
                    `💵 Fee: **${fee.toFixed(2)} ${draft.currency} (${feeAllocation})**\n` +
                    `💳 Total: **${total.toFixed(2)} ${draft.currency}**\n` +
                    `👤 ${draft.role === 'buyer' ? 'Seller' : 'Buyer'}: \`${draft.other}\``;

                await interaction.update({
                    content: summary,
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: '1️⃣ ✅ Confirm', style: 3, custom_id: `txn_confirm_final` },
                                { type: 2, label: '2️⃣ ❌ Cancel', style: 4, custom_id: 'txn_cancel' },
                                { type: 2, label: '3️⃣ ✏️ Edit', style: 2, custom_id: 'txn_profile_back' }
                            ]
                        }
                    ]
                });
            } else if (customId === 'txn_profile_back') {
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.reply({ content: '❌ Transaction state lost.', flags: MessageFlags.Ephemeral });
                
                // Show modal again to change safetag
                // @ts-ignore
                await interaction.showModal({
                    title: '👤 Counterparty Details',
                    custom_id: `txn_modal_other`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'other_party', label: 'Other Party Safetag', style: 1, placeholder: 'e.g. @john_doe', required: true }] }
                    ]
                });
            } else if (customId === 'txn_confirm_final') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply('❌ Draft missing.');
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    draft.creatorTag = profileRes.data.safetag;

                    const isSeller = draft.role === 'seller';
                    const cpLabel = isSeller ? `Buyer: \`${draft.other}\`` : `Seller: \`${draft.other}\``;
                    const invoiceMsg = isSeller
                        ? `📄 **Smart Invoice**\n\nWant to send your buyer a professional invoice?\n\nA branded invoice PDF will be emailed to your buyer with the full transaction details:\n  📦 **Item:** ${draft.product}\n  💰 **Amount:** ${draft.amount} ${draft.currency}\n  👤 **${cpLabel}**\n\n*It includes a Pay with Safeeely button so they can settle directly from their inbox.*`
                        : `📄 **Smart Invoice**\n\nWould you like an invoice for this transaction?\n\nA professional invoice from your seller will be emailed straight to you with full details:\n  📦 **Item:** ${draft.product}\n  💰 **Amount:** ${draft.amount} ${draft.currency}\n  🏪 **${cpLabel}**\n\n*Perfect for your records or expense tracking.*`;

                    const yesLabel = isSeller ? '📧 Yes, Send Invoice' : '📧 Yes, Email Me an Invoice';
                    await interaction.editReply({
                        content: invoiceMsg,
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: yesLabel, style: 3, custom_id: 'txn_invoice_yes' },
                                { type: 2, label: '❌ No, Skip', style: 2, custom_id: 'txn_invoice_no' }
                            ]
                        }]
                    });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.response?.data?.error || err.message}`);
                }
            } else if (customId === 'txn_invoice_yes' || customId === 'txn_invoice_no') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply('❌ Draft missing.');
                const sendInvoice = customId === 'txn_invoice_yes';
                const creatorTag = draft.creatorTag;
                try {
                    const res = await axios.post(`${API_URL}/transactions/create`, {
                        buyer_safetag: draft.role === 'buyer' ? creatorTag : draft.other,
                        seller_safetag: draft.role === 'seller' ? creatorTag : draft.other,
                        product_name: draft.product,
                        description: draft.desc,
                        amount: parseFloat(draft.amount || '0'),
                        currency: draft.currency,
                        fee_allocation: draft.fee_allocation?.toLowerCase(),
                        initiator_safetag: creatorTag,
                        transaction_type: draft.transaction_type,
                        milestones: draft.milestones,
                        send_invoice: sendInvoice,
                        ...(draft.incomingGroupId ? { group_id: draft.incomingGroupId } : {}),
                    });
                    txnDrafts.delete(interaction.user.id);
                    if (draft.incomingGroupId) incomingGuildIds.delete(interaction.user.id);

                    const roleLabel = draft.role === 'buyer' ? 'seller' : 'buyer';
                    const finalMsg = `✅ **Transaction Created!**\n\n` +
                        `Your transaction has been created and sent to the ${roleLabel}.\n\n` +
                        `📋 **Transaction ID: ${res.data.txn_code}**\n` +
                        `👤 **${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}: ${draft.other}**\n` +
                        `💰 **Amount: ${draft.amount} ${draft.currency}**\n\n` +
                        `📬 **You'll be notified when:**\n` +
                        `• ${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)} accepts your request\n` +
                        `• Payment is required\n` +
                        `• Delivery is confirmed\n\n` +
                        `⏳ **Current Status: Awaiting ${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)} Acceptance**` +
                        (sendInvoice ? '\n\n📧 **Invoice emailed to buyer!**' : '');

                    await interaction.editReply({
                        content: finalMsg,
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: '1️⃣ 👁️ View Transaction', style: 1, custom_id: `view_txn_details|${res.data.id}` },
                                { type: 2, label: '2️⃣ 🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }]
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
                    flags: MessageFlags.Ephemeral
                });
            } else if (customId.startsWith('setup_server_')) {
                const guildId = customId.replace('setup_server_', '');
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const existingRes = await axios.get(`${API_URL}/communities/by_discord/${guildId}`).catch(() => null);
                if (existingRes?.data?.group) {
                    return interaction.editReply('✅ This server is already licensed on Safeeely!');
                }
                const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`).catch(() => null);
                if (!profileRes?.data?.safetag) {
                    return interaction.editReply('👋 You need a Safeeely account first. Type `!start` in DMs to register.');
                }
                if (profileRes.data.is_deactivated) {
                    return interaction.editReply('⚠️ Your account is deactivated. Contact support@safeeely.com.');
                }
                const guild = client.guilds.cache.get(guildId);
                const guildName = guild?.name || 'Your Server';
                return interaction.editReply({
                    content: `🏘️ **License ${guildName}**\n\nChoose your tier:\n\n🟢 **Free** — 10% of every platform fee\n🔵 **Pro** — 25% of every platform fee (₦15,000/month)\n🟡 **Enterprise** — 40% of every platform fee (₦35,000/month)`,
                    components: [{
                        type: 1,
                        components: [
                            { type: 2, label: '🟢 Free', style: 2, custom_id: `register_server_${guildId}_free` },
                            { type: 2, label: '🔵 Pro', style: 1, custom_id: `register_server_${guildId}_pro` },
                            { type: 2, label: '🟡 Enterprise', style: 3, custom_id: `register_server_${guildId}_enterprise` },
                        ],
                    }],
                });

            } else if (customId.startsWith('register_server_')) {
                const parts = customId.split('_');
                const tier = parts[parts.length - 1];
                const guildId = parts.slice(2, -1).join('_');
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const guild = client.guilds.cache.get(guildId);
                    const guildName = guild?.name || 'Your Server';
                    // Resolve announcement channel before registering so it can be persisted
                    const announceCandidates = [guild?.systemChannel, guild?.publicUpdatesChannel, guild?.channels.cache.find((c: any) => c.type === 0)].filter(Boolean) as any[];
                    const announceCh = announceCandidates[0] || null;
                    const regRes = await axios.post(`${API_URL}/communities/register`, {
                        discord_guild_id: guildId,
                        group_name: guildName,
                        admin_discord_id: interaction.user.id,
                        license_tier: tier,
                        ...(announceCh ? { discord_announcement_channel_id: announceCh.id } : {}),
                    });
                    const group = regRes.data.group;
                    // Announce in server
                    if (announceCh) {
                        try { await announceCh.send(`✅ **Safeeely is now active in ${guildName}!**\n\nUse \`!deal\` or \`!trade\` to start a secure escrow transaction.`); } catch { /* ignore */ }
                    }
                    await interaction.editReply(`🎉 **${guildName} is now licensed!**\n\nTier: **${tier.charAt(0).toUpperCase() + tier.slice(1)}**\n💰 You'll earn **${group.admin_revenue_share_percent}%** of every platform fee from deals here.\n\nView your dashboard from the main menu → 📊 My Server.`);
                } catch (err: any) {
                    await interaction.editReply(`❌ Registration failed: ${err.response?.data?.error || err.message}`);
                }

            } else if (customId.startsWith('start_group_trade_')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const communityId = customId.replace('start_group_trade_', '');
                incomingGuildIds.set(interaction.user.id, { communityId, expires: Date.now() + 30 * 60 * 1000 });
                try {
                    await interaction.user.send({
                        content: `🛡️ **Starting a Secure Trade**\n\nThis trade will be recorded under the server's Safeeely program.\n\nClick below to open the transaction form:`,
                        components: [{ type: 1, components: [{ type: 2, label: '🛒 Create Transaction', style: 1, custom_id: 'create_txn' }] }],
                    });
                    await interaction.editReply({ content: '✅ Check your DMs to start the transaction!' });
                } catch {
                    await interaction.editReply({ content: '⚠️ I couldn\'t DM you. Please enable DMs from server members and try again.' });
                }

            } else if (customId === 'my_group_dashboard') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const communityRes = await axios.get(`${API_URL}/communities/by_admin_platform/discord/${interaction.user.id}`);
                    const { communities } = communityRes.data;
                    if (!communities || communities.length === 0) {
                        return interaction.editReply('ℹ️ You don\'t have any active licensed servers yet.');
                    }
                    if (communities.length === 1) {
                        const analyticsRes = await axios.get(`${API_URL}/communities/${communities[0].id}/analytics?period=30d`);
                        const { group, funnel, summary } = analyticsRes.data;
                        const earnings = summary?.earnings ?? [];
                        const withdrawable = summary?.withdrawable ?? [];
                        const earningsLine = earnings.length ? earnings.map((e: any) => `  • **${e.total.toLocaleString()} ${e.currency}**`).join('\n') : '  • None yet';
                        const withdrawLine = withdrawable.length ? withdrawable.map((w: any) => `  • **${w.available.toLocaleString()} ${w.currency}**`).join('\n') : '  • None available';
                        const tierEmoji: Record<string, string> = { free: '🟢', pro: '🔵', enterprise: '🟡' };
                        const disputeLine = funnel?.disputedDeals ? `  • Disputed: **${funnel.disputedDeals}**\n` : '';
                        let expiryLine1 = '';
                        if (group.license_tier !== 'free' && group.license_expires_at) {
                            const expiryDate = new Date(group.license_expires_at);
                            const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
                            const expiryStr = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            expiryLine1 = daysLeft <= 0
                                ? `\n⚠️ License: **EXPIRED** — renew to restore earnings`
                                : daysLeft <= 7
                                    ? `\n🚨 Expires: **${expiryStr}** (${daysLeft} day${daysLeft === 1 ? '' : 's'} left!)`
                                    : `\n📅 Expires: **${expiryStr}**`;
                        }
                        const msg = `📊 **Server Dashboard**\n\n🏘️ **${group.group_name}**\n${tierEmoji[group.license_tier] || '🟢'} Tier: **${group.license_tier.charAt(0).toUpperCase() + group.license_tier.slice(1)}**\n💰 Revenue Share: **${group.admin_revenue_share_percent}%**${expiryLine1}\n\n📈 **Activity**\n  • Total Deals: **${funnel?.totalDeals ?? 0}**\n  • Completed: **${funnel?.completedDeals ?? 0}**\n  • Completion Rate: **${funnel?.completionRate ?? 0}%**\n${disputeLine}\n💵 **Your Earnings:**\n${earningsLine}\n\n💸 **Withdrawable:**\n${withdrawLine}`;
                        const analyticsUrl = `${process.env.REVIEWS_URL || 'http://localhost:3001'}/community/${group.id}/analytics`;
                        const btns: any[] = [];
                        if (withdrawable.length) btns.push({ type: 2, label: '💸 Withdraw Earnings', style: 3, custom_id: `withdraw_community_${group.id}` });
                        btns.push({ type: 2, label: '📊 Full Analytics', style: 5, url: analyticsUrl });
                        if (group.license_tier !== 'free') {
                            try {
                                const renewRes = await axios.post(`${API_URL}/communities/${group.id}/renew/initiate`);
                                btns.push({ type: 2, label: '🔄 Renew License', style: 5, url: renewRes.data.payment_url });
                            } catch { /* skip if initiation fails */ }
                        }
                        if (group.license_tier !== 'enterprise') btns.push({ type: 2, label: '🚀 Upgrade License', style: 1, custom_id: `upgrade_tier_${group.id}` });
                        btns.push({ type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' });
                        const rows: any[] = [];
                        for (let i = 0; i < btns.length; i += 5) rows.push({ type: 1, components: btns.slice(i, i + 5) });
                        return interaction.editReply({ content: msg, components: rows });
                    }
                    // Multiple servers: show list
                    const btns = communities.map((g: any) => ({ type: 2, label: `🏘️ ${g.group_name.slice(0, 30)}  ·  ${g.license_tier}`, style: 2, custom_id: `view_group_stats_${g.id}` }));
                    const rows: any[] = [];
                    for (let i = 0; i < btns.length; i += 5) rows.push({ type: 1, components: btns.slice(i, i + 5) });
                    rows.push({ type: 1, components: [{ type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }] });
                    return interaction.editReply({ content: `📊 **My Servers**\n\nYou manage **${communities.length}** licensed servers. Select one:`, components: rows });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.message}`);
                }

            } else if (customId.startsWith('view_group_stats_')) {
                const groupId = customId.replace('view_group_stats_', '');
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const analyticsRes = await axios.get(`${API_URL}/communities/${groupId}/analytics?period=30d`);
                    const { group, funnel, summary } = analyticsRes.data;
                    const earnings = summary?.earnings ?? [];
                    const withdrawable = summary?.withdrawable ?? [];
                    const earningsLine = earnings.length ? earnings.map((e: any) => `  • **${e.total.toLocaleString()} ${e.currency}**`).join('\n') : '  • None yet';
                    const withdrawLine = withdrawable.length ? withdrawable.map((w: any) => `  • **${w.available.toLocaleString()} ${w.currency}**`).join('\n') : '  • None available';
                    const tierEmoji: Record<string, string> = { free: '🟢', pro: '🔵', enterprise: '🟡' };
                    const disputeLine = funnel?.disputedDeals ? `  • Disputed: **${funnel.disputedDeals}**\n` : '';
                    let expiryLine2 = '';
                    if (group.license_tier !== 'free' && group.license_expires_at) {
                        const expiryDate = new Date(group.license_expires_at);
                        const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
                        const expiryStr = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        expiryLine2 = daysLeft <= 0
                            ? `\n⚠️ License: **EXPIRED** — renew to restore earnings`
                            : daysLeft <= 7
                                ? `\n🚨 Expires: **${expiryStr}** (${daysLeft} day${daysLeft === 1 ? '' : 's'} left!)`
                                : `\n📅 Expires: **${expiryStr}**`;
                    }
                    const msg = `📊 **Server Dashboard**\n\n🏘️ **${group.group_name}**\n${tierEmoji[group.license_tier] || '🟢'} Tier: **${group.license_tier.charAt(0).toUpperCase() + group.license_tier.slice(1)}**\n💰 Revenue Share: **${group.admin_revenue_share_percent}%**${expiryLine2}\n\n📈 **Activity**\n  • Total Deals: **${funnel?.totalDeals ?? 0}**\n  • Completed: **${funnel?.completedDeals ?? 0}**\n  • Completion Rate: **${funnel?.completionRate ?? 0}%**\n${disputeLine}\n💵 **Your Earnings:**\n${earningsLine}\n\n💸 **Withdrawable:**\n${withdrawLine}`;
                    const analyticsUrl = `${process.env.REVIEWS_URL || 'http://localhost:3001'}/community/${groupId}/analytics`;
                    const btns: any[] = [];
                    if (withdrawable.length) btns.push({ type: 2, label: '💸 Withdraw Earnings', style: 3, custom_id: `withdraw_community_${group.id}` });
                    btns.push({ type: 2, label: '📊 Full Analytics', style: 5, url: analyticsUrl });
                    if (group.license_tier !== 'free') {
                        try {
                            const renewRes = await axios.post(`${API_URL}/communities/${group.id}/renew/initiate`);
                            btns.push({ type: 2, label: '🔄 Renew License', style: 5, url: renewRes.data.payment_url });
                        } catch { /* skip if initiation fails */ }
                    }
                    if (group.license_tier !== 'enterprise') btns.push({ type: 2, label: '🚀 Upgrade License', style: 1, custom_id: `upgrade_tier_${group.id}` });
                    btns.push({ type: 2, label: '🔙 My Servers', style: 2, custom_id: 'my_group_dashboard' });
                    const rows: any[] = [];
                    for (let i = 0; i < btns.length; i += 5) rows.push({ type: 1, components: btns.slice(i, i + 5) });
                    return interaction.editReply({ content: msg, components: rows });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.message}`);
                }

            } else if (customId.startsWith('upgrade_tier_')) {
                const groupId = customId.replace('upgrade_tier_', '');
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const statsRes = await axios.get(`${API_URL}/communities/${groupId}/stats`);
                    const { group } = statsRes.data;
                    const currentTier: string = group.license_tier;
                    const msg = `🚀 **Upgrade Your License**\n\nServer: **${group.group_name}**\nCurrent tier: **${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}**\n\n🔵 **Pro** — ₦15,000/month\n  • 25% revenue share on every platform fee\n\n🟡 **Enterprise** — ₦35,000/month\n  • 40% revenue share on every platform fee`;
                    const btns: any[] = [];
                    if (currentTier === 'free') btns.push({ type: 2, label: '🔵 Pro — ₦15,000/mo', style: 1, custom_id: `confirm_upgrade_${groupId}_pro` });
                    btns.push({ type: 2, label: '🟡 Enterprise — ₦35,000/mo', style: 3, custom_id: `confirm_upgrade_${groupId}_enterprise` });
                    btns.push({ type: 2, label: '🔙 Back', style: 2, custom_id: `view_group_stats_${groupId}` });
                    return interaction.editReply({ content: msg, components: [{ type: 1, components: btns }] });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.message}`);
                }

            } else if (customId.startsWith('confirm_upgrade_')) {
                const parts = customId.split('_');
                const tier = parts[parts.length - 1];
                const groupId = parts.slice(2, -1).join('_');
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const upgradeRes = await axios.post(`${API_URL}/communities/${groupId}/upgrade/initiate`, { target_tier: tier });
                    const { payment_url } = upgradeRes.data;
                    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
                    const tierLabels: Record<string, string> = { pro: 'Pro — ₦15,000', enterprise: 'Enterprise — ₦35,000' };
                    return interaction.editReply({
                        content: `💳 **Complete Your Upgrade**\n\nPlan: **${tierLabels[tier]}/month**\n\nClick the button below to pay securely. Your tier upgrades automatically once payment is confirmed.`,
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: `💳 Pay for ${tierName} Now`, style: 5, url: payment_url },
                            ],
                        }],
                    });
                } catch (err: any) {
                    await interaction.editReply(`❌ Could not generate payment link: ${err.response?.data?.error || err.message}`);
                }

            } else if (customId.startsWith('withdraw_community_')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const groupId = customId.replace('withdraw_community_', '');
                try {
                    const statsRes = await axios.get(`${API_URL}/communities/${groupId}/stats`);
                    const { withdrawable } = statsRes.data;
                    if (!withdrawable?.length) return interaction.editReply('ℹ️ No withdrawable balance at this time.');
                    const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
                    const fmtAmt = (a: number, c: string) => `${sym[c] || ''}${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
                    if (withdrawable.length === 1) {
                        communityWithdrawSessions.set(interaction.user.id, { groupId, currency: withdrawable[0].currency });
                        return interaction.editReply({
                            content: `💸 **Withdraw Earnings**\n\nAvailable: **${fmtAmt(withdrawable[0].available, withdrawable[0].currency)}**\n\nClick below to enter your bank details:`,
                            components: [{ type: 1, components: [{ type: 2, label: '🏦 Enter Bank Details', style: 1, custom_id: `cwd_modal_${groupId}_${withdrawable[0].currency}` }] }],
                        });
                    }
                    // Multiple currencies — show picker
                    const btns = withdrawable.map((w: any) => ({ type: 2, label: `${w.currency} — ${fmtAmt(w.available, w.currency)}`, style: 2, custom_id: `cwd_pick_${groupId}_${w.currency}` }));
                    return interaction.editReply({ content: '💸 **Withdraw Earnings**\n\nSelect the currency to withdraw:', components: [{ type: 1, components: btns }] });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.message}`);
                }

            } else if (customId.startsWith('cwd_pick_')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const parts = customId.split('_');
                const currency = parts[parts.length - 1];
                const groupId = parts.slice(2, -1).join('_');
                communityWithdrawSessions.set(interaction.user.id, { groupId, currency });
                return interaction.editReply({
                    content: `Currency selected: **${currency}**\n\nClick below to enter your bank details:`,
                    components: [{ type: 1, components: [{ type: 2, label: '🏦 Enter Bank Details', style: 1, custom_id: `cwd_modal_${groupId}_${currency}` }] }],
                });

            } else if (customId.startsWith('cwd_modal_')) {
                // Direct button response — can showModal()
                const parts = customId.split('_');
                const currency = parts[parts.length - 1];
                const groupId = parts.slice(2, -1).join('_');
                communityWithdrawSessions.set(interaction.user.id, { groupId, currency });
                await interaction.showModal({
                    custom_id: 'cwd_submit',
                    title: `Withdraw ${currency} Earnings`,
                    components: [
                        { type: 1, components: [{ type: 4, custom_id: 'amount', label: 'Amount', style: 1, placeholder: '0.00', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'bank_name', label: 'Bank Name', style: 1, placeholder: 'e.g. GTBank', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'account_number', label: 'Account Number', style: 1, placeholder: '10-digit account number', required: true }] },
                        { type: 1, components: [{ type: 4, custom_id: 'account_name', label: 'Account Name', style: 1, placeholder: 'As on your bank account', required: true }] },
                    ],
                });

            } else if (customId === 'main_menu' || customId === 'main_menu_back') {
                await sendMainMenu(interaction);
            } else if (customId.startsWith('view_txns_category|')) {
                const category = customId.split('|')[1];
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const statusRes = await axios.patch(`${API_URL}/transactions/${txnId}/status`, { status: 'resume', updater_safetag: profileRes.data.safetag }, { headers: BOT_AUTH_HEADERS });
                    const dat = statusRes.data;
                    await interaction.editReply({
                        content: formatMessageForDiscord(dat.follow_up_msg),
                        components: dat.follow_up_options ? [{ type: 1, components: dat.follow_up_options.map((o: any) => ({ type: 2, label: o.label, style: o.url ? 5 : 2, ...(o.url ? { url: o.url } : { custom_id: o.customId }) })) }] : []
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId.startsWith('txn_dispute_')) {
                const tid = customId.replace('txn_dispute_', '');
                await interaction.reply({
                    flags: MessageFlags.Ephemeral,
                    content: '⚠️ **Raise Dispute — Step 1 of 2**\n\nSelect the category that best describes your issue:',
                    components: [{
                        type: 1,
                        components: [{
                            type: 3,
                            custom_id: `dispute_cat_select|${tid}`,
                            placeholder: 'Choose a dispute category...',
                            options: [
                                { label: 'Not Delivered', value: 'NOT_DELIVERED', description: 'Item/service was never delivered', emoji: { name: '📦' } },
                                { label: 'Not As Described', value: 'NOT_AS_DESCRIBED', description: 'Item differs from the listing', emoji: { name: '🔍' } },
                                { label: 'Credentials / Access Issue', value: 'CREDENTIALS_ACCESS', description: 'Account or credentials don\'t work', emoji: { name: '🔑' } },
                                { label: 'Service Incomplete', value: 'SERVICE_INCOMPLETE', description: 'Work was partial or stopped', emoji: { name: '🔧' } },
                                { label: 'Payment Issue', value: 'PAYMENT_ISSUE', description: 'Funds not released or payment problem', emoji: { name: '💳' } },
                                { label: 'Other', value: 'OTHER', description: 'Doesn\'t fit the categories above', emoji: { name: '❓' } }
                            ]
                        }]
                    }]
                });
            } else if (customId === 'balance') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;

                    // Generate magic link FIRST — independent of balance fetch
                    const withdrawUrl = await buildMagicLink({ platform_id: interaction.user.id, scope: 'withdraw', fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}` });

                    // Attempt balance fetch via bot-authenticated endpoint
                    let msg = '💰 **Balance & Withdrawals**\n\n';
                    try {
                        const balData = await fetchBotBalance({ platform_id: interaction.user.id });
                        if (balData === null) {
                            msg += 'Tap below to view your full balance breakdown.';
                        } else if (!balData.balances?.length) {
                            msg += 'You have no available balance yet. Complete transactions to earn!';
                        } else {
                            balData.balances.forEach((b: any) => {
                                const emoji = b.currency === 'NGN' ? '🇳🇬' : (b.currency === 'USD' ? '🇺🇸' : '🪙');
                                msg += `${emoji} **${b.amount.toLocaleString()} ${b.currency}**\n`;
                            });
                            msg += '\n_Balances are from your completed (finalized) sales._';
                        }
                    } catch {
                        msg += 'Tap below to view your full balance breakdown.';
                    }

                    await interaction.editReply({
                        content: msg,
                        components: [{
                            type: 1, components: [
                                { type: 2, label: '💸 Withdraw Funds', style: 5, url: withdrawUrl },
                                { type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'referral') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    const sRes = await axios.get(`${API_URL}/referrals/${safetag}/stats`);
                    const stats = sRes.data;

                    const cleanSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                    const referralLink = `${REVIEWS_URL}/${cleanSafetag}`;

                    const fmtAmt = (amount: number, currency: string) => {
                        const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
                        return sym[currency]
                            ? `${sym[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : `${parseFloat(amount.toFixed(8))} ${currency}`;
                    };
                    const earningsLines = stats.earningsByCurrency?.length
                        ? stats.earningsByCurrency.map((e: any) => `  • **${fmtAmt(e.totalEarned, e.currency)}**`).join('\n')
                        : '  • None yet';

                    const msg = `🎁 **My Referrals**\n\nInvite friends and earn up to **1.5% commision for life on all secured purchases**!\n\n🔗 **Your Invite Link:**\n\`${referralLink}\`\n\n📊 **Statistics:**\n👥 Tier 1 Referrals: **${stats.tier1Count}**\n👥 Tier 2 Referrals: **${stats.tier2Count}**\n💰 **Commissions Earned:**\n${earningsLines}`;

                    const referralWithdrawUrl = (await buildMagicLink({ platform_id: interaction.user.id, scope: 'withdraw', fallbackUrl: `${REVIEWS_URL}/withdraw/${encodeURIComponent(safetag)}` })) + '#referrals';
                    const components = [{
                        type: 1, components: [
                            { type: 2, label: '💸 Withdraw Earnings', style: 5, url: referralWithdrawUrl },
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
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    const [sRes, bRes] = await Promise.all([
                        axios.get(`${API_URL}/reviews/stats/${safetag}`),
                        axios.get(`${API_URL}/profiles/${safetag}/badges`)
                    ]);
                    
                    const { average_rating, review_count } = sRes.data;
                    const badges = bRes.data;

                    const rating = average_rating || 0;
                    const starsInt = Math.round(rating);
                    const stars = '⭐'.repeat(starsInt) + '☆'.repeat(5 - starsInt);

                    let badgeList = '';
                    if (badges && badges.length > 0) {
                        badgeList = '\n🏆 **Badges:** ' + badges.map((b: any) => `${b.emoji} ${b.label}`).join(' | ');
                    }

                    const msg = `⭐ **Reviews & Ratings**\n\nYou have a trust score of **${rating.toFixed(1)}/5 ${stars}** (based on **${review_count}** reviews).${badgeList}\n\nYou can view your full review history on our external platform.`;

                    const reviewsUrl = await buildMagicLink({ platform_id: interaction.user.id, scope: 'reviews', fallbackUrl: `${REVIEWS_URL}/reviews/${encodeURIComponent(safetag)}` });
                    await interaction.editReply({
                        content: msg,
                        components: [{
                            type: 1, components: [
                                { type: 2, label: '👌 View Reviews', style: 5, url: reviewsUrl },
                                { type: 2, label: '🔙 Main Menu', style: 2, custom_id: 'main_menu' }
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId.startsWith('leave_review_')) {
                const txnId = customId.replace('leave_review_', '');
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                reviewStates.set(interaction.user.id, { txnId });
                await interaction.editReply({
                    content: '⭐ **Leave a Review**\n\nHow would you rate this transaction? Select your star rating:',
                    components: [{
                        type: 1,
                        components: [
                            { type: 2, label: '⭐ 1', style: 2, custom_id: 'review_star_1' },
                            { type: 2, label: '⭐⭐ 2', style: 2, custom_id: 'review_star_2' },
                            { type: 2, label: '⭐⭐⭐ 3', style: 2, custom_id: 'review_star_3' },
                            { type: 2, label: '⭐⭐⭐⭐ 4', style: 2, custom_id: 'review_star_4' },
                            { type: 2, label: '⭐⭐⭐⭐⭐ 5', style: 3, custom_id: 'review_star_5' }
                        ]
                    }]
                });
            } else if (customId.startsWith('review_star_')) {
                const stars = parseInt(customId.replace('review_star_', ''), 10);
                const reviewState = reviewStates.get(interaction.user.id);
                if (!reviewState) {
                    await interaction.reply({ content: '❌ Review session expired. Please click **Leave Review Now** again.', flags: MessageFlags.Ephemeral });
                    return;
                }
                reviewState.stars = stars;
                AWAITING_REVIEW_REMARK.set(interaction.user.id, true);
                await interaction.deferUpdate();
                await interaction.editReply({
                    content: `✅ **${stars} star${stars > 1 ? 's' : ''} selected!**\n\nOptionally, send a screenshot/image as proof, then type your review comment in this chat.`,
                    components: []
                });
            } else if (customId === 'send_feedback' || customId.startsWith('pf_rate_menu|')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    let source = 'menu';
                    let refId: string | undefined;
                    if (customId.startsWith('pf_rate_menu|')) {
                        const parts = customId.split('|');
                        source = parts[1];
                        refId = parts[2];
                    }
                    feedbackStates.set(interaction.user.id, { source, refId, safetag });
                    await interaction.editReply({
                        content: '✨ **Rate Safeeely**\n\nhow many stars would you give us? tap below 👇',
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: '⭐ 1', style: 2, custom_id: 'fb_star_1' },
                                { type: 2, label: '⭐ 2', style: 2, custom_id: 'fb_star_2' },
                                { type: 2, label: '⭐ 3', style: 2, custom_id: 'fb_star_3' },
                                { type: 2, label: '⭐ 4', style: 2, custom_id: 'fb_star_4' },
                                { type: 2, label: '⭐ 5', style: 1, custom_id: 'fb_star_5' },
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId.startsWith('fb_star_')) {
                const rating = parseInt(customId.split('_')[2]);
                const fbState = feedbackStates.get(interaction.user.id);
                if (fbState) {
                    fbState.rating = rating;
                    feedbackStates.set(interaction.user.id, fbState);
                    AWAITING_FEEDBACK_COMMENT.set(interaction.user.id, true);
                }
                const commentPrompt = getCommentPrompt(rating);
                await interaction.update({
                    content: `${'⭐'.repeat(rating)} **${rating}/5**\n\n${commentPrompt}\n\n_type your comment in chat, or tap Skip_`,
                    components: [{
                        type: 1,
                        components: [{ type: 2, label: '⏭️ Skip', style: 2, custom_id: 'fb_skip_comment' }]
                    }]
                });
            } else if (customId === 'fb_skip_comment') {
                const fbState = feedbackStates.get(interaction.user.id);
                if (fbState && fbState.rating) {
                    try {
                        await axios.post(`${API_URL}/feedback`, {
                            reviewer_safetag: fbState.safetag,
                            rating: fbState.rating,
                            source: fbState.source || 'menu',
                            source_ref_id: fbState.refId || undefined,
                            platform: 'discord',
                        });
                        const successMsg = pickRandom(FEEDBACK_SUCCESS_MESSAGES);
                        await interaction.update({
                            content: `✅ **feedback received!**\n\n${successMsg}`,
                            components: [{ type: 1, components: [{ type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }] }]
                        });
                    } catch { await interaction.update({ content: 'something went wrong 😅 try again later?', components: [] }); }
                    feedbackStates.delete(interaction.user.id);
                    AWAITING_FEEDBACK_COMMENT.delete(interaction.user.id);
                }
            } else if (customId === 'settings') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
                        components: [
                            {
                                type: 1,
                                components: [
                                    { type: 2, label: '❌ Delete Account', style: 4, custom_id: 'start_deletion' },
                                    { type: 2, label: '⚙️ Other Settings', style: 2, custom_id: 'other_settings' },
                                ]
                            },
                            {
                                type: 1,
                                components: [
                                    { type: 2, label: '💭 Send Feedback', style: 2, custom_id: 'send_feedback' },
                                    { type: 2, label: '🏠 Main Menu', style: 2, custom_id: 'main_menu' }
                                ]
                            }
                        ]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'other_settings') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const p = profileRes.data;
                    const kycUrl = await buildMagicLink({ platform_id: interaction.user.id, scope: 'kyc', fallbackUrl: `${REVIEWS_URL}/kyc` });
                    await interaction.editReply({
                        content: '⚙️ **Other Settings**\n\nManage linked accounts and identity verification:',
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: '🔗 Linked Accounts', style: 2, custom_id: 'linked_accounts' },
                                { type: 2, label: '🛡️ KYC Verification ↗️', style: 5, url: kycUrl },
                                { type: 2, label: '🔙 Back', style: 2, custom_id: 'settings' }
                            ]
                        }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.message}`); }
            } else if (customId === 'linked_accounts') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const safetag = profileRes.data.safetag;
                    const linkedRes = await axios.get(`${API_URL}/profiles/${encodeURIComponent(safetag)}/linked-accounts`);
                    const linked: any[] = linkedRes.data;
                    const list = linked.length
                        ? linked.map((l: any) => `• ${l.platform}${l.is_primary ? ' ⭐ (primary)' : ''}`).join('\n')
                        : 'No linked accounts found.';
                    await interaction.editReply({
                        content: `🔗 **Linked Accounts**\n\n${list}`,
                        components: [{ type: 1, components: [{ type: 2, label: '🔙 Back', style: 2, custom_id: 'other_settings' }] }]
                    });
                } catch (err: any) {
                    await interaction.editReply({
                        content: '❌ Could not load linked accounts.',
                        components: [{ type: 1, components: [{ type: 2, label: '🔙 Back', style: 2, custom_id: 'other_settings' }] }]
                    });
                }
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
                    flags: MessageFlags.Ephemeral
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
            if (customId.startsWith('dispute_cat_select|')) {
                const txnId = customId.split('|')[1];
                const category = interaction.values[0];
                pendingDisputeData.set(interaction.user.id, { txnId, category });
                // @ts-ignore
                await interaction.showModal({
                    title: '⚠️ Dispute — Describe the Issue',
                    custom_id: `dispute_modal_${txnId}`,
                    components: [{
                        type: 1,
                        components: [{
                            type: 4,
                            custom_id: 'reason',
                            label: 'Reason (Step 2 of 2)',
                            style: 2,
                            min_length: 10,
                            required: true,
                            placeholder: 'Describe the issue in detail...'
                        }]
                    }]
                });
            } else if (customId === 'view_txn_select') {
                const txnId = interaction.values[0].replace('view_txn_select_val|', '');
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    const myTag = profileRes.data.safetag;
                    const res = await axios.get(`${API_URL}/transactions/${txnId}`);
                    const t = res.data;

                    const otherTag = t.buyer.safetag === myTag ? t.seller.safetag : t.buyer.safetag;

                    let milestoneInfo = '';
                    const mButtons: any[] = [];

                    if (t.transaction_type === 'MILESTONE' && t.milestones && t.milestones.length > 0) {
                        milestoneInfo = '\n\n🪜 **Milestone Progress:**\n';
                        t.milestones.sort((a: any, b: any) => a.index_num - b.index_num).forEach((m: any, idx: number) => {
                            const statusEmoji = m.status === 'RELEASED' ? '✅' : (m.status === 'COMPLETED' ? '📦' : '⏳');
                            milestoneInfo += `${statusEmoji} ${m.title}: **${m.amount} ${t.currency}** (${m.status})\n`;
                            
                            // Milestone actions
                            if (m.status === 'PENDING' && myTag === t.seller.safetag && t.status === 'PAID') {
                                mButtons.push({ type: 2, label: `📦 Complete "${m.title.slice(0,20)}"`, style: 1, custom_id: `m_status|${t.id}|${m.id}|COMPLETED` });
                            } else if (m.status === 'COMPLETED' && myTag === t.buyer.safetag) {
                                mButtons.push({ type: 2, label: `💸 Release "${m.title.slice(0,20)}"`, style: 3, custom_id: `m_status|${t.id}|${m.id}|RELEASED` });
                            }
                        });
                    }

                    const msg = `📋 **Transaction Details**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ID: **${t.txn_code}**\n📦 Type: **${t.transaction_type}**\n🛒 Product: **${t.product_name}**\n📝 Desc: ${t.description || 'N/A'}\n💰 Total: **${t.amount} ${t.currency}**\n💵 Fee: **${t.fee_amount.toFixed(2)} ${t.currency}** (${t.fee_allocation})\n💳 Escrow: **${t.total_amount.toFixed(2)} ${t.currency}**\n👤 Buyer: \`${t.buyer.safetag}\`\n👤 Seller: \`${t.seller.safetag}\`\n💠 Status: **${t.status.replace(/_/g, ' ')}**${milestoneInfo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                    const components: any[] = [];
                    
                    // Add milestone actions first
                    if (mButtons.length > 0) {
                        for (let i = 0; i < mButtons.length; i += 5) {
                            components.push({ type: 1, components: mButtons.slice(i, i + 5) });
                        }
                    }

                    const navButtons: any[] = [
                        { type: 2, label: '🔙 Back', style: 2, custom_id: 'my_txns' },
                        { type: 2, label: '⭐ Counterparty Reviews', style: 5, url: `${REVIEWS_URL}/reviews/${encodeURIComponent(otherTag)}` }
                    ];

                    const isOngoing = ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status);
                    if (isOngoing && t.transaction_type === 'ONE_TIME') {
                        navButtons.push({ type: 2, label: '🚀 Action', style: 1, custom_id: `txn_resume|${t.id}` });
                    } else if (t.status === 'PENDING_SELLER_ACCEPTANCE' || t.status === 'ACCEPTED') {
                        navButtons.push({ type: 2, label: '🚀 Action', style: 1, custom_id: `txn_resume|${t.id}` });
                    }

                    components.push({ type: 1, components: navButtons });

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
            } else if (customId === 'smart_txn_confirm') {
                console.log(`✅ Processing smart_txn_confirm for ${interaction.user.tag}`);
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const draft = smartTxnSessions.get(interaction.user.id);
                if (!draft) return interaction.editReply("❌ AI Session expired.");
                smartTxnSessions.delete(interaction.user.id);
                
                const rawOther = (draft as any).counterparty_safetag || '';
                const otherSafetag = rawOther.startsWith('@') ? rawOther : `@${rawOther}`;

                // Convert AI draft to manual draft format to reuse final logic
                const incomingEntry = incomingGuildIds.get(interaction.user.id);
                txnDrafts.set(interaction.user.id, {
                    role: draft.role!,
                    product: draft.product_name!,
                    desc: draft.description || '',
                    amount: draft.amount?.toString(),
                    currency: draft.currency,
                    other: otherSafetag,
                    fee_allocation: draft.fee_allocation,
                    transaction_type: draft.transaction_type as any,
                    milestones: draft.milestones,
                    incomingGroupId: (incomingEntry && incomingEntry.expires > Date.now()) ? incomingEntry.communityId : undefined,
                });
                try {
                    const statsRes = await axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(otherSafetag)}`);
                    const { average_rating, review_count } = statsRes.data;

                    const amount = parseFloat(String(draft.amount ?? 0));
                    const fee = amount * 0.05;
                    const total = draft.fee_allocation === 'buyer' ? amount + fee : (draft.fee_allocation === 'split' ? amount + (fee / 2) : amount);

                    let mList = '';
                    if (draft.transaction_type === 'MILESTONE' && draft.milestones) {
                        mList = '\n📍 **Milestones:**\n' + draft.milestones.map((m, i) => `   ${i+1}. ${m.title} - ${m.amount} ${draft.currency}`).join('\n');
                    }

                    const summary = `✨ **AI Draft Summary**\n\nPlease review your transaction details:\n\n` +
                        `📦 Type: **${draft.transaction_type || 'ONE_TIME'}**\n` +
                        `🛒 Product/Service: **${draft.product_name}**\n` +
                        `📝 Description: **${draft.description || 'No description'}**${mList}\n` +
                        `💰 Amount: **${amount} ${draft.currency}**\n` +
                        `💵 Fee: **${fee.toFixed(2)} ${draft.currency} (${draft.fee_allocation})**\n` +
                        `💳 Total: **${total.toFixed(2)} ${draft.currency}**\n` +
                        `👤 ${draft.role === 'buyer' ? 'Seller' : 'Buyer'}: \`${otherSafetag}\`\n` +
                        `⭐ ${draft.role === 'buyer' ? 'Seller' : 'Buyer'} Rating: **${(average_rating || 0).toFixed(1)}/5** (${review_count} reviews)\n\n` +
                        `Proceed with creating this transaction?`;
                    
                    await interaction.editReply({
                        content: summary,
                        components: [{
                            type: 1,
                            components: [
                                { type: 2, label: '✅ Create Transaction', style: 3, custom_id: 'txn_confirm_final' },
                                { type: 2, label: '❌ Cancel', style: 4, custom_id: 'txn_cancel' }
                            ]
                        }]
                    });
                } catch (e) {
                    console.error('Smart Txn Confirm Error:', e);
                    await interaction.editReply(`❌ Counterparty **${otherSafetag}** not found.`);
                }
            } else if (customId === 'smart_txn_cancel') {
                console.log(`❌ Processing smart_txn_cancel for ${interaction.user.tag}`);
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                smartTxnSessions.delete(interaction.user.id);
                if (!interaction.deferred && !interaction.replied) await interaction.update({ content: '❌ AI Draft Cancelled.', components: [] });
                else await interaction.editReply({ content: '❌ AI Draft Cancelled.', components: [] });
            } else if (customId.startsWith('verify_otp_btn|')) {
                const safetag = customId.split('|')[1];
                // @ts-ignore
                await interaction.showModal({
                    title: '🔐 Enter OTP',
                    custom_id: `otp_verify_modal|${safetag}`,
                    components: [{ type: 1, components: [{ type: 4, custom_id: 'otp_code', label: 'Enter your 6-digit OTP', style: 1, placeholder: '123456', required: true, min_length: 6, max_length: 6 }] }]
                });
            } else if (customId.startsWith('resend_login_otp|')) {
                const safetag = customId.split('|')[1];
                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
                try {
                    await axios.post(`${API_URL}/auth/otp/send`, { safetag, platform: 'discord', platform_id: interaction.user.id });
                    await interaction.editReply({
                        content: `✅ New OTP sent to your linked accounts.\n\n🔐 Enter it to link this Discord account:`,
                        components: [{ type: 1, components: [{ type: 2, label: '🔢 Enter OTP', style: 1, custom_id: `verify_otp_btn|${safetag}` }, { type: 2, label: '🔄 Resend OTP', style: 2, custom_id: `resend_login_otp|${safetag}` }] }]
                    });
                } catch (err: any) {
                    await interaction.editReply(`❌ Error: ${err.response?.data?.error || 'Failed to resend.'}`);
                }
            } else if (customId === 'verify_reg_email_btn') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await interaction.editReply({ content: '📧 **Type your 6-digit code directly in this channel** and I\'ll complete your registration automatically.\n\n_(Example: type `123456` in the chat)_', components: [] });
            } else if (customId === 'resend_reg_email_otp') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const draft = regDrafts.get(interaction.user.id);
                if (!draft) {
                    await interaction.editReply('❌ Registration session expired. Please type !start and begin again.');
                    return;
                }
                try {
                    await axios.post(`${API_URL}/auth/email-otp/send`, { email: draft.email });
                    await interaction.editReply({
                        content: `✅ New code sent to **${draft.email}**.\nEnter it to complete registration:`,
                        components: [{ type: 1, components: [{ type: 2, label: '📧 Enter Email Code', style: 1, custom_id: 'verify_reg_email_btn' }, { type: 2, label: '🔄 Resend Code', style: 2, custom_id: 'resend_reg_email_otp' }] }]
                    });
                } catch (err: any) {
                    await interaction.editReply(`❌ ${err.response?.data?.error || 'Failed to resend.'}`);
                }
            }
        }

        if (interaction.isModalSubmit()) {
            console.log(`📝 Modal: ${customId} by ${interaction.user.tag}`);
            if (customId.startsWith('registration_modal')) {
                const referralCode = customId.split('|')[1] || '';
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const firstName = interaction.fields.getTextInputValue('first_name');
                const lastName = interaction.fields.getTextInputValue('last_name');
                const email = interaction.fields.getTextInputValue('email');
                const safetag = interaction.fields.getTextInputValue('safetag');
                const finalSafetag = safetag.startsWith('@') ? safetag : `@${safetag}`;

                // Check safetag availability
                try {
                    await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(finalSafetag)}`);
                    return await interaction.editReply(`❌ Safetag **${finalSafetag}** is already taken. Please try again with a different one.`);
                } catch (tagErr: any) {
                    if (tagErr.response?.status !== 404) {
                        return await interaction.editReply('❌ Could not verify safetag availability. Please try again.');
                    }
                    // 404 = available, continue
                }

                // Send email OTP
                try {
                    await axios.post(`${API_URL}/auth/email-otp/send`, { email });
                    regDrafts.set(interaction.user.id, { firstName, lastName, email, safetag: finalSafetag, referralCode });
                    await interaction.editReply({
                        content: `📧 **Verify Your Email**\n\nWe've sent a 6-digit code to **${email}**.\nEnter it to complete registration:`,
                        components: [{ type: 1, components: [{ type: 2, label: '📧 Enter Email Code', style: 1, custom_id: 'verify_reg_email_btn' }, { type: 2, label: '🔄 Resend Code', style: 2, custom_id: 'resend_reg_email_otp' }] }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Failed: ${err.response?.data?.error || err.message}`); }
            } else if (customId === 'login_modal') {
                const safetag = interaction.fields.getTextInputValue('safetag');
                const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await axios.post(`${API_URL}/auth/otp/send`, { safetag: cleanTag, platform: 'discord', platform_id: interaction.user.id });
                    await interaction.editReply({
                        content: `🔐 **OTP Sent** to your linked accounts.\nPlease enter it to link this Discord:`,
                        components: [{ type: 1, components: [{ type: 2, label: '🔢 Enter OTP', style: 1, custom_id: `verify_otp_btn|${cleanTag}` }, { type: 2, label: '🔄 Resend OTP', style: 2, custom_id: `resend_login_otp|${cleanTag}` }] }]
                    });
                } catch (err: any) { await interaction.editReply(`❌ Error: ${err.response?.data?.error || 'Failed.'}`); }
            } else if (customId === 'reg_email_otp_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const code = interaction.fields.getTextInputValue('email_code');
                const draft = regDrafts.get(interaction.user.id);
                if (!draft) {
                    return await interaction.editReply('❌ Registration session expired. Please type !start and begin again.');
                }
                // Verify email OTP
                try {
                    await axios.post(`${API_URL}/auth/email-otp/verify`, { email: draft.email, code });
                } catch (err: any) {
                    return await interaction.editReply({
                        content: `❌ ${err.response?.data?.error || 'Invalid code.'} Try again:`,
                        components: [{ type: 1, components: [{ type: 2, label: '📧 Enter Email Code', style: 1, custom_id: 'verify_reg_email_btn' }, { type: 2, label: '🔄 Resend Code', style: 2, custom_id: 'resend_reg_email_otp' }] }]
                    });
                }
                // Email verified — register profile
                try {
                    const payload: any = { safetag: draft.safetag, email: draft.email, first_name: draft.firstName, last_name: draft.lastName, primary_platform: 'discord', platform_id: interaction.user.id };
                    if (draft.referralCode) payload.referral_code = draft.referralCode;
                    await axios.post(`${API_URL}/profiles/register`, payload);
                    regDrafts.delete(interaction.user.id);
                    await interaction.editReply(`🎉 **Registration Complete!**\n\n✅ You're all set!\n\nYour Safetag: **${draft.safetag}**\n📧 Email: ${draft.email}\n\n🔐 Your account is secure and ready to use`);
                    await sendMainMenu(interaction);
                } catch (err: any) { await interaction.editReply(`❌ Failed: ${err.response?.data?.error || err.message}`); }
            } else if (customId.startsWith('otp_verify_modal|')) {
                const safetag = customId.split('|')[1];
                const otp = interaction.fields.getTextInputValue('otp_code');
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const res = await axios.post(`${API_URL}/auth/otp/verify`, { safetag, platform: 'discord', platform_id: interaction.user.id, otp });
                    await interaction.editReply(`👋 **Welcome back!** Your Discord is linked.`);
                    await sendMainMenu(interaction);
                } catch (err: any) { await interaction.editReply(`❌ Verification failed: ${err.response?.data?.error || 'Invalid.'}`); }
            } else if (customId.startsWith('dispute_modal_')) {
                const txnId = customId.replace('dispute_modal_', '');
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const reason = interaction.fields.getTextInputValue('reason');
                const pending = pendingDisputeData.get(interaction.user.id);
                pendingDisputeData.delete(interaction.user.id);
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    await axios.post(`${API_URL}/disputes/raise`, { transaction_id: txnId, raised_by: profileRes.data.id, reason, category: pending?.category });
                    await interaction.editReply({ content: `✅ **Dispute Raised!** The transaction is frozen.`, components: [{ type: 1, components: [{ type: 2, label: '🏠 Menu', style: 2, custom_id: 'main_menu' }] }] });
                } catch (err: any) { await interaction.editReply(`❌ Failed: ${err.message}`); }
            } else if (customId.startsWith('dispute_modal|')) {
                const txnId = customId.split('|')[1];
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const reason = interaction.fields.getTextInputValue('reason');
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    await axios.post(`${API_URL}/disputes/raise`, { transaction_id: txnId, raised_by: profileRes.data.id, reason });
                    await interaction.editReply({ content: `✅ **Dispute Raised!** The transaction is frozen.`, components: [{ type: 1, components: [{ type: 2, label: '🏠 Menu', style: 2, custom_id: 'main_menu' }] }] });
                } catch (err: any) { await interaction.editReply(`❌ Failed: ${err.message}`); }
            } else if (customId.startsWith('dispute_return_buyer_') || customId.startsWith('dispute_return_seller_')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const role = customId.startsWith('dispute_return_buyer_') ? 'BUYER' : 'SELLER';
                const disputeId = customId.replace('dispute_return_buyer_', '').replace('dispute_return_seller_', '');
                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_platform/discord/${interaction.user.id}`);
                    await axios.post(`${API_URL}/disputes/${disputeId}/confirm-return`, { confirmer_id: profileRes.data.id, role });
                    const msg = role === 'BUYER'
                        ? '📦 **Shipping Confirmed** — Seller notified. Refund will be issued once they confirm receipt.'
                        : '✅ **Receipt Confirmed** — Buyer refund credit has been issued.';
                    await interaction.editReply({ content: msg, components: [] });
                } catch (err: any) { await interaction.editReply(`❌ ${err.response?.data?.error || err.message}`); }
            } else if (customId.startsWith('txn_modal_step1|')) {
                const parts = customId.split('|');
                const role = parts[1];
                const type = parts[2] as 'ONE_TIME' | 'MILESTONE';
                
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const incomingGuild = incomingGuildIds.get(interaction.user.id);
                const incomingGroupId = (incomingGuild && incomingGuild.expires > Date.now()) ? incomingGuild.communityId : undefined;

                txnDrafts.set(interaction.user.id, {
                    role,
                    transaction_type: type,
                    milestones: [],
                    product: interaction.fields.getTextInputValue('product_name'),
                    desc: interaction.fields.getTextInputValue('description'),
                    ...(incomingGroupId ? { incomingGroupId } : {}),
                });

                await interaction.editReply({
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
                    ]
                });
            } else if (customId === 'txn_modal_milestone') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const title = interaction.fields.getTextInputValue('title');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) {
                    return interaction.editReply('❌ Invalid amount. Please enter a valid number.');
                }

                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply('❌ Transaction state lost.');
                
                draft.milestones?.push({ title, amount });
                
                const total = draft.milestones?.reduce((sum, m) => sum + m.amount, 0) || 0;
                draft.amount = total.toString();

                let mList = draft.milestones?.map((m, i) => `${i+1}. **${m.title}**: ${m.amount} ${draft.currency}`).join('\n');
                
                await interaction.editReply({
                    content: `✅ **Milestone Added: ${title}**\n\n📍 **Current Phases:**\n${mList}\n\n💰 Total Project Amount: **${total} ${draft.currency}**`,
                    components: [{
                        type: 1,
                        components: [
                            { type: 2, label: '➕ Add Another Phase', style: 1, custom_id: 'txn_milestone_add' },
                            { type: 2, label: '✅ Finish & Set Fees', style: 2, custom_id: 'txn_milestone_finish' }
                        ]
                    }]
                });
            } else if (customId === 'txn_modal_amount') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) {
                    return interaction.editReply('❌ Invalid amount. Please enter a valid number (e.g. 5000).');
                }

                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply('❌ Transaction state lost.');
                draft.amount = amountStr;

                const fee = amount * 0.05;

                await interaction.editReply({
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
                    ]
                });
            } else if (customId === 'txn_modal_other') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const other = interaction.fields.getTextInputValue('other_party');
                const otherSafetag = other.startsWith('@') ? other : `@${other}`;
                const draft = txnDrafts.get(interaction.user.id);
                if (!draft) return interaction.editReply({ content: '❌ Transaction state lost.' });

                try {
                    const profileRes = await axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(otherSafetag)}`);
                    draft.other = profileRes.data.safetag; // use canonical casing from DB
                    const profile = profileRes.data;
                    const isVerified = profile.kyc_status === 'VERIFIED';
                    const verifiedEmoji = isVerified ? '✅' : '❌';
                    const verifiedText = isVerified ? 'Verified' : 'Unverified';

                    let ratingStr = 'No reviews yet';
                    let ratingSuffix = '';
                    try {
                        const statsRes = await axios.get(`${API_URL}/reviews/stats/${encodeURIComponent(otherSafetag)}`);
                        const { average_rating, review_count } = statsRes.data;
                        if (review_count > 0) {
                            ratingStr = `${average_rating.toFixed(1)}/5`;
                            ratingSuffix = `(${review_count} reviews)`;
                        }
                    } catch (e) {}

                    const profileType = draft.role === 'buyer' ? 'Seller' : 'Buyer';

                    const profilePreview = `👤 **${profileType} Profile**\n\n` +
                        `\`${profile.safetag}\`\n` +
                        `⭐ **Rating: ${ratingStr} ${ratingSuffix}**\n` +
                        `${verifiedEmoji} 💳 **${verifiedText} ${profileType}**\n\n` +
                        `Continue with this ${profileType.toLowerCase()}?`;

                    await interaction.editReply({
                        content: profilePreview,
                        components: [
                            {
                                type: 1,
                                components: [
                                    { type: 2, label: '✅ Yes, Continue', style: 3, custom_id: `txn_profile_confirm` },
                                    { type: 2, label: '❌ No, Change', style: 4, custom_id: 'txn_cancel' },
                                    { type: 2, label: '⭐ View Reviews', style: 5, url: `${REVIEWS_URL}/reviews/${encodeURIComponent(otherSafetag)}` }
                                ]
                            }
                        ]
                    });
                } catch (err: any) {
                    console.error('❌ Counterparty lookup error:', (err as any).response?.data || err.message);
                    await interaction.editReply(`❌ User **${otherSafetag}** not found. Please ensure the Safetag is correct.`);
                }

            } else if (customId === 'deletion_feedback_modal') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
            } else if (customId === 'cwd_submit') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const session = communityWithdrawSessions.get(interaction.user.id);
                if (!session) return interaction.editReply('❌ Session expired. Please try again from the dashboard.');
                communityWithdrawSessions.delete(interaction.user.id);
                const amountStr = interaction.fields.getTextInputValue('amount');
                const bank_name = interaction.fields.getTextInputValue('bank_name');
                const account_number = interaction.fields.getTextInputValue('account_number');
                const account_name = interaction.fields.getTextInputValue('account_name');
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) return interaction.editReply('❌ Invalid amount. Please enter a positive number.');
                try {
                    await axios.post(`${API_URL}/communities/${session.groupId}/withdraw`, {
                        currency: session.currency,
                        amount,
                        bank_name,
                        account_number,
                        account_name,
                    });
                    await interaction.editReply(`✅ **Withdrawal Requested!**\n\nAmount: **${amount.toLocaleString()} ${session.currency}**\nBank: ${bank_name} · ${account_number}\nAccount: ${account_name}\n\n⏳ We'll process this within 1–2 business days. You'll receive a notification when it's done.`);
                } catch (err: any) {
                    await interaction.editReply(`❌ ${err.response?.data?.error || err.message}`);
                }
            }
        }
    } catch (err: any) {
        console.error(`❌ Interaction Error (${API_URL}):`, {
            message: err.message,
            code: err.code,
            status: err.response?.status,
            data: err.response?.data
        });
        if (interaction.isRepliable()) {
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: `❌ Error: ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
                } else {
                    await interaction.reply({ content: `❌ Error: ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            } catch (e) {
                console.error('Failed to send error message to user:', (e as any).message);
            }
        }
    }
});

console.log('⏳ Attempting to login to Discord...');

client.login(process.env.DISCORD_BOT_TOKEN).then(() => {
    console.log('🛰️ Discord Login Promise resolved.');
}).catch(err => {
    console.error('❌ Failed to login to Discord:', err.message);
    // Allow discord.js to handle reconnection naturally instead of force-killing the process
});
