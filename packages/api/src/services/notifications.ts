import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { supabase } from '@safepal/shared';
import { sendEmail } from './email';

const LOG_FILE = process.env.NODE_ENV === 'production'
    ? null
    : path.join(os.tmpdir(), 'safeeely_notifications.log');

function log(msg: string) {
    const timestamp = new Date().toISOString();
    if (LOG_FILE) {
        try { fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`); } catch { /* ignore log errors */ }
    }
    console.log(`[Notification Engine] ${msg}`);
}

export async function sendNotification(platform: string, platformId: string, message: string, options?: { label: string, customId?: string, url?: string }[], imageUrl?: string, imageBuffer?: Buffer): Promise<boolean> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    if (platform === 'telegram') {
        if (!TELEGRAM_BOT_TOKEN) { log(`⚠️ [Telegram] TELEGRAM_BOT_TOKEN not set in API service — notification skipped`); return false; }
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

            let imageSent = false;
            if (imageUrl) {
                try {
                    const FormData = require('form-data');
                    const imgBuffer = imageBuffer ?? Buffer.from(
                        (await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 })).data
                    );
                    const isVideo = imageUrl.match(/\.(mp4|mov|webm)(\?|$)/i);
                    const form = new FormData();
                    form.append('chat_id', platformId);
                    form.append('parse_mode', 'HTML');
                    form.append('caption', formattedMsg);
                    form.append(isVideo ? 'video' : 'photo', imgBuffer, { filename: isVideo ? 'receipt.mp4' : 'receipt.png', contentType: isVideo ? 'video/mp4' : 'image/png' });
                    if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
                    const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, form, { headers: form.getHeaders() });
                    imageSent = true;
                } catch (imgErr: any) {
                    log(`⚠️ [Telegram] Receipt image failed (${imgErr.message}) — falling back to text`);
                }
            }
            if (!imageSent) {
                const payload: any = { chat_id: platformId, parse_mode: 'HTML', text: formattedMsg };
                if (replyMarkup) payload.reply_markup = replyMarkup;
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, payload);
            }
            log(`✅ [Telegram Notification] Sent to ${platformId}`);
            return true;
        } catch (err: any) { log(`❌ Telegram Error: ${err.message}`); return false; }

    } else if (platform === 'discord') {
        if (!DISCORD_BOT_TOKEN) { log(`⚠️ [Discord] DISCORD_BOT_TOKEN not set in API service — notification skipped`); return false; }
        try {
            const dm = await axios.post('https://discord.com/api/v10/users/@me/channels', { recipient_id: platformId }, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            const channelId = dm.data.id;

            // Extract title from first <b>...</b> (supports both </b> and legacy <\b> typo)
            const titleMatch = message.match(/^([^<]*)<b>([^<]*)<[^>]+b>/i);
            const embedTitle = titleMatch
                ? (titleMatch[1].trim() + ' ' + titleMatch[2]).trim()
                : undefined;
            const bodyMessage = titleMatch
                ? message.slice(titleMatch[0].length).replace(/^\n+/, '')
                : message;

            // Map leading emoji to embed border color
            const emojiColors: Record<string, number> = {
                '⚠': 0xFFA500, '⏱': 0x3498DB, '⚖': 0x2ECC71,
                '🛡': 0x9B59B6, '📦': 0xE67E22, '💬': 0x5865F2,
                '🎉': 0x27AE60, '✅': 0x27AE60, '❌': 0xE74C3C,
                '🔒': 0x95A5A6,
            };
            const firstChar = [...message][0] ?? '';
            const color = emojiColors[firstChar] ?? 0x5865F2;

            // Convert HTML body to Discord Markdown
            const formattedBody = bodyMessage
                .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
                .replace(/<b>([\s\S]*?)<\\b>/gi, '**$1**')
                .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
                .replace(/<i>([\s\S]*?)<\/i>/gi, '_$1_')
                .replace(/<em>([\s\S]*?)<\/em>/gi, '_$1_')
                .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/gi, '[$2]($1)')
                .replace(/<[^>]*>/g, '')
                .trim()
                .substring(0, 4096);

            const embed: any = { color, description: formattedBody };
            if (embedTitle) embed.title = embedTitle;

            const components = options && options.length > 0
                ? [{ type: 1, components: options.map(opt => ({ type: 2, label: opt.label, style: opt.url ? 5 : 2, url: opt.url, custom_id: opt.customId })) }]
                : undefined;

            if (imageUrl || imageBuffer) {
                try {
                    const imgData = imageBuffer ?? Buffer.from(
                        (await axios.get(imageUrl!, { responseType: 'arraybuffer', timeout: 15000 })).data
                    );
                    const FormData = require('form-data');
                    const form = new FormData();
                    form.append('files[0]', imgData, { filename: 'receipt.png', contentType: 'image/png' });
                    const imgPayload: any = { embeds: [{ ...embed, image: { url: 'attachment://receipt.png' } }] };
                    if (components) imgPayload.components = components;
                    form.append('payload_json', JSON.stringify(imgPayload));
                    await axios.post(`https://discord.com/api/v10/channels/${channelId}/messages`, form, {
                        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, ...form.getHeaders() }
                    });
                    log(`✅ [Discord Notification] Sent to ${platformId}`);
                    return true;
                } catch (imgErr: any) {
                    log(`⚠️ [Discord] Failed to attach receipt image, sending text-only: ${imgErr.message}`);
                }
            }

            const payload: any = { embeds: [embed] };
            if (components) payload.components = components;
            await axios.post(`https://discord.com/api/v10/channels/${channelId}/messages`, payload, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            log(`✅ [Discord Notification] Sent to ${platformId}`);
            return true;
        } catch (err: any) { log(`❌ Discord Error: ${err.message}`); return false; }

    } else if (platform === 'apple') {
        const JIVO_PROVIDER_ID = process.env.JIVO_PROVIDER_ID;
        const JIVO_TOKEN = process.env.JIVO_TOKEN;
        
        log(`🍎 [Apple Notification] Dispatching to ${platformId}...`);

        if (!JIVO_PROVIDER_ID || !JIVO_TOKEN) {
            log(`⚠️ [Apple] JIVO_PROVIDER_ID or JIVO_TOKEN not set in API service — notification skipped`);
            return false;
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
            return true;
        } catch (err: any) {
            const errorMsg = `❌ Apple Notification Error for ${platformId}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`;
            log(errorMsg);
            console.error(errorMsg);
            return false;
        }

    } else if (platform === 'instagram') {
        const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
        if (!IG_TOKEN) { log(`⚠️ [Instagram] INSTAGRAM_ACCESS_TOKEN not set in API service — notification skipped`); return false; }
        const IG_BASE = 'https://graph.facebook.com/v18.0';

        const cleanMsg = message.replace(/<[^>]*>/g, '');

        try {
            // 1. Send image receipt if present (non-fatal — text still sends if this fails)
            if (imageUrl) {
                try {
                    log(`🖼️ [Instagram] Sending receipt image to ${platformId}: ${imageUrl}`);
                    await axios.post(`${IG_BASE}/me/messages?access_token=${IG_TOKEN}`, {
                        recipient: { id: platformId },
                        message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } },
                        messaging_type: 'MESSAGE_TAG',
                        tag: 'POST_PURCHASE_UPDATE'
                    });
                } catch (imgErr: any) {
                    log(`⚠️ [Instagram] Receipt image failed (${imgErr.message}) — sending text only`);
                }
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
            return true;
        } catch (err: any) {
            log(`❌ Instagram Notification Error for ${platformId}: ${err.response?.data?.error?.message || err.message}`);
            return false;
        }
    } else if (platform === 'whatsapp') {
        const WA_TOKEN = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID = process.env.PHONE_NUMBER_ID;
        if (!WA_TOKEN || !WA_PHONE_ID) { log(`⚠️ [WhatsApp] WHATSAPP_TOKEN or PHONE_NUMBER_ID not set in API service — notification skipped`); return false; }
        const WA_BASE = `https://graph.facebook.com/v17.0/${WA_PHONE_ID}/messages`;
        const headers = { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' };
        const cleanMsg = message.replace(/<[^>]*>/g, '');
        log(`[WhatsApp] token prefix=${WA_TOKEN.substring(0, 10)}… phone_id=${WA_PHONE_ID}`);

        try {
            if (options && options.length > 0) {
                const urlOpts   = options.filter(o => o.url);
                const replyOpts = options.filter(o => !o.url);

                if (replyOpts.length > 0) {
                    // Single combined message: image header (if available) + text body + reply buttons.
                    // This guarantees image, text, and buttons arrive together as one WhatsApp message.
                    const buttons = replyOpts.slice(0, 3).map((opt, i) => ({
                        type: 'reply',
                        reply: { id: (opt.customId || `opt_${i}`).substring(0, 256), title: opt.label.substring(0, 20) }
                    }));
                    const interactive: any = {
                        type: 'button',
                        body: { text: cleanMsg.substring(0, 1024) },
                        action: { buttons }
                    };
                    if (imageUrl) {
                        interactive.header = { type: 'image', image: { link: imageUrl } };
                    }
                    await axios.post(WA_BASE, {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: platformId,
                        type: 'interactive',
                        interactive
                    }, { headers });
                    // Send each URL option as a separate CTA message after
                    for (const urlOpt of urlOpts) {
                        await axios.post(WA_BASE, {
                            messaging_product: 'whatsapp',
                            recipient_type: 'individual',
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
                    // URL-only options: send image standalone first if available, then CTA
                    if (imageUrl) {
                        try {
                            await axios.post(WA_BASE, {
                                messaging_product: 'whatsapp',
                                recipient_type: 'individual',
                                to: platformId,
                                type: 'image',
                                image: { link: imageUrl, caption: cleanMsg.substring(0, 1024) }
                            }, { headers });
                        } catch (imgErr: any) {
                            log(`⚠️ [WhatsApp] Receipt image failed (${(imgErr as any).message})`);
                        }
                    }
                    const urlOpt = urlOpts[0];
                    await axios.post(WA_BASE, {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: platformId,
                        type: 'interactive',
                        interactive: {
                            type: 'cta_url',
                            body: { text: imageUrl ? urlOpt.label.substring(0, 1024) : cleanMsg.substring(0, 1024) },
                            action: { name: 'cta_url', parameters: { display_text: urlOpt.label.substring(0, 20), url: urlOpt.url } }
                        }
                    }, { headers });
                }
            } else if (imageUrl) {
                // Image with no buttons — send standalone image with caption
                try {
                    await axios.post(WA_BASE, {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: platformId,
                        type: 'image',
                        image: { link: imageUrl, caption: cleanMsg.substring(0, 1024) }
                    }, { headers });
                } catch (imgErr: any) {
                    log(`⚠️ [WhatsApp] Receipt image failed (${(imgErr as any).message}) — sending text`);
                    await axios.post(WA_BASE, {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: platformId,
                        type: 'text',
                        text: { body: cleanMsg.substring(0, 4096) }
                    }, { headers });
                }
            } else {
                await axios.post(WA_BASE, {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: platformId,
                    type: 'text',
                    text: { body: cleanMsg.substring(0, 4096) }
                }, { headers });
            }
            log(`✅ [WhatsApp Notification] Sent to ${platformId}`);
            return true;
        } catch (err: any) {
            const metaErr = err.response?.data?.error;
            if (metaErr) {
                log(`❌ WhatsApp Notification Error for ${platformId}: [${metaErr.code}/${metaErr.type}] ${metaErr.message}`);
            } else {
                log(`❌ WhatsApp Notification Error for ${platformId}: ${err.message}`);
            }
            return false;
        }
    } else if (platform === 'messenger') {
        const MSG_TOKEN = process.env.MESSENGER_ACCESS_TOKEN;
        if (!MSG_TOKEN) { log(`⚠️ [Messenger] MESSENGER_ACCESS_TOKEN not set in API service — notification skipped`); return false; }
        const MSG_BASE = 'https://graph.facebook.com/v18.0';
        const cleanMsg = message.replace(/<[^>]*>/g, '');

        try {
            // 1. Send image receipt if present (non-fatal — text still sends if this fails)
            if (imageUrl) {
                try {
                    log(`🖼️ [Messenger] Sending receipt image to ${platformId}: ${imageUrl}`);
                    await axios.post(`${MSG_BASE}/me/messages?access_token=${MSG_TOKEN}`, {
                        recipient: { id: platformId },
                        message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } },
                        messaging_type: 'MESSAGE_TAG',
                        tag: 'ACCOUNT_UPDATE'
                    });
                } catch (imgErr: any) {
                    log(`⚠️ [Messenger] Receipt image failed (${imgErr.message}) — sending text only`);
                }
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
            return true;
        } catch (err: any) {
            log(`❌ Messenger Notification Error for ${platformId}: ${err.response?.data?.error?.message || err.message}`);
            return false;
        }
    }
    return false;
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

        const { data: accounts } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id, last_message_at')
            .eq('profile_id', referrerId);

        if (!accounts?.length) {
            sendEmail({ to: referrer.email, subject: emailSubject, html: emailHtml }).catch(() => {});
            return;
        }

        let notified = false;
        for (const acct of accounts) {
            if (META_PLATFORMS.includes(acct.platform)) {
                const windowOpen = acct.last_message_at
                    ? (Date.now() - new Date(acct.last_message_at).getTime()) < WINDOW_24H_MS
                    : false;
                if (!windowOpen) continue;
            }
            await sendNotification(acct.platform, acct.platform_id, platformMessage);
            notified = true;
        }
        if (!notified) {
            sendEmail({ to: referrer.email, subject: emailSubject, html: emailHtml }).catch(() => {});
        }
    } catch (err: any) {
        log(`❌ sendReferralNotification error for referrer ${referrerId}: ${err.message}`);
    }
}

type NotifOptions =
    | { label: string; customId?: string; url?: string }[]
    | ((platform: string, platformId: string) => Promise<{ label: string; customId?: string; url?: string }[]>);

export async function routeNotification(
    profileId: string,
    message: string,
    options?: NotifOptions,
    imageUrl?: string | null,
    emailFallback?: () => void | Promise<void>,
    isTransactional: boolean = false
): Promise<void> {
    try {
        const { data: accounts } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id, last_message_at')
            .eq('profile_id', profileId);

        if (!accounts?.length) {
            if (emailFallback) emailFallback();
            return;
        }

        // Pre-fetch image once so each platform doesn't independently hit the receipt endpoint
        let imageBuffer: Buffer | undefined;
        if (imageUrl) {
            try {
                const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
                imageBuffer = Buffer.from(imgRes.data);
            } catch (e: any) {
                log(`⚠️ [routeNotification] Failed to pre-fetch receipt image: ${e.message}`);
            }
        }

        let notified = false;
        for (const acct of accounts) {
            // Transactional notifications bypass the 24h window check for Meta platforms
            // since they are direct responses to user-initiated actions, not unsolicited messages
            if (!isTransactional && META_PLATFORMS.includes(acct.platform)) {
                const windowOpen = acct.last_message_at
                    ? (Date.now() - new Date(acct.last_message_at).getTime()) < WINDOW_24H_MS
                    : false;
                if (!windowOpen) continue;
            }
            const resolvedOptions = typeof options === 'function'
                ? await options(acct.platform, acct.platform_id)
                : options ?? [];
            const delivered = await sendNotification(acct.platform, acct.platform_id, message, resolvedOptions, imageUrl ?? undefined, imageBuffer);
            if (delivered) notified = true;
        }
        if (!notified && emailFallback) {
            emailFallback();
        } else if (!notified) {
            log(`⚠️ [routeNotification] No active platform windows for ${profileId} — notification skipped`);
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
