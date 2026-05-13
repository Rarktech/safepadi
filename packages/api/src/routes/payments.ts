import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { sendNotification, recordNotification, sendReferralNotification } from '../services/notifications';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

router.post('/opay/webhook', async (req, res) => {
    try {
        const secretKey = process.env.OPAY_SECRET_KEY;
        const signature = req.headers['opay-signature'] || req.headers['authorization'];

        // Verify signature if possible (OPay sends it in headers)
        // For now, we'll process it and verify the reference exists

        const { payload, status } = req.body; // OPay webhook format
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
                const { data: buyerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.buyer_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (buyerLinked) {
                    console.log(`[OPay] Notifying Buyer ${txn.buyer_id} on ${buyerLinked.platform}`);
                    const buyerMsg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;

                    await sendNotification(buyerLinked.platform, buyerLinked.platform_id, buyerMsg, [
                        { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                        { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                        { label: '🔙 Main Menu', customId: 'main_menu' }
                    ], receiptUrl).catch(e => console.error('Buyer Notif Error:', e));
                    recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via OPay`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                }

                // Notify Seller
                const { data: sellerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.seller_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (sellerLinked) {
                    console.log(`[OPay] Notifying Seller ${txn.seller_id} on ${sellerLinked.platform}`);
                    const sellerMsg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;

                    await sendNotification(sellerLinked.platform, sellerLinked.platform_id, sellerMsg, [
                        { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                        { label: '🔄 New Transaction', customId: 'create_txn' },
                        { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                    ], receiptUrl).catch(e => console.error('Seller Notif Error:', e));
                    recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via OPay`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                }
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
        const event = req.body;
        console.log('📦 Airwallex Webhook Received:', event.name);

        if (event.name === 'payment_intent.succeeded') {
            const pi = event.data.object;
            const txnCode = pi.merchant_order_id; // we set this earlier

            if (!txnCode) return res.status(400).send('No merchant_order_id');

            // Find transaction
            const { data: txn, error } = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                .eq('txn_code', txnCode)
                .single();

            if (txn && txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                // Update status to PAID and record payment gateway
                await supabase.from('transactions').update({ 
                    status: 'PAID',
                    metadata: { ...(txn.metadata || {}), payment_gateway: 'Airwallex' }
                }).eq('id', txn.id);

                console.log(`✅ [Airwallex Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const { data: buyerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.buyer_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (buyerLinked) {
                    console.log(`[Airwallex] Notifying Buyer ${txn.buyer_id} on ${buyerLinked.platform}`);
                    const msg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;

                    await sendNotification(buyerLinked.platform, buyerLinked.platform_id, msg, [
                        { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                        { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                        { label: '🔙 Main Menu', customId: 'main_menu' }
                    ], receiptUrl).catch(e => console.error('Buyer Notif Error:', e));
                    recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via Airwallex`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                }

                // Notify Seller
                const { data: sellerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.seller_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (sellerLinked) {
                    console.log(`[Airwallex] Notifying Seller ${txn.seller_id} on ${sellerLinked.platform}`);
                    const msg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;

                    await sendNotification(sellerLinked.platform, sellerLinked.platform_id, msg, [
                        { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                        { label: '🔄 New Transaction', customId: 'create_txn' },
                        { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                    ], receiptUrl).catch(e => console.error('Seller Notif Error:', e));
                    recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via Airwallex`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                }
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

        if (webhookSecret && signature && timestamp) {
            const rawBody = (req as any).rawBody || JSON.stringify(req.body);
            const expectedSig = crypto
                .createHmac('sha256', webhookSecret)
                .update(`${timestamp}.${rawBody}`)
                .digest('hex');

            if (signature !== expectedSig) {
                console.error('❌ [ChainRails Webhook] Signature mismatch');
                return res.status(401).send('Unauthorized');
            }
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

                console.log(`✅ [ChainRails] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify buyer
                const { data: buyerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.buyer_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (buyerLinked) {
                    const buyerMsg = `✅ <b>Crypto Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔗 Gateway: <b>ChainRails (Crypto)</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;

                    await sendNotification(buyerLinked.platform, buyerLinked.platform_id, buyerMsg, [
                        { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                        { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                        { label: '🔙 Main Menu', customId: 'main_menu' }
                    ], receiptUrl).catch(e => console.error('Buyer Notif Error:', e));
                    recordNotification(txn.buyer_id, 'payment', '✅ Crypto Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via ChainRails`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                }

                // Notify seller
                const { data: sellerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.seller_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (sellerLinked) {
                    const sellerMsg = `🔐 <b>Crypto Payment Received!</b>\n\nThe buyer has made a crypto payment — funds are secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ You can now proceed to fulfill the order.\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery before requesting release.`;

                    await sendNotification(sellerLinked.platform, sellerLinked.platform_id, sellerMsg, [
                        { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                        { label: '🔄 New Transaction', customId: 'create_txn' },
                        { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                    ], receiptUrl).catch(e => console.error('Seller Notif Error:', e));
                    recordNotification(txn.seller_id, 'payment', '🔐 Crypto Payment Received', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via ChainRails`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                }
            } else {
                console.log(`ℹ️ [ChainRails] ${txnCode} already ${txn.status}, skipping.`);
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

        if (secretHash && signature !== secretHash) {
            console.error('❌ [Flutterwave Webhook] Signature Mismatch');
            console.error(`  -> Expected: ${secretHash}`);
            console.error(`  -> Received: ${signature}`);
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
                    const revenueShareMap: Record<string, number> = { free: 10, pro: 25, enterprise: 40 };
                    const { data: group } = await supabase
                        .from('community_groups')
                        .update({
                            license_tier: targetTier,
                            admin_revenue_share_percent: revenueShareMap[targetTier],
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', groupId)
                        .select()
                        .single();
                    if (group) {
                        console.log(`✅ [Upgrade] "${group.group_name}" upgraded to ${targetTier}`);
                        const tierName = targetTier.charAt(0).toUpperCase() + targetTier.slice(1);
                        const platformMsg =
                            `🎉 <b>License Upgraded!</b>\n\n` +
                            `Your group <b>${group.group_name}</b> is now on the <b>${tierName}</b> plan.\n\n` +
                            `💰 New revenue share: <b>${revenueShareMap[targetTier]}%</b> of every platform fee earned in your group.\n\n` +
                            `Keep growing your community! 🚀`;
                        const emailHtml =
                            `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">` +
                            `<h2 style="color:#0f172a;">🎉 License Upgraded to ${tierName}!</h2>` +
                            `<p><b>${group.group_name}</b> is now on the ${tierName} plan.</p>` +
                            `<p>Revenue share: <b>${revenueShareMap[targetTier]}%</b> of every platform fee earned in your group.</p>` +
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

            if (txn.status !== 'PAID' && txn.status !== 'FINALIZED') {
                // Update status to PAID
                await supabase.from('transactions').update({ 
                    status: 'PAID',
                    metadata: { ...(txn.metadata || {}), payment_gateway: 'Flutterwave', flw_id: data.id }
                }).eq('id', txn.id);

                console.log(`✅ [Flutterwave Webhook] Transaction ${txnCode} marked as PAID`);

                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

                // Notify Buyer
                const { data: buyerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.buyer_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (buyerLinked) {
                    console.log(`[Flutterwave] Notifying Buyer ${txn.buyer_id} on ${buyerLinked.platform}`);
                    const msg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;

                    await sendNotification(buyerLinked.platform, buyerLinked.platform_id, msg, [
                        { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                        { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                        { label: '🔙 Main Menu', customId: 'main_menu' }
                    ], receiptUrl).catch(e => console.error('Buyer Notif Error:', e));
                    recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow via Flutterwave`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                } else {
                    console.warn(`[Flutterwave] No linked account found for buyer ${txn.buyer_id}`);
                }

                // Notify Seller
                const { data: sellerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.seller_id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (sellerLinked) {
                    console.log(`[Flutterwave] Notifying Seller ${txn.seller_id} on ${sellerLinked.platform}`);
                    const msg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer?.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;

                    await sendNotification(sellerLinked.platform, sellerLinked.platform_id, msg, [
                        { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                        { label: '🔄 New Transaction', customId: 'create_txn' },
                        { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
                    ], receiptUrl).catch(e => console.error('Seller Notif Error:', e));
                    recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} via Flutterwave`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
                } else {
                    console.warn(`[Flutterwave] No linked account found for seller ${txn.seller_id}`);
                }
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
