import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { sendNotification, routeNotification, recordNotification, sendReferralNotification } from '../services/notifications';
import { sendPaymentConfirmedEmail } from '../services/email';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

/**
 * Verify that the webhook-reported amount is within 2% of the expected transaction amount.
 * Allows for minor FX conversion rounding differences.
 */
function amountMatches(reported: number, expected: number): boolean {
    if (!reported || !expected) return false;
    const diff = Math.abs(reported - expected) / expected;
    return diff <= 0.02; // 2% tolerance
}

router.post('/opay/webhook', async (req, res) => {
    try {
        const opayPublicKey = process.env.OPAY_PUBLIC_KEY;
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const authHeader = (req.headers['authorization'] as string || '').replace(/^Bearer\s+/i, '');

        // Verify HMAC-SHA512 signature (OPay signs body with merchant public key)
        if (!opayPublicKey) {
            console.error('❌ [OPay Webhook] OPAY_PUBLIC_KEY not set — rejecting request');
            return res.status(503).send('Webhook signing key not configured');
        }
        const expected = crypto.createHmac('sha512', opayPublicKey).update(rawBody).digest('hex');
        if (!authHeader || !crypto.timingSafeEqual(Buffer.from(authHeader.toLowerCase()), Buffer.from(expected.toLowerCase()))) {
            console.error('❌ [OPay Webhook] Signature mismatch');
            return res.status(401).send('Unauthorized');
        }

        const data = req.body;

        console.log('📦 OPay Webhook Received:', JSON.stringify(data));

        // Basic verification logic:
        // OPay status 'SUCCESSFUL' or '0000'
        if (data.status === 'SUCCESSFUL' || data.code === '00000' || data.code === '0000') {
            const reference = data.reference || (data.data && data.data.reference);
            if (!reference) return res.status(400).send('No reference');

            const txnCode = reference.split('_')[0];

            // Find transaction
            const { data: txn, error } = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                .eq('txn_code', txnCode)
                .single();

            // Verify gateway-reported amount matches expected amount
            const reportedAmount = Number(data.amount || (data.data && data.data.amount) || 0);
            if (reportedAmount > 0 && !amountMatches(reportedAmount, Number(txn?.total_amount || 0))) {
                console.error(`❌ [OPay Webhook] Amount mismatch for ${txnCode}: reported=${reportedAmount}, expected=${txn?.total_amount}`);
                return res.status(400).send('Amount mismatch');
            }

            if (txn && txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                // Update status to PAID and record payment gateway
                await supabase.from('transactions').update({
                    status: 'PAID',
                    metadata: { ...(txn.metadata || {}), payment_gateway: 'OPay' }
                }).eq('id', txn.id);

                console.log(`✅ [OPay Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via OPay`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify Seller
                const sellerMsg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;
                routeNotification(txn.seller_id, sellerMsg, [
                    { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                    { label: '🔄 New Transaction', customId: 'create_txn' },
                    { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                ], receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Seller Notif Error:', e));
                recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via OPay`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
            }
        }

        res.status(200).send('OK');
    } catch (err: any) {
        console.error('❌ Webhook Error:', err.message);
        res.status(500).send('Internal Error');
    }
});
router.post('/airwallex/webhook', async (req, res) => {
    try {
        const airwallexWebhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET;
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const timestamp = req.headers['x-timestamp'] as string;
        const signature = req.headers['x-signature'] as string;

        // Verify HMAC-SHA256 signature (Airwallex signs timestamp + body with webhook secret)
        if (!airwallexWebhookSecret) {
            console.error('❌ [Airwallex Webhook] AIRWALLEX_WEBHOOK_SECRET not set — rejecting request');
            return res.status(503).send('Webhook signing key not configured');
        }
        if (!timestamp || !signature) {
            console.error('❌ [Airwallex Webhook] Missing signature headers');
            return res.status(401).send('Unauthorized');
        }
        const airwallexExpected = crypto
            .createHmac('sha256', airwallexWebhookSecret)
            .update(`${timestamp}${rawBody}`)
            .digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(airwallexExpected))) {
            console.error('❌ [Airwallex Webhook] Signature mismatch');
            return res.status(401).send('Unauthorized');
        }

        const event = req.body;
        console.log('📦 Airwallex Webhook Received:', event.name);

        if (event.name === 'payment_intent.succeeded') {
            const pi = event.data.object;
            const txnCode = pi.merchant_order_id;

            if (!txnCode) return res.status(400).send('No merchant_order_id');

            const { data: txn, error } = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                .eq('txn_code', txnCode)
                .single();

            // Verify reported amount
            const reportedAmount = Number(pi.amount || 0);
            if (txn && reportedAmount > 0 && !amountMatches(reportedAmount, Number(txn.total_amount || 0))) {
                console.error(`❌ [Airwallex Webhook] Amount mismatch for ${txnCode}: reported=${reportedAmount}, expected=${txn.total_amount}`);
                return res.status(400).send('Amount mismatch');
            }

            if (txn && txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                await supabase.from('transactions').update({
                    status: 'PAID',
                    metadata: { ...(txn.metadata || {}), payment_gateway: 'Airwallex' }
                }).eq('id', txn.id);

                console.log(`✅ [Airwallex Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via Airwallex`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify Seller
                const sellerMsg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;
                routeNotification(txn.seller_id, sellerMsg, [
                    { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                    { label: '🔄 New Transaction', customId: 'create_txn' },
                    { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                ], receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Seller Notif Error:', e));
                recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via Airwallex`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
            }
        }

        res.status(200).send('OK');
    } catch (err: any) {
        console.error('❌ Airwallex Webhook Error:', err.message);
        res.status(500).send('Internal Error');
    }
});

router.post('/chainrails/webhook', async (req, res) => {
    try {
        const webhookSecret = process.env.CHAINRAILS_WEBHOOK_SECRET;
        const signature = req.headers['x-chainrails-signature'] as string;
        const timestamp = req.headers['x-chainrails-timestamp'] as string;

        if (!webhookSecret) {
            console.error('❌ [ChainRails Webhook] CHAINRAILS_WEBHOOK_SECRET not set — rejecting request');
            return res.status(503).send('Webhook signing key not configured');
        }
        if (!signature || !timestamp) {
            console.error('❌ [ChainRails Webhook] Missing signature headers');
            return res.status(401).send('Unauthorized');
        }
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const expectedSig = crypto
            .createHmac('sha256', webhookSecret)
            .update(`${timestamp}.${rawBody}`)
            .digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
            console.error('❌ [ChainRails Webhook] Signature mismatch');
            return res.status(401).send('Unauthorized');
        }

        const event = req.body;
        console.log(`📦 [ChainRails Webhook] Event: ${event.type} | Intent: ${event.data?.id}`);

        // Only act on final settlement
        if (event.type === 'intent.completed') {
            const intent = event.data;
            const intentId = intent?.id;

            if (!intentId) {
                console.warn('⚠️ [ChainRails] Webhook missing intent ID');
                return res.status(200).send('OK');
            }

            const { data: txn } = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                .eq('metadata->>chainrails_session_id', intentId)
                .single();

            if (!txn) {
                console.error(`❌ [ChainRails] Transaction for session ${intentId} not found`);
                return res.status(200).send('OK');
            }

            // Verify reported amount (ChainRails amount is in smallest unit / decimal — accept if present)
            const reportedChainAmount = Number(intent.amount || 0);
            if (reportedChainAmount > 0 && !amountMatches(reportedChainAmount, Number(txn.total_amount || 0))) {
                console.error(`❌ [ChainRails] Amount mismatch for ${txn.txn_code}: reported=${reportedChainAmount}, expected=${txn.total_amount}`);
                return res.status(400).send('Amount mismatch');
            }

            if (txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                await supabase.from('transactions').update({
                    status: 'PAID',
                    metadata: {
                        ...(txn.metadata || {}),
                        payment_gateway: 'ChainRails',
                        chainrails_intent_id: intent.id,
                        chainrails_tx_hash: intent.tx_hash
                    }
                }).eq('id', txn.id);

                console.log(`✅ [ChainRails] Transaction ${txn.txn_code} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify buyer
                const buyerMsg = `✅ <b>Crypto Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔗 Gateway: <b>ChainRails (Crypto)</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Crypto Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via ChainRails`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify seller
                const sellerMsg = `🔐 <b>Crypto Payment Received!</b>\n\nThe buyer has made a crypto payment — funds are secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ You can now proceed to fulfill the order.\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery before requesting release.`;
                routeNotification(txn.seller_id, sellerMsg, [
                    { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                    { label: '🔄 New Transaction', customId: 'create_txn' },
                    { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                ], receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Seller Notif Error:', e));
                recordNotification(txn.seller_id, 'payment', '🔐 Crypto Payment Received', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via ChainRails`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
            } else {
                console.log(`ℹ️ [ChainRails] ${txn.txn_code} already ${txn.status}, skipping.`);
            }
        }

        res.status(200).send('OK');
    } catch (err: any) {
        console.error('❌ [ChainRails Webhook] Fatal error:', err.message);
        res.status(500).send('Internal Error');
    }
});

router.post('/flutterwave/webhook', async (req, res) => {
    try {
        const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
        const signature = req.headers['verif-hash'];

        // Detailed logging for debugging
        console.log('📩 [Flutterwave Webhook] Signal Received at', new Date().toISOString());
        console.log('📦 [Flutterwave Webhook] Headers:', JSON.stringify(req.headers));
        console.log('📦 [Flutterwave Webhook] Body:', JSON.stringify(req.body));

        if (!secretHash) {
            console.error('❌ [Flutterwave Webhook] FLUTTERWAVE_WEBHOOK_HASH not set — rejecting request');
            return res.status(503).send('Webhook signing key not configured');
        }
        if (!signature || !crypto.timingSafeEqual(Buffer.from(signature as string), Buffer.from(secretHash))) {
            console.error('❌ [Flutterwave Webhook] Signature Mismatch');
            return res.status(401).send('Unauthorized');
        }

        const { event, data } = req.body;
        console.log(`📦 Flutterwave Event: ${event} | Reference: ${data?.tx_ref} | Status: ${data?.status}`);

        if (event === 'charge.completed' || event === 'transfer.completed') {
            const txRef = data.tx_ref;
            if (!txRef) {
                console.warn('⚠️ Webhook received without tx_ref');
                return res.status(200).send('OK (No ref)');
            }

            // Community license upgrade payment
            if (txRef.startsWith('UPLG-')) {
                // Format: UPLG-{32hexChars}-{tier}-{timestamp}
                const parts = txRef.split('-');
                const rawGroupId = parts[1];
                const targetTier = parts[2];
                if (rawGroupId?.length === 32 && ['pro', 'enterprise'].includes(targetTier)) {
                    const groupId = `${rawGroupId.slice(0,8)}-${rawGroupId.slice(8,12)}-${rawGroupId.slice(12,16)}-${rawGroupId.slice(16,20)}-${rawGroupId.slice(20)}`;

                    // Read share and duration from platform_settings
                    const shareRow = await supabase.from('platform_settings').select('value').eq('key', `community_${targetTier}_revenue_share`).maybeSingle();
                    const shareDefaults: Record<string, number> = { pro: 25, enterprise: 40 };
                    const newShare = shareRow.data?.value ? Number(shareRow.data.value) : (shareDefaults[targetTier] ?? 25);

                    const durRow = await supabase.from('platform_settings').select('value').eq('key', `community_${targetTier}_duration_days`).maybeSingle();
                    const durationDays = durRow.data?.value ? Number(durRow.data.value) : 30;
                    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

                    const { data: group } = await supabase
                        .from('community_groups')
                        .update({
                            license_tier: targetTier,
                            admin_revenue_share_percent: newShare,
                            license_expires_at: expiresAt,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', groupId)
                        .select()
                        .single();
                    if (group) {
                        console.log(`✅ [Upgrade] "${group.group_name}" upgraded to ${targetTier}, expires ${expiresAt}`);
                        const tierName = targetTier.charAt(0).toUpperCase() + targetTier.slice(1);
                        const expiryStr = new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        const platformMsg =
                            `🎉 <b>License Upgraded!</b>\n\n` +
                            `Your group <b>${group.group_name}</b> is now on the <b>${tierName}</b> plan.\n\n` +
                            `💰 Revenue share: <b>${newShare}%</b> of every platform fee earned in your group.\n` +
                            `📅 Expires: <b>${expiryStr}</b>\n\n` +
                            `Keep growing your community! 🚀`;
                        const emailHtml =
                            `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">` +
                            `<h2 style="color:#0f172a;">🎉 License Upgraded to ${tierName}!</h2>` +
                            `<p><b>${group.group_name}</b> is now on the ${tierName} plan.</p>` +
                            `<p>Revenue share: <b>${newShare}%</b> of every platform fee earned in your group.</p>` +
                            `<p>License expires: <b>${expiryStr}</b></p>` +
                            `<p style="color:#64748b;font-size:13px;">Keep growing your Safeeely community! 🚀</p>` +
                            `</div>`;
                        sendReferralNotification(
                            group.admin_profile_id,
                            platformMsg,
                            `License upgraded to ${tierName} — ${group.group_name}`,
                            emailHtml
                        ).catch(e => console.error('Upgrade notification error:', e));
                    }
                } else {
                    console.warn(`⚠️ [Upgrade] Malformed UPLG tx_ref: ${txRef}`);
                }
                return res.status(200).send('OK');
            }

            // Community license renewal payment
            if (txRef.startsWith('RNWL-')) {
                // Format: RNWL-{32hexChars}-{tier}-{timestamp}
                const parts = txRef.split('-');
                const rawGroupId = parts[1];
                const tier = parts[2];
                if (rawGroupId?.length === 32 && ['pro', 'enterprise'].includes(tier)) {
                    const groupId = `${rawGroupId.slice(0,8)}-${rawGroupId.slice(8,12)}-${rawGroupId.slice(12,16)}-${rawGroupId.slice(16,20)}-${rawGroupId.slice(20)}`;

                    const { data: group } = await supabase
                        .from('community_groups')
                        .select('*')
                        .eq('id', groupId)
                        .single();

                    if (group) {
                        const durRow = await supabase.from('platform_settings').select('value').eq('key', `community_${tier}_duration_days`).maybeSingle();
                        const durationDays = durRow.data?.value ? Number(durRow.data.value) : 30;

                        // Extend from current expiry if still in future, otherwise from now
                        const base = group.license_expires_at && new Date(group.license_expires_at) > new Date()
                            ? new Date(group.license_expires_at) : new Date();
                        const newExpiry = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

                        await supabase
                            .from('community_groups')
                            .update({ license_expires_at: newExpiry, updated_at: new Date().toISOString() })
                            .eq('id', groupId);

                        console.log(`✅ [Renewal] "${group.group_name}" renewed, new expiry: ${newExpiry}`);
                        const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
                        const expiryStr = new Date(newExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        const platformMsg =
                            `✅ <b>License Renewed!</b>\n\n` +
                            `Your <b>${group.group_name}</b> ${tierName} license has been renewed.\n\n` +
                            `📅 New expiry: <b>${expiryStr}</b>\n\n` +
                            `Thank you for staying with Safeeely! 🚀`;
                        const emailHtml =
                            `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">` +
                            `<h2 style="color:#0f172a;">✅ License Renewed!</h2>` +
                            `<p><b>${group.group_name}</b> ${tierName} license renewed successfully.</p>` +
                            `<p>New expiry: <b>${expiryStr}</b></p>` +
                            `<p style="color:#64748b;font-size:13px;">Thank you for staying with Safeeely! 🚀</p>` +
                            `</div>`;
                        sendReferralNotification(
                            group.admin_profile_id,
                            platformMsg,
                            `License renewed — ${group.group_name} (expires ${expiryStr})`,
                            emailHtml
                        ).catch(e => console.error('Renewal notification error:', e));
                    }
                } else {
                    console.warn(`⚠️ [Renewal] Malformed RNWL tx_ref: ${txRef}`);
                }
                return res.status(200).send('OK');
            }

            const txnCode = txRef.split('_')[0];
            console.log(`🔍 Processing payment for Transaction Code: ${txnCode}`);

            // Find transaction
            const { data: txn, error } = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                .eq('txn_code', txnCode)
                .single();

            if (error || !txn) {
                console.error(`❌ Transaction ${txnCode} not found in database`);
                return res.status(200).send('OK');
            }

            // Verify Flutterwave-reported amount matches expected amount
            const flwAmount = Number(data.amount || 0);
            if (flwAmount > 0 && !amountMatches(flwAmount, Number(txn.total_amount || 0))) {
                console.error(`❌ [Flutterwave Webhook] Amount mismatch for ${txnCode}: reported=${flwAmount}, expected=${txn.total_amount}`);
                return res.status(400).send('Amount mismatch');
            }

            if (txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                await supabase.from('transactions').update({
                    status: 'PAID',
                    metadata: { ...(txn.metadata || {}), payment_gateway: 'Flutterwave', flw_id: data.id }
                }).eq('id', txn.id);

                console.log(`✅ [Flutterwave Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via Flutterwave`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify Seller
                const sellerMsg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;
                routeNotification(txn.seller_id, sellerMsg, [
                    { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                    { label: '🔄 New Transaction', customId: 'create_txn' },
                    { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                ], receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined).catch(e => console.error('Seller Notif Error:', e));
                recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via Flutterwave`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
            } else {
                console.log(`ℹ️ Transaction ${txnCode} is already marked as ${txn.status}. Skipping notification.`);
            }
        }

        res.status(200).send('Webhook Received');
    } catch (err: any) {
        console.error('🔥 Flutterwave Webhook Fatal Error:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
