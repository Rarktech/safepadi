import { supabase } from '@safepal/shared';
import { routeNotification } from '../services/notifications';
import { sendPaymentReminderEmail, sendSellerAcceptanceReminderEmail, sendSellerDeliveryReminderEmail, sendReceiptConfirmationReminderEmail } from '../services/email';
import axios from 'axios';

const log = (msg: string) => console.log(`[TransactionReminders] ${msg}`);

export async function runTransactionReminders(): Promise<void> {
    log('Starting...');

    const joinSelect = '*, buyer:buyer_id(id, safetag, email), seller:seller_id(id, safetag, email)';

    // Bucket 1: Seller acceptance reminder — 24-48h after creation
    try {
        const { data: b1 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'PENDING_SELLER_ACCEPTANCE')
            .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .gt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

        for (const txn of b1 || []) {
            const sellerMsg = `⏳ <b>Pending Transaction Request</b>\n\nYou have a pending trade request for <b>"${txn.product_name}"</b> from <code>${txn.buyer?.safetag}</code>.\n\n💰 Amount: <b>${txn.total_amount} ${txn.currency}</b>\n\nPlease respond to keep the transaction moving.`;
            const buyerMsg = `🔔 <b>Your Request Is Still Pending</b>\n\nWe've nudged the seller about your request for <b>"${txn.product_name}"</b>. You'll be notified when they respond.`;

            await Promise.all([
                routeNotification(txn.seller_id, sellerMsg,
                    [{ label: '✅ Accept', customId: `txn_action_accept|${txn.id}` }, { label: '❌ Decline', customId: `txn_action_decline|${txn.id}` }],
                    undefined,
                    txn.seller?.email ? () => sendSellerAcceptanceReminderEmail(txn.seller.email, { safetag: txn.seller.safetag, buyerTag: txn.buyer?.safetag, product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnId: txn.id, txnCode: txn.txn_code }) : undefined
                ).catch(() => {}),
                routeNotification(txn.buyer_id, buyerMsg).catch(() => {})
            ]);
        }
        log(`Bucket 1 (acceptance 24-48h): ${(b1 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 1 error: ${e.message}`); }

    // Bucket 2: Payment reminder — 6-8h after acceptance
    try {
        const { data: b2 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'ACCEPTED')
            .lt('updated_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
            .gt('updated_at', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString());

        for (const txn of b2 || []) {
            const msg = `💳 <b>Payment Needed</b>\n\nYour accepted deal for <b>"${txn.product_name}"</b> with <code>${txn.seller?.safetag}</code> is awaiting payment.\n\n💰 Amount: <b>${txn.total_amount} ${txn.currency}</b>\n\nPay now to secure the funds in escrow and keep the deal moving.`;
            await routeNotification(txn.buyer_id, msg,
                [{ label: '💳 Pay Now', customId: `view_txn_${txn.id}` }],
                undefined,
                txn.buyer?.email ? () => sendPaymentReminderEmail(txn.buyer.email, { safetag: txn.buyer.safetag, sellerTag: txn.seller?.safetag, product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnId: txn.id, txnCode: txn.txn_code, nudge: 'first' }) : undefined
            ).catch(() => {});
        }
        log(`Bucket 2 (payment 6-8h): ${(b2 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 2 error: ${e.message}`); }

    // Bucket 3: Payment reminder — 24-26h after acceptance (final nudge)
    try {
        const { data: b3 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'ACCEPTED')
            .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .gt('updated_at', new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString());

        for (const txn of b3 || []) {
            const msg = `⚠️ <b>Last Reminder — Payment Overdue</b>\n\nYour deal for <b>"${txn.product_name}"</b> has been accepted for over 24 hours but payment hasn't been made.\n\n💰 Amount: <b>${txn.total_amount} ${txn.currency}</b>\n\nThe seller may cancel if payment is not received soon.`;
            await routeNotification(txn.buyer_id, msg,
                [{ label: '💳 Pay Now', customId: `view_txn_${txn.id}` }],
                undefined,
                txn.buyer?.email ? () => sendPaymentReminderEmail(txn.buyer.email, { safetag: txn.buyer.safetag, sellerTag: txn.seller?.safetag, product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnId: txn.id, txnCode: txn.txn_code, nudge: 'final' }) : undefined
            ).catch(() => {});
        }
        log(`Bucket 3 (payment 24-26h): ${(b3 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 3 error: ${e.message}`); }

    // Bucket 4: Delivery reminder — 72-74h after payment
    try {
        const { data: b4 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'PAID')
            .lt('updated_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
            .gt('updated_at', new Date(Date.now() - 74 * 60 * 60 * 1000).toISOString());

        for (const txn of b4 || []) {
            const msg = `📦 <b>Delivery Reminder</b>\n\nThe buyer has paid for <b>"${txn.product_name}"</b> and the funds are secured in escrow.\n\n💰 Amount: <b>${txn.amount} ${txn.currency}</b>\n\nPlease deliver and mark the transaction as complete.`;
            await routeNotification(txn.seller_id, msg,
                [{ label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` }],
                undefined,
                txn.seller?.email ? () => sendSellerDeliveryReminderEmail(txn.seller.email, { safetag: txn.seller.safetag, buyerTag: txn.buyer?.safetag, product: txn.product_name, txnId: txn.id, txnCode: txn.txn_code, nudge: 'first' }) : undefined
            ).catch(() => {});
        }
        log(`Bucket 4 (delivery 72-74h): ${(b4 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 4 error: ${e.message}`); }

    // Bucket 5: Delivery reminder — 7 days (final, buyer also notified)
    try {
        const { data: b5 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'PAID')
            .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .gt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString());

        for (const txn of b5 || []) {
            const sellerMsg = `🚨 <b>Urgent: Delivery Overdue</b>\n\nPayment for <b>"${txn.product_name}"</b> has been waiting in escrow for 7 days. The buyer may open a dispute.\n\nPlease deliver and mark the order as complete immediately.`;
            const buyerMsg = `⚠️ <b>Delivery Delayed</b>\n\nYour payment for <b>"${txn.product_name}"</b> has been in escrow for 7 days. If you haven't received your item, you can open a dispute.`;

            await Promise.all([
                routeNotification(txn.seller_id, sellerMsg,
                    [{ label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` }],
                    undefined,
                    txn.seller?.email ? () => sendSellerDeliveryReminderEmail(txn.seller.email, { safetag: txn.seller.safetag, buyerTag: txn.buyer?.safetag, product: txn.product_name, txnId: txn.id, txnCode: txn.txn_code, nudge: 'final' }) : undefined
                ).catch(() => {}),
                routeNotification(txn.buyer_id, buyerMsg,
                    [{ label: '❌ Open Dispute', customId: `txn_dispute_${txn.id}` }]
                ).catch(() => {})
            ]);
        }
        log(`Bucket 5 (delivery 7d): ${(b5 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 5 error: ${e.message}`); }

    // Bucket 6: Receipt confirmation reminder — 48-50h after seller marks complete
    try {
        const { data: b6 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'COMPLETED_BY_SELLER')
            .lt('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
            .gt('updated_at', new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString());

        for (const txn of b6 || []) {
            const msg = `📬 <b>Please Confirm Receipt</b>\n\nThe seller has marked <b>"${txn.product_name}"</b> as delivered. Have you received it?\n\nConfirm receipt to release the payment to the seller, or open a dispute if there's a problem.\n\n⏳ <b>5 days remaining</b> before funds are automatically released to the seller.`;
            await routeNotification(txn.buyer_id, msg,
                [
                    { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                    { label: '❌ Open Dispute', customId: `txn_dispute_${txn.id}` }
                ],
                undefined,
                txn.buyer?.email ? () => sendReceiptConfirmationReminderEmail(txn.buyer.email, { safetag: txn.buyer.safetag, sellerTag: txn.seller?.safetag, product: txn.product_name, txnId: txn.id, txnCode: txn.txn_code, nudge: 'first' }) : undefined
            ).catch(() => {});
        }
        log(`Bucket 6 (receipt 48-50h): ${(b6 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 6 error: ${e.message}`); }

    // Bucket 7: Receipt confirmation reminder — 5 days (final)
    try {
        const { data: b7 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'COMPLETED_BY_SELLER')
            .lt('updated_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
            .gt('updated_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString());

        for (const txn of b7 || []) {
            const msg = `🚨 <b>Final Warning — Funds Auto-Release in 48 Hours</b>\n\n<b>"${txn.product_name}"</b> has been marked as delivered for 5 days without your confirmation.\n\nIf you do not confirm receipt or raise a dispute within <b>2 days</b>, funds will be automatically released to the seller.\n\nPlease act now — confirm receipt or open a dispute immediately.`;
            await routeNotification(txn.buyer_id, msg,
                [
                    { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                    { label: '❌ Open Dispute', customId: `txn_dispute_${txn.id}` }
                ],
                undefined,
                txn.buyer?.email ? () => sendReceiptConfirmationReminderEmail(txn.buyer.email, { safetag: txn.buyer.safetag, sellerTag: txn.seller?.safetag, product: txn.product_name, txnId: txn.id, txnCode: txn.txn_code, nudge: 'final' }) : undefined
            ).catch(() => {});
        }
        log(`Bucket 7 (receipt 5d): ${(b7 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 7 error: ${e.message}`); }

    // Bucket 8: Auto-finalization — COMPLETED_BY_SELLER for 7+ days with no buyer action
    try {
        const { data: b8 } = await supabase
            .from('transactions')
            .select(joinSelect)
            .eq('status', 'COMPLETED_BY_SELLER')
            .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        for (const txn of b8 || []) {
            try {
                const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000/api';
                // Use buyer's safetag as updater so the API routes "funds released" to the SELLER
                await axios.patch(
                    `${internalUrl}/transactions/${txn.id}/status`,
                    { status: 'confirm_receipt', updater_safetag: txn.buyer?.safetag, auto_resolved: true },
                    { headers: { 'x-bot-secret': process.env.BOT_API_SECRET || '' } }
                );

                // API already notifies the seller ("funds released") — only explicitly notify the buyer
                await routeNotification(
                    txn.buyer_id,
                    `⚠️ <b>Transaction Auto-Completed</b>\n\nTransaction <b>${txn.txn_code}</b> for <b>"${txn.product_name}"</b> was automatically finalized and funds released to the seller because you did not confirm receipt or raise a dispute within 7 days.\n\nIf you believe this is an error, please contact support immediately.`
                ).catch(() => {});

                log(`Bucket 8: Auto-finalized ${txn.txn_code}`);
            } catch (e: any) {
                log(`Bucket 8: Auto-finalize failed for ${txn.txn_code}: ${e.message}`);
            }
        }
        log(`Bucket 8 (auto-finalize 7d): ${(b8 || []).length} transactions`);
    } catch (e: any) { log(`Bucket 8 error: ${e.message}`); }

    log('Done.');
}
