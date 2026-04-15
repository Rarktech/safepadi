import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const LOG_FILE = 'c:\\Users\\user\\Desktop\\safepadi\\debug_notification.log';

function log(msg: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
    console.log(`[Notification Engine] ${msg}`);
}

export async function sendNotification(platform: string, platformId: string, message: string, options?: { label: string, customId?: string, url?: string }[], imageUrl?: string) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    if (platform === 'telegram' && TELEGRAM_BOT_TOKEN) {
        // ... (Telegram logic unchanged)
        try {
            const formattedMsg = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            const payload: any = { chat_id: platformId, parse_mode: 'HTML' };
            if (options && options.length > 0) {
                payload.reply_markup = {
                    inline_keyboard: options.map(opt => [
                        opt.url ? { text: opt.label, web_app: { url: opt.url } } : { text: opt.label, callback_data: opt.customId }
                    ])
                };
            }
            if (imageUrl) {
                payload[imageUrl.match(/\.(mp4|mov|webm)(\?|$)/i) ? 'video' : 'photo'] = imageUrl;
                payload.caption = formattedMsg;
                const endpoint = imageUrl.match(/\.(mp4|mov|webm)(\?|$)/i) ? 'sendVideo' : 'sendPhoto';
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, payload);
            } else {
                payload.text = formattedMsg;
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, payload);
            }
            log(`✅ [Telegram Notification] Sent to ${platformId}`);
        } catch (err: any) { log(`❌ Telegram Error: ${err.message}`); }

    } else if (platform === 'discord' && DISCORD_BOT_TOKEN) {
        // ... (Discord logic unchanged)
        try {
            const dm = await axios.post('https://discord.com/api/v10/users/@me/channels', { recipient_id: platformId }, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            const channelId = dm.data.id;
            let formattedMessage = message.replace(/<[^>]*>/g, '').substring(0, 2000);
            let payload: any = { content: formattedMessage };
            if (options && options.length > 0) {
                payload.components = [{ type: 1, components: options.map(opt => ({ type: 2, label: opt.label, style: opt.url ? 5 : 2, url: opt.url, custom_id: opt.customId })) }];
            }
            await axios.post(`https://discord.com/api/v10/channels/${channelId}/messages`, payload, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            log(`✅ [Discord Notification] Sent to ${platformId}`);
        } catch (err: any) { log(`❌ Discord Error: ${err.message}`); }

    } else if (platform === 'apple') {
        const JIVO_PROVIDER_ID = process.env.JIVO_PROVIDER_ID;
        const JIVO_TOKEN = process.env.JIVO_TOKEN;
        
        log(`🍎 [Apple Notification] Dispatching to ${platformId}...`);

        if (!JIVO_PROVIDER_ID || !JIVO_TOKEN) {
            log(`❌ Apple Notification Error: Jivo credentials missing in .env`);
            return;
        }

        try {
            const url = `https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`;
            const cleanMessage = message.replace(/<[^>]*>/g, ''); 

            // 1. Send Image (Receipt) as TEXT if available
            if (imageUrl) {
                log(`🖼️ [Apple] Sending receipt URL to ${platformId}: ${imageUrl}`);
                const imagePayload = {
                    event: "BOT_MESSAGE",
                    id: crypto.randomUUID(),
                    client_id: String(platformId),
                    chat_id: String(platformId),
                    message: {
                        type: "TEXT",
                        text: `🧾 *Transaction Receipt*\n${imageUrl}`
                    }
                };
                const imgRes = await axios.post(url, imagePayload);
                log(`📸 [Apple] Image Link Handshake: ${imgRes.status}`);
            }

            // 2. Send Text Message
            const textPayload = {
                event: "BOT_MESSAGE",
                id: crypto.randomUUID(),
                client_id: String(platformId),
                chat_id: String(platformId),
                message: {
                    type: "TEXT",
                    text: cleanMessage
                }
            };

            const textRes = await axios.post(url, textPayload);
            log(`✅ [Apple Notification] Text Handshake: ${textRes.status} ${JSON.stringify(textRes.data)}`);

            // 3. Send Buttons if options exist
            if (options && options.length > 0) {
                const buttonsPayload = {
                    event: "BOT_MESSAGE",
                    id: crypto.randomUUID(),
                    client_id: String(platformId),
                    chat_id: String(platformId),
                    message: {
                        type: "BUTTONS",
                        title: "Safeeely Update",
                        text: "Please select an action:",
                        buttons: options.map((opt, i) => ({
                            text: opt.label,
                            subtitle: "Tap to proceed", 
                            description: "Tap to proceed",
                            id: opt.customId || `opt_${i}`
                        }))
                    }
                };
                const btnRes = await axios.post(url, buttonsPayload);
                log(`✅ [Apple Notification] Buttons Handshake: ${btnRes.status} ${JSON.stringify(btnRes.data)}`);
            }
        } catch (err: any) {
            const errorMsg = `❌ Apple Notification Error for ${platformId}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`;
            log(errorMsg);
            console.error(errorMsg);
        }
    }
}
