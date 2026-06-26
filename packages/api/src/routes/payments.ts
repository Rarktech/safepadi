import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { sendNotification, routeNotification, recordNotification, sendReferralNotification } from '../services/notifications';
import { sendPaymentConfirmedEmail } from '../services/email';
import { queryAndSyncStatus } from '../services/payout';
import * as palmPayProvider from '../services/providers/palmPay';
import crypto from 'crypto';
import axios from 'axios';
import { track } from '../lib/posthog';

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

function buildSellerPaidMsg(txn: any): string {
    const isMilestone = txn.transaction_type === 'MILESTONE';
    const isBuyerInitiated = txn.initiator_safetag === txn.buyer?.safetag;

    let deliveryTips: string;
    if (isMilestone) {
        deliveryTips = `• 🪜 Document each milestone phase separately with screenshots\n• 📝 Get written sign-off from the buyer after each completed phase\n• 🎥 Record a short walkthrough of each deliverable\n• 💬 Keep all milestone-related messages for your records`;
    } else if (isBuyerInitiated) {
        deliveryTips = `• 🎥 Record a video of the item before and during packaging\n• 📦 Obtain a shipping receipt with a tracking number\n• ✍️ Request delivery confirmation or a signature on arrival\n• 🚫 Never mark complete until the buyer physically receives it`;
    } else {
        deliveryTips = `• 🎥 Screen-record or screenshot your completed deliverable\n• 📝 Get written confirmation from the buyer before marking done\n• 💼 Export and save a copy of all work you have done\n• 🔗 Share live links or portfolio URLs as additional proof`;
    }

    return `🔐 <b>Payment Received and Held Securely!</b>\n\n<code>${txn.buyer?.safetag}</code> has paid <b>${txn.amount} ${txn.currency}</b> — funds are locked in escrow and will release once you confirm delivery.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction: <b>${txn.txn_code}</b>\n💰 Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n🛒 Item: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 <b>How to Deliver &amp; Protect Yourself:</b>\n${deliveryTips}\n\n⚠️ <b>No proof = no protection.</b> If the buyer disputes your delivery and you have no documented evidence, funds may be automatically returned to them. Document everything.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

function buildSellerPaidButtons(txn: any): Array<{ label: string; customId?: string; url?: string }> {
    const frontendUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
    if (txn.transaction_type === 'MILESTONE') {
        return [
            { label: '🪜 Manage Milestones', customId: `view_txn_details|${txn.id}` },
            { label: '💸 Refund Buyer',      customId: `txn_refund_initiate|${txn.id}` },
            { label: '📖 View Guidelines',   url: `${frontendUrl}/guides/delivery` }
        ];
    }
    return [
        { label: '✅ Mark as Delivered',  customId: `txn_action_complete_prompt|${txn.id}` },
        { label: '💸 Refund Buyer',       customId: `txn_refund_initiate|${txn.id}` },
        { label: '📖 View Guidelines',    url: `${frontendUrl}/guides/delivery` }
    ];
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

                if (txn.buyer?.safetag) {
                    track(txn.buyer.safetag, 'payment_succeeded', {
                        transaction_id: txn.id,
                        provider: 'opay',
                        amount: txn.total_amount,
                        currency: txn.currency,
                    });
                }

                console.log(`✅ [OPay Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via OPay`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify Seller
                routeNotification(txn.seller_id, buildSellerPaidMsg(txn), buildSellerPaidButtons(txn), receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Seller Notif Error:', e));
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

                if (txn.buyer?.safetag) {
                    track(txn.buyer.safetag, 'payment_succeeded', {
                        transaction_id: txn.id,
                        provider: 'airwallex',
                        amount: txn.total_amount,
                        currency: txn.currency,
                    });
                }

                console.log(`✅ [Airwallex Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via Airwallex`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify Seller
                routeNotification(txn.seller_id, buildSellerPaidMsg(txn), buildSellerPaidButtons(txn), receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Seller Notif Error:', e));
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

                if (txn.buyer?.safetag) {
                    track(txn.buyer.safetag, 'crypto_payment_confirmed', {
                        transaction_id: txn.id,
                        provider: 'chainrails',
                        amount: txn.total_amount,
                        currency: txn.currency,
                    });
                }

                console.log(`✅ [ChainRails] Transaction ${txn.txn_code} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify buyer
                const buyerMsg = `✅ <b>Crypto Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔗 Gateway: <b>ChainRails (Crypto)</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Crypto Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via ChainRails`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify seller
                routeNotification(txn.seller_id, buildSellerPaidMsg(txn), buildSellerPaidButtons(txn), receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Seller Notif Error:', e));
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

        // Detect v3 ({ event, data }) vs v2 flat format ({ txRef, status, 'event.type' })
        const isV3 = !!(req.body.event && req.body.data);
        const txRef: string     = isV3 ? req.body.data?.tx_ref          : req.body.txRef;
        const status: string    = isV3 ? req.body.data?.status           : req.body.status;
        const flwAmount: number = isV3 ? Number(req.body.data?.amount || 0) : Number(req.body.amount || 0);
        const flwId: number     = isV3 ? req.body.data?.id               : req.body.id;

        console.log(`📦 Flutterwave Payment: Reference: ${txRef} | Status: ${status} | Amount: ${flwAmount}`);

        if (status === 'successful') {
            if (!txRef) {
                console.warn('⚠️ Webhook received without txRef');
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
                        const { data: adminProfile } = await supabase.from('profiles').select('safetag').eq('id', group.admin_profile_id).maybeSingle();
                        if (adminProfile?.safetag) {
                            track(adminProfile.safetag, 'license_upgraded', {
                                license_tier: targetTier,
                                admin_revenue_share: newShare,
                                community_id: group.id,
                            });
                        }
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
            if (flwAmount > 0 && !amountMatches(flwAmount, Number(txn.total_amount || 0))) {
                console.error(`❌ [Flutterwave Webhook] Amount mismatch for ${txnCode}: reported=${flwAmount}, expected=${txn.total_amount}`);
                return res.status(400).send('Amount mismatch');
            }

            if (txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                await supabase.from('transactions').update({
                    status: 'PAID',
                    metadata: { ...(txn.metadata || {}), payment_gateway: 'Flutterwave', flw_id: flwId }
                }).eq('id', txn.id);

                if (txn.buyer?.safetag) {
                    track(txn.buyer.safetag, 'payment_succeeded', {
                        transaction_id: txn.id,
                        provider: 'flutterwave',
                        amount: txn.total_amount,
                        currency: txn.currency,
                    });
                }

                console.log(`✅ [Flutterwave Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;
                routeNotification(txn.buyer_id, buyerMsg, [
                    { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ], receiptUrl, txn.buyer?.email ? () => sendPaymentConfirmedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Buyer Notif Error:', e));
                recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via Flutterwave`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});

                // Notify Seller
                routeNotification(txn.seller_id, buildSellerPaidMsg(txn), buildSellerPaidButtons(txn), receiptUrl, txn.seller?.email ? () => sendPaymentConfirmedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id }) : undefined, true).catch(e => console.error('Seller Notif Error:', e));
                recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via Flutterwave`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
            } else {
                console.log(`ℹ️ Transaction ${txnCode} is already marked as ${txn.status}. Skipping notification.`);
            }
        }

        // Handle transfer (payout) completion events
        const eventType: string = isV3 ? (req.body.event || '') : (req.body['event.type'] || '');
        if (eventType === 'transfer.completed' || eventType === 'transfer.failed') {
            const reference: string = isV3 ? (req.body.data?.reference || '') : (req.body.reference || '');
            if (reference) {
                const { data: withdrawal } = await supabase
                    .from('withdrawals')
                    .select('id')
                    .eq('idempotency_key', reference)   // Flutterwave echoes back our orderId (UUID), not WD-* reference
                    .maybeSingle();
                if (withdrawal) {
                    await queryAndSyncStatus(withdrawal.id).catch(e =>
                        console.error('[Flutterwave] Transfer status sync error:', e.message)
                    );
                    console.log(`[Flutterwave] Transfer webhook ${eventType} for ${reference} — synced`);
                }
            }
            return res.status(200).send('OK');
        }

        res.status(200).send('Webhook Received');
    } catch (err: any) {
        console.error('🔥 Flutterwave Webhook Fatal Error:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// PalmPay payout status webhook (activated when PALMPAY_APP_ID is configured)
router.post('/palmpay/payout-webhook', async (req, res) => {
    try {
        const signature = req.headers['sign'] as string || req.headers['x-sign'] as string || '';
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);

        if (!palmPayProvider.isConfigured()) {
            console.warn('[PalmPay Webhook] Provider not configured — rejecting');
            return res.status(503).send('Not configured');
        }

        if (!palmPayProvider.verifyWebhook(rawBody, signature)) {
            console.error('[PalmPay Webhook] Signature verification failed');
            return res.status(401).send('Unauthorized');
        }

        const body = req.body;
        const orderId: string = body.orderId || body.data?.orderId || '';
        const palmpayStatus: string = (body.orderStatus || body.data?.orderStatus || body.status || '').toUpperCase();
        const failureReason: string = body.failureReason || body.data?.failureReason || '';

        if (!orderId) {
            console.warn('[PalmPay Webhook] No orderId in body');
            return res.json({ respCode: '00000000' });
        }

        const { data: withdrawal } = await supabase
            .from('withdrawals')
            .select('id, profile_id, amount, currency, reference, profile:profile_id(safetag)')
            .eq('idempotency_key', orderId)
            .maybeSingle();

        if (!withdrawal) {
            console.warn(`[PalmPay Webhook] No withdrawal found for orderId=${orderId}`);
            return res.json({ respCode: '00000000' });
        }

        const withdrawalLinkUrl = (withdrawal.profile as any)?.safetag
            ? `/withdraw/${encodeURIComponent((withdrawal.profile as any).safetag)}?view=withdraw`
            : '/login';

        if (palmpayStatus === 'SUCCESS' || palmpayStatus === 'SUCCESSFUL') {
            await supabase.from('withdrawals').update({
                status: 'PAID',
                provider_order_no: body.data?.orderNo || orderId,
                settled_at: new Date().toISOString(),
            }).eq('id', withdrawal.id);

            const msg = `✅ <b>Withdrawal Successful!</b>\n\n<b>${withdrawal.amount} ${withdrawal.currency}</b> has been sent to your payout method.\n\n📋 Reference: <b>${withdrawal.reference}</b>`;
            routeNotification(withdrawal.profile_id, msg, []).catch(() => {});
            recordNotification(withdrawal.profile_id, 'withdrawal', '✅ Withdrawal Successful', `${withdrawal.amount} ${withdrawal.currency} sent`, { withdrawal_id: withdrawal.id, amount: withdrawal.amount, currency: withdrawal.currency, reference: withdrawal.reference, link_url: withdrawalLinkUrl }).catch(() => {});
            console.log(`[PalmPay Webhook] ${withdrawal.reference} → PAID`);
        } else if (palmpayStatus === 'FAIL' || palmpayStatus === 'FAILED') {
            await supabase.from('withdrawals').update({
                status: 'FAILED',
                failure_reason: failureReason || 'PalmPay reported failure',
            }).eq('id', withdrawal.id);

            const msg = `❌ <b>Withdrawal Failed</b>\n\nYour withdrawal of <b>${withdrawal.amount} ${withdrawal.currency}</b> could not be processed.\n\n📝 Reason: ${failureReason || 'Provider error'}\n\nPlease contact support or retry.`;
            routeNotification(withdrawal.profile_id, msg, []).catch(() => {});
            recordNotification(withdrawal.profile_id, 'withdrawal', '❌ Withdrawal Failed', `${withdrawal.amount} ${withdrawal.currency}`, { withdrawal_id: withdrawal.id, link_url: withdrawalLinkUrl }).catch(() => {});
            console.log(`[PalmPay Webhook] ${withdrawal.reference} → FAILED: ${failureReason}`);
        }

        // PalmPay requires this exact response to acknowledge
        res.json({ respCode: '00000000' });
    } catch (err: any) {
        console.error('[PalmPay Webhook] Error:', err.message);
        res.status(500).send('Internal Error');
    }
});

export default router;
