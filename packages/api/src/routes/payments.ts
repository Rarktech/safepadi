import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { sendNotification } from '../services/notifications';
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
            const txnCode = intent?.metadata?.txn_code;

            if (!txnCode) {
                console.warn('⚠️ [ChainRails] Webhook missing txn_code in metadata');
                return res.status(200).send('OK');
            }

            const { data: txn } = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                .eq('txn_code', txnCode)
                .single();

            if (!txn) {
                console.error(`❌ [ChainRails] Transaction ${txnCode} not found`);
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
