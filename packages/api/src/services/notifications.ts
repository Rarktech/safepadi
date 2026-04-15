import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
        try {
            // Convert Markdown bold (**text**) to HTML (<b>text</b>) for Telegram
            const formattedMsg = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

            const payload: any = {
                chat_id: platformId,
                parse_mode: 'HTML'
            };

            if (options && options.length > 0) {
                payload.reply_markup = {
                    inline_keyboard: options.map(opt => [
                        opt.url ? { text: opt.label, web_app: { url: opt.url } } : { text: opt.label, callback_data: opt.customId }
                    ])
                };
            }

            if (imageUrl) {
                log(`Sending to telegram (${platformId}) with mediaUrl: ${imageUrl}`);
                const extMatch = typeof imageUrl === 'string' ? imageUrl.match(/\.(mp4|mov|webm)(\?|$)/i) : null;
                const isVideo = !!extMatch;

                // Send Photo/Video by letting Telegram API pull the URL directly (avoids Node Blob/FormData bugs)
                payload[isVideo ? 'video' : 'photo'] = imageUrl;
                payload.caption = formattedMsg; // Attach text to media

                const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, payload);
                log(`✅ [Telegram Notification] Media+Caption Sent to ${platformId}`);
            } else {
                payload.text = formattedMsg;
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, payload);
                log(`✅ [Telegram Notification] Text Message Sent to ${platformId}`);
            }
        } catch (err: any) {
            const errorMsg = `❌ Telegram Error for ${platformId}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`;
            log(errorMsg);
            console.error(errorMsg);
        }
    } else if (platform === 'discord' && DISCORD_BOT_TOKEN) {
        try {
            const dmChannel = await axios.post(
                'https://discord.com/api/v10/users/@me/channels',
                { recipient_id: platformId },
                {
                    headers: {
                        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const channelId = dmChannel.data.id;

            // Discord doesn't support HTML tags, convert to Markdown
            let formattedMessage = message
                .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '$2: $1') // Convert <a href="URL">TEXT</a> to TEXT: URL
                .replace(/<b>/g, '**').replace(/<\/b>/g, '**')
                .replace(/<code>/g, '`').replace(/<\/code>/g, '`')
                .replace(/<i>/g, '*').replace(/<\/i>/g, '*');

            if (formattedMessage.length > 2000) {
                formattedMessage = formattedMessage.substring(0, 1997) + '...';
            }

            log(`Sending to discord (${platformId}) with mediaUrl: ${imageUrl || 'none'}`);
            // If imageUrl is provided, we need to handle it natively
            let payload: any = { content: formattedMessage };
            let form: FormData | null = null;

            if (imageUrl) {
                const extMatch = typeof imageUrl === 'string' ? imageUrl.match(/\.(png|jpe?g|gif|webp|mp4|mov|webm)(\?|$)/i) : null;
                const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
                const isVideo = ['mp4', 'mov', 'webm'].includes(ext);

                if (isVideo) {
                    // Discord auto embeds video links cleanly
                    payload.content = `${imageUrl}\n\n${formattedMessage}`;
                } else {
                    try {
                        log(`Attempting to download image for Discord: ${imageUrl}`);
                        const response = await axios.get(imageUrl, {
                            responseType: 'arraybuffer',
                            headers: { 'ngrok-skip-browser-warning': '1' }
                        });
                        
                        form = new FormData();
                        form.append('payload_json', JSON.stringify(payload));
                        form.append('files[0]', new Blob([response.data], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }), `image.${ext}`);

                        payload = form; // override payload to send as multipart form later
                    } catch (err: any) {
                        console.error('Failed to prepare Discord Photo File:', err.message);
                    }
                }
            }

            // Append components if present
            if (options && options.length > 0) {
                const componentsObj = [
                    {
                        type: 1,
                        components: options.map(opt => {
                            if (opt.url) {
                                return {
                                    type: 2,
                                    label: opt.label,
                                    style: 5,
                                    url: opt.url
                                };
                            }
                            return {
                                type: 2,
                                label: opt.label,
                                style: opt.customId!.includes('accept') || opt.customId!.includes('confirm') ? 3 : (opt.customId!.includes('decline') || opt.customId!.includes('cancel') || opt.customId!.includes('dispute') ? 4 : 2),
                                custom_id: opt.customId
                            };
                        })
                    }
                ];

                if (form) {
                    // Update the payload_json field in the form
                    const currentPayload = JSON.parse(form.get('payload_json') as string);
                    currentPayload.components = componentsObj;
                    form.set('payload_json', JSON.stringify(currentPayload));
                } else {
                    payload.components = componentsObj;
                }
            }

            const headers: any = {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            };

            if (!form) {
                headers['Content-Type'] = 'application/json';
            }

            await axios.post(
                `https://discord.com/api/v10/channels/${channelId}/messages`,
                payload,
                { headers }
            );
            log(`✅ [Discord Notification] Sent to ${platformId}`);
        } catch (err: any) {
            const errorMsg = `❌ Discord Error for ${platformId}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`;
            log(errorMsg);
            console.error(errorMsg);
        }
    } else if (platform === 'apple') {
        const JIVO_PROVIDER_ID = process.env.JIVO_PROVIDER_ID;
        const JIVO_TOKEN = process.env.JIVO_TOKEN;
        
        log(`🍎 [Apple Notification] Attempting to notify ${platformId}...`);

        if (!JIVO_PROVIDER_ID || !JIVO_TOKEN) {
            log(`❌ Apple Notification Error: Jivo credentials missing in .env (Provider: ${JIVO_PROVIDER_ID ? 'OK' : 'MISSING'}, Token: ${JIVO_TOKEN ? 'OK' : 'MISSING'})`);
            return;
        }

        try {
            const url = `https://bot.jivosite.com/webhooks/${JIVO_PROVIDER_ID}/${JIVO_TOKEN}`;
            const cleanMessage = message.replace(/<[^>]*>/g, ''); // Jivo text doesn't like HTML tags

            const payload: any = {
                event: "BOT_MESSAGE",
                id: require('crypto').randomUUID(),
                client_id: String(platformId),
                chat_id: String(platformId),
                message: {
                    type: "TEXT",
                    text: cleanMessage
                }
            };

            await axios.post(url, payload);
            log(`✅ [Apple Notification] Basic Text Sent to ${platformId}`);

            if (options && options.length > 0) {
                const buttonsPayload = {
                    event: "BOT_MESSAGE",
                    id: require('crypto').randomUUID(),
                    client_id: String(platformId),
                    chat_id: String(platformId),
                    message: {
                        type: "BUTTONS",
                        title: "Transaction Update",
                        text: "Please select an action:",
                        buttons: options.map((opt, index) => ({
                            text: opt.label, // This is the main title in Apple
                            title: opt.label, // Alternative for some systems
                            subtitle: "Tap to proceed", // Explicitly set subtitle to fix double-text
                            description: "Tap to proceed", // Alternative description field
                            id: opt.customId || `opt_${index}`
                        }))
                    }
                };
                await axios.post(url, buttonsPayload);
                log(`✅ [Apple Notification] Interactive Buttons Sent to ${platformId}`);
            }
        } catch (err: any) {
            const errorMsg = `❌ Apple Notification Error for ${platformId}: ${err.message}`;
            log(errorMsg);
            console.error(errorMsg);
        }
    }
}
