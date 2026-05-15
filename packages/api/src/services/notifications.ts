import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '@safepal/shared';
import { sendEmail } from './email';

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
            // Escape HTML entities, preserving all valid Telegram HTML tags (including <a href>)
            const tagRe = /(<\/?(b|i|em|strong|code|s|strike|del|u|a)(?:\s[^>]*)?>)/gi;
            const parts: string[] = [];
            let last = 0;
            let m: RegExpExecArray | null;
            tagRe.lastIndex = 0;
            while ((m = tagRe.exec(message)) !== null) {
                const raw = message.slice(last, m.index)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                parts.push(raw, m[0]);
                last = m.index + m[0].length;
            }
            parts.push(message.slice(last).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
            const escapedMsg = parts.join('');

            // Convert any remaining Markdown to HTML
            const formattedMsg = escapedMsg
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/__(.*?)__/g, '<i>$1</i>')
                .replace(/`(.*?)`/g, '<code>$1</code>');

            log(`[Telegram] Final Payload Msg:\n${formattedMsg}`);
            const replyMarkup = options && options.length > 0
                ? { inline_keyboard: options.map(opt => [opt.url ? { text: opt.label, url: opt.url } : { text: opt.label, callback_data: opt.customId }]) }
                : undefined;

            if (imageUrl) {
                // Pre-fetch the image as a buffer so Telegram doesn't need to hit our Puppeteer endpoint
                const FormData = require('form-data');
                const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
                const imgBuffer = Buffer.from(imgResp.data);
                const isVideo = imageUrl.match(/\.(mp4|mov|webm)(\?|$)/i);
                const form = new FormData();
                form.append('chat_id', platformId);
                form.append('parse_mode', 'HTML');
                form.append('caption', formattedMsg);
                form.append(isVideo ? 'video' : 'photo', imgBuffer, { filename: isVideo ? 'receipt.mp4' : 'receipt.png', contentType: isVideo ? 'video/mp4' : 'image/png' });
                if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
                const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, form, { headers: form.getHeaders() });
            } else {
                const payload: any = { chat_id: platformId, parse_mode: 'HTML', text: formattedMsg };
                if (replyMarkup) payload.reply_markup = replyMarkup;
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, payload);
            }
            log(`✅ [Telegram Notification] Sent to ${platformId}`);
        } catch (err: any) { log(`❌ Telegram Error: ${err.message}`); }

    } else if (platform === 'discord' && DISCORD_BOT_TOKEN) {
        // ... (Discord logic unchanged)
        try {
            const dm = await axios.post('https://discord.com/api/v10/users/@me/channels', { recipient_id: platformId }, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            const channelId = dm.data.id;
            
            // Convert HTML to Discord Markdown
            let formattedMessage = message
                .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<i>(.*?)<\/i>/gi, '_$1_')
                .replace(/<em>(.*?)<\/em>/gi, '_$1_')
                .replace(/<code>(.*?)<\/code>/gi, '`$1`')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>/g, '') // Strip remaining tags
                .substring(0, 2000);

            let payload: any = { content: formattedMessage };
            if (options && options.length > 0) {
                payload.components = [{ type: 1, components: options.map(opt => ({ type: 2, label: opt.label, style: opt.url ? 5 : 2, url: opt.url, custom_id: opt.customId })) }];
            }
            if (imageUrl) {
                payload.embeds = [{ image: { url: imageUrl } }];
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
                        buttons: options.filter(opt => opt.customId).map((opt, i) => ({
                            text: opt.label,
                            subtitle: "Tap to proceed",
                            description: "Tap to proceed",
                            id: opt.customId
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

    } else if (platform === 'instagram') {
        const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
        if (!IG_TOKEN) { log(`⚠️ Instagram notification skipped — INSTAGRAM_ACCESS_TOKEN not set`); return; }
        const IG_BASE = 'https://graph.facebook.com/v18.0';

        const cleanMsg = message.replace(/<[^>]*>/g, '');

        try {
            // 1. Send image receipt if present
            if (imageUrl) {
                log(`🖼️ [Instagram] Sending receipt image to ${platformId}: ${imageUrl}`);
                await axios.post(`${IG_BASE}/me/messages?access_token=${IG_TOKEN}`, {
                    recipient: { id: platformId },
                    message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } },
                    messaging_type: 'MESSAGE_TAG',
                    tag: 'POST_PURCHASE_UPDATE'
                });
            }

            // 2. Build text or template payload
            let msgPayload: any;
            if (options && options.length > 0) {
                const hasUrls = options.some(o => o.url);
                if (hasUrls) {
                    msgPayload = {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'button',
                                text: cleanMsg.substring(0, 640),
                                buttons: options.slice(0, 3).map(opt =>
                                    opt.url
                                        ? { type: 'web_url',  url: opt.url,                       title: opt.label.substring(0, 20) }
                                        : { type: 'postback', payload: opt.customId || opt.label,  title: opt.label.substring(0, 20) }
                                )
                            }
                        }
                    };
                } else {
                    msgPayload = {
                        text: cleanMsg,
                        quick_replies: options.slice(0, 13).map(opt => ({
                            content_type: 'text',
                            title:   opt.label.substring(0, 20),
                            payload: opt.customId || opt.label
                        }))
                    };
                }
            } else {
                msgPayload = { text: cleanMsg };
            }

            await axios.post(`${IG_BASE}/me/messages?access_token=${IG_TOKEN}`, {
                recipient: { id: platformId },
                message: msgPayload,
                messaging_type: 'MESSAGE_TAG',
                tag: 'POST_PURCHASE_UPDATE'
            });
            log(`✅ [Instagram Notification] Sent to ${platformId}`);
        } catch (err: any) {
            log(`❌ Instagram Notification Error for ${platformId}: ${err.response?.data?.error?.message || err.message}`);
        }
    } else if (platform === 'whatsapp') {
        const WA_TOKEN = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID = process.env.PHONE_NUMBER_ID;
        if (!WA_TOKEN || !WA_PHONE_ID) { log(`⚠️ WhatsApp notification skipped — WHATSAPP_TOKEN or PHONE_NUMBER_ID not set`); return; }
        const WA_BASE = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`;
        const headers = { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' };
        const cleanMsg = message.replace(/<[^>]*>/g, '');

        try {
            if (imageUrl) {
                log(`🖼️ [WhatsApp] Sending receipt image to ${platformId}: ${imageUrl}`);
                await axios.post(WA_BASE, {
                    messaging_product: 'whatsapp',
                    to: platformId,
                    type: 'image',
                    image: { link: imageUrl, caption: cleanMsg.substring(0, 1024) }
                }, { headers });
            } else if (options && options.length > 0) {
                const urlOpts = options.filter(o => o.url);
                const replyOpts = options.filter(o => !o.url);

                if (replyOpts.length > 0) {
                    // Send reply buttons (non-URL options) with the message text
                    const buttons = replyOpts.slice(0, 3).map((opt, i) => ({
                        type: 'reply',
                        reply: { id: (opt.customId || `opt_${i}`).substring(0, 256), title: opt.label.substring(0, 20) }
                    }));
                    await axios.post(WA_BASE, {
                        messaging_product: 'whatsapp',
                        to: platformId,
                        type: 'interactive',
                        interactive: {
                            type: 'button',
                            body: { text: cleanMsg.substring(0, 1024) },
                            action: { buttons }
                        }
                    }, { headers });
                    // Then send each URL option as a separate CTA message
                    for (const urlOpt of urlOpts) {
                        await axios.post(WA_BASE, {
                            messaging_product: 'whatsapp',
                            to: platformId,
                            type: 'interactive',
                            interactive: {
                                type: 'cta_url',
                                body: { text: urlOpt.label.substring(0, 1024) },
                                action: { name: 'cta_url', parameters: { display_text: urlOpt.label.substring(0, 20), url: urlOpt.url } }
                            }
                        }, { headers });
                    }
                } else {
                    // URL-only options — send a single CTA URL
                    const urlOpt = urlOpts[0];
                    await axios.post(WA_BASE, {
                        messaging_product: 'whatsapp',
                        to: platformId,
                        type: 'interactive',
                        interactive: {
                            type: 'cta_url',
                            body: { text: cleanMsg.substring(0, 1024) },
                            action: { name: 'cta_url', parameters: { display_text: urlOpt.label.substring(0, 20), url: urlOpt.url } }
                        }
                    }, { headers });
                }
            } else {
                await axios.post(WA_BASE, {
                    messaging_product: 'whatsapp',
                    to: platformId,
                    type: 'text',
                    text: { body: cleanMsg.substring(0, 4096) }
                }, { headers });
            }
            log(`✅ [WhatsApp Notification] Sent to ${platformId}`);
        } catch (err: any) {
            log(`❌ WhatsApp Notification Error for ${platformId}: ${err.response?.data?.error?.message || err.message}`);
        }
    } else if (platform === 'messenger') {
        const MSG_TOKEN = process.env.MESSENGER_ACCESS_TOKEN;
        if (!MSG_TOKEN) { log(`⚠️ Messenger notification skipped — MESSENGER_ACCESS_TOKEN not set`); return; }
        const MSG_BASE = 'https://graph.facebook.com/v18.0';
        const cleanMsg = message.replace(/<[^>]*>/g, '');

        try {
            // 1. Send image receipt if present
            if (imageUrl) {
                log(`🖼️ [Messenger] Sending receipt image to ${platformId}: ${imageUrl}`);
                await axios.post(`${MSG_BASE}/me/messages?access_token=${MSG_TOKEN}`, {
                    recipient: { id: platformId },
                    message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } },
                    messaging_type: 'MESSAGE_TAG',
                    tag: 'ACCOUNT_UPDATE'
                });
            }

            // 2. Build text or template payload
            let msgPayload: any;
            if (options && options.length > 0) {
                const hasUrls = options.some(o => o.url);
                if (hasUrls) {
                    msgPayload = {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'button',
                                text: cleanMsg.substring(0, 640),
                                buttons: options.slice(0, 3).map(opt =>
                                    opt.url
                                        ? { type: 'web_url',  url: opt.url,                      title: opt.label.substring(0, 20) }
                                        : { type: 'postback', payload: opt.customId || opt.label, title: opt.label.substring(0, 20) }
                                )
                            }
                        }
                    };
                } else {
                    msgPayload = {
                        text: cleanMsg,
                        quick_replies: options.slice(0, 13).map(opt => ({
                            content_type: 'text',
                            title:   opt.label.substring(0, 20),
                            payload: opt.customId || opt.label
                        }))
                    };
                }
            } else {
                msgPayload = { text: cleanMsg };
            }

            await axios.post(`${MSG_BASE}/me/messages?access_token=${MSG_TOKEN}`, {
                recipient: { id: platformId },
                message: msgPayload,
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE'
            });
            log(`✅ [Messenger Notification] Sent to ${platformId}`);
        } catch (err: any) {
            log(`❌ Messenger Notification Error for ${platformId}: ${err.response?.data?.error?.message || err.message}`);
        }
    }
}

const META_PLATFORMS = ['whatsapp', 'instagram', 'messenger'];
const WINDOW_24H_MS  = 24 * 60 * 60 * 1000;

export async function sendReferralNotification(
    referrerId: string,
    platformMessage: string,
    emailSubject: string,
    emailHtml: string
): Promise<void> {
    try {
        const { data: referrer } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', referrerId)
            .single();
        if (!referrer) return;

        const { data: primary } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id, last_message_at')
            .eq('profile_id', referrerId)
            .eq('is_primary', true)
            .single();

        if (!primary) {
            sendEmail({ to: referrer.email, subject: emailSubject, html: emailHtml }).catch(() => {});
            return;
        }

        if (META_PLATFORMS.includes(primary.platform)) {
            const windowOpen = primary.last_message_at
                ? (Date.now() - new Date(primary.last_message_at).getTime()) < WINDOW_24H_MS
                : false;
            if (windowOpen) {
                await sendNotification(primary.platform, primary.platform_id, platformMessage);
            } else {
                sendEmail({ to: referrer.email, subject: emailSubject, html: emailHtml }).catch(() => {});
            }
        } else {
            await sendNotification(primary.platform, primary.platform_id, platformMessage);
        }
    } catch (err: any) {
        log(`❌ sendReferralNotification error for referrer ${referrerId}: ${err.message}`);
    }
}

export async function routeNotification(
    profileId: string,
    message: string,
    options?: { label: string; customId?: string; url?: string }[],
    imageUrl?: string | null,
    emailFallback?: () => void | Promise<void>
): Promise<void> {
    try {
        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id, last_message_at')
            .eq('profile_id', profileId)
            .eq('is_primary', true)
            .single();

        if (!linked) {
            if (emailFallback) emailFallback();
            return;
        }

        if (!META_PLATFORMS.includes(linked.platform)) {
            await sendNotification(linked.platform, linked.platform_id, message, options ?? [], imageUrl ?? undefined);
            return;
        }

        const windowOpen = linked.last_message_at
            ? (Date.now() - new Date(linked.last_message_at).getTime()) < WINDOW_24H_MS
            : false;

        if (windowOpen) {
            await sendNotification(linked.platform, linked.platform_id, message, options ?? [], imageUrl ?? undefined);
        } else if (emailFallback) {
            emailFallback();
        } else {
            log(`⚠️ [routeNotification] Meta window closed for ${profileId}, no email fallback provided — notification skipped`);
        }
    } catch (err: any) {
        log(`❌ routeNotification error for profile ${profileId}: ${err.message}`);
        if (emailFallback) { try { emailFallback(); } catch {} }
    }
}

export async function recordNotification(
    profileId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, any> = {}
) {
    try {
        await supabase.from('notifications').insert({
            profile_id: profileId,
            type,
            title,
            message,
            data,
        });
    } catch (err: any) {
        log(`❌ recordNotification error for profile ${profileId}: ${err.message}`);
    }
}

export async function sendTelegramGroupMessage(
    telegramGroupId: number,
    message: string,
    button?: { text: string; url: string }
): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.warn('TELEGRAM_BOT_TOKEN not set — cannot send group announcement');
        return;
    }

    const payload: any = {
        chat_id: telegramGroupId,
        text: message,
        parse_mode: 'HTML',
    };

    if (button) {
        payload.reply_markup = {
            inline_keyboard: [[{ text: button.text, url: button.url }]],
        };
    }

    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, payload);
}

export async function sendDiscordChannelMessage(
    channelId: string | number,
    message: string,
    button?: { label: string; url: string }
): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('DISCORD_BOT_TOKEN not set — cannot send Discord channel announcement');
        return;
    }

    const payload: any = { content: message };

    if (button) {
        payload.components = [{
            type: 1,
            components: [{ type: 2, style: 5, label: button.label, url: button.url }],
        }];
    }

    await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        payload,
        { headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' } }
    );
}
