import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification, routeNotification, sendReferralNotification, recordNotification, sendTelegramGroupMessage, sendDiscordChannelMessage } from '../services/notifications';
import { sendTransactionInvoiceEmail, sendNewTransactionRequestEmail, sendTransactionAcceptedEmail, sendTransactionDeclinedEmail, sendDeliverySubmittedEmail, sendTransactionCompletedEmail, sendReferralMilestoneEmail, sendMilestoneReleasedEmail, sendPaymentConfirmedEmail } from '../services/email';
import crypto from 'crypto';
import axios from 'axios';
import multer from 'multer';
import { maybeSendFeedbackPrompt } from './feedback';
import { requireUser, requireUserOrBot, AuthedRequest, BotOrUserRequest } from '../middleware/requireUser';
import { buildInternalMagicLink } from '../services/magicLinkInternal';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use((req, res, next) => {
    console.log(`[Safeeely Transaction Service] ${req.method} ${req.url}`);
    next();
});

const isUUID = (str: string) => {
    const res = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    console.log(`🧪 UUID check: ${str} -> ${res}`);
    return res;
};

const CreateTransactionSchema = z.object({
    buyer_safetag: z.string(),
    seller_safetag: z.string(),
    product_name: z.string(),
    description: z.string().optional(),
    amount: z.number(),
    currency: z.string(),
    fee_allocation: z.enum(['buyer', 'seller', 'split']),
    initiator_safetag: z.string().optional(),
    transaction_type: z.enum(['ONE_TIME', 'MILESTONE']).default('ONE_TIME'),
    milestones: z.array(z.object({
        title: z.string(),
        amount: z.number()
    })).optional(),
    send_invoice: z.boolean().optional().default(false),
    group_id: z.string().uuid().optional(),
});

router.post('/create', async (req, res) => {
    console.log('📬 Incoming Transaction Request:', JSON.stringify(req.body, null, 2));
    try {
        const data = CreateTransactionSchema.parse(req.body);

        // Get IDs from safetags (case-insensitive — safetags may differ in capitalisation)
        const { data: buyer } = await supabase.from('profiles').select('id, kyc_status, is_blocked, safetag, email, first_name, last_name').ilike('safetag', data.buyer_safetag).maybeSingle();
        const { data: seller } = await supabase.from('profiles').select('id, kyc_status, is_blocked, safetag, email, first_name, last_name').ilike('safetag', data.seller_safetag).maybeSingle();

        if (!buyer || !seller) {
            const missing = !buyer ? data.buyer_safetag : data.seller_safetag;
            return res.status(400).json({ error: `User ${missing} not found. Please ensure the Safetag is correct.` });
        }

        // Block guard — reject transaction if either party is blocked
        if (buyer.is_blocked) {
            return res.status(400).json({ error: 'USER_BLOCKED', safetag: data.buyer_safetag, party: 'buyer' });
        }
        if (seller.is_blocked) {
            return res.status(400).json({ error: 'USER_BLOCKED', safetag: data.seller_safetag, party: 'seller' });
        }

        // Fetch platform fee rate from admin settings (fallback: 5%)
        let feeRate = 0.05;
        try {
            const { data: feeRateSetting } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'platform_fee_rate')
                .single();
            if (feeRateSetting) feeRate = parseFloat(feeRateSetting.value);
        } catch {
            console.warn('Could not load platform_fee_rate from settings, using default 5%');
        }
        const feeAmount = data.amount * feeRate;
        const totalAmount = data.fee_allocation === 'buyer' ? data.amount + feeAmount : data.amount;

        // Robust txn_code generation with retry logic
        let txn: any = null;
        let txnCode = '';
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
            txnCode = `TXN-${dateStr}-${randomSuffix}`;

            const { data: newTxn, error: insertError } = await supabase
                .from('transactions')
                .insert({
                    txn_code: txnCode,
                    buyer_id: buyer.id,
                    seller_id: seller.id,
                    product_name: data.product_name,
                    description: data.description,
                    amount: data.amount,
                    currency: data.currency,
                    fee_allocation: data.fee_allocation,
                    fee_amount: feeAmount,
                    total_amount: totalAmount,
                    status: 'PENDING_SELLER_ACCEPTANCE',
                    transaction_type: data.transaction_type,
                    ...(data.group_id ? { group_id: data.group_id } : {})
                })
                .select()
                .single();

            if (!insertError) {
                txn = newTxn;
                if (data.transaction_type === 'MILESTONE' && data.milestones && data.milestones.length > 0) {
                    const milestoneInserts = data.milestones.map((m, idx) => ({
                        transaction_id: txn.id,
                        index_num: idx + 1,
                        title: m.title,
                        amount: m.amount,
                        status: 'PENDING'
                    }));
                    const { error: milestoneError } = await supabase
                        .from('transaction_milestones')
                        .insert(milestoneInserts);
                    if (milestoneError) {
                        console.error('❌ Failed to insert milestones:', milestoneError);
                    }
                }
                break;
            }

            // If it's a unique constraint error on txn_code, retry with a different suffix
            if (insertError.code === '23505' && insertError.message.includes('txn_code')) {
                console.warn(`⚠️ Collision detected for ${txnCode}, retry attempt ${attempts}/${maxAttempts}`);
                continue;
            }

            // For other errors, throw immediately
            console.error('❌ Database error creating transaction:', insertError);
            throw insertError;
        }

        if (!txn) {
            throw new Error(`Failed to create unique transaction code after ${maxAttempts} attempts.`);
        }

        console.log('✨ Transaction record created:', txn.txn_code);

        // Smart Invoice — fire-and-forget PDF email to buyer if opted in
        if (data.send_invoice && buyer?.email) {
            const invoiceDate = new Date(txn.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            sendTransactionInvoiceEmail({
                txnCode: txn.txn_code,
                txnId: txn.id,
                invoiceDate,
                seller: {
                    firstName: seller?.first_name || seller?.safetag || 'Seller',
                    lastName: seller?.last_name || '',
                    safetag: seller?.safetag || '',
                    email: seller?.email || '',
                },
                buyer: {
                    firstName: buyer?.first_name || buyer?.safetag || 'Buyer',
                    lastName: buyer?.last_name || '',
                    safetag: buyer?.safetag || '',
                    email: buyer?.email || '',
                },
                productName: data.product_name,
                description: data.description,
                transactionType: data.transaction_type,
                milestones: data.milestones,
                amount: data.amount,
                feeAmount: feeAmount,
                totalAmount: totalAmount,
                feeAllocation: data.fee_allocation,
                currency: data.currency,
            }).catch(e => console.error('❌ [Invoice] Failed to send invoice email:', e.message));
        }

        // Determine who to notify: Notify the person who is NOT the one who initiated.
        const normTag = (tag: string) => tag.startsWith('@') ? tag : `@${tag}`;
        const isBuyerInitiated = !data.initiator_safetag || normTag(data.initiator_safetag) === normTag(data.buyer_safetag);
        const recipientId = isBuyerInitiated ? seller.id : buyer.id;
        const recipientTag = isBuyerInitiated ? data.seller_safetag : data.buyer_safetag;
        const initiatorTag = isBuyerInitiated ? data.buyer_safetag : data.seller_safetag;
        const initiatorRole = isBuyerInitiated ? 'buyer' : 'seller';

        console.log(`🔔 Preparing notification for ${isBuyerInitiated ? 'seller' : 'buyer'} (${recipientTag})...`);

        {
            const who = isBuyerInitiated ? 'Buyer' : 'Seller';
            const otherTag = isBuyerInitiated ? data.buyer_safetag : data.seller_safetag;
            const recipientEmail = isBuyerInitiated ? seller.email : buyer.email;
            const recipientSafetag = isBuyerInitiated ? seller.safetag : buyer.safetag;

            const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';

            // Get actual rating stats for the initiator (the counterparty to the receiver)
            const { data: statsData } = await supabase.from('reviews').select('rating').eq('reviewee_id', isBuyerInitiated ? buyer.id : seller.id);
            const rCount = statsData ? statsData.length : 0;
            const avgR = rCount > 0 ? (statsData!.reduce((a, c) => a + c.rating, 0) / rCount).toFixed(1) : 'No';

            // Get verification status for the initiator
            const initiatorProfile = isBuyerInitiated ? buyer : seller;
            const isVerified = initiatorProfile?.kyc_status === 'VERIFIED';
            const verifiedLabel = isVerified ? '✅Verified' : '❌ Verified';

            const isMilestone = data.transaction_type === 'MILESTONE';
            const projectType = isMilestone ? '🪜 Milestone Project' : (isBuyerInitiated ? '🛒 Product' : '💼 Service');

            let milestoneText = '';
            if (isMilestone && data.milestones) {
                milestoneText = `\n📍 **Phases:**\n` + data.milestones.map((m, i) => `   ${i+1}. ${m.title} (${m.amount} ${data.currency})`).join('\n');
            }

            const msg = `🔔 <b>New Transaction Request!</b>\n\nYou've received a transaction request from <b>${otherTag} (${verifiedLabel})</b>\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txnCode}</b>\n${projectType}: <b>${data.product_name}</b>\n📝 Description: ${data.description || 'N/A'}${milestoneText}\n💰 Total Amount: <b>${data.amount} ${data.currency}</b>\n💵 Fee: <b>${feeAmount.toFixed(2)} ${data.currency}</b> (${data.fee_allocation})\n💳 Escrow Total: <b>${totalAmount.toFixed(2)} ${data.currency}</b>\n👤 ${who}: <code>${otherTag}</code> (${verifiedLabel})\n⭐ ${who} Rating: ${avgR} ${avgR === 'No' ? 'reviews yet' : `/ 5 (${rCount} reviews)`}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            routeNotification(
                recipientId,
                msg,
                [
                    { label: '✅ Accept', customId: `txn_action_accept|${txn.id}` },
                    { label: '❌ Decline', customId: `txn_action_decline|${txn.id}` },
                    { label: '⭐ View Reviews', url: `${reviewsUrl}/reviews/${encodeURIComponent(otherTag)}` }
                ],
                undefined,
                recipientEmail ? () => sendNewTransactionRequestEmail(recipientEmail, {
                    safetag: recipientSafetag,
                    counterpartyTag: otherTag,
                    product: data.product_name,
                    amount: data.amount,
                    currency: data.currency,
                    txnCode,
                    txnId: txn.id
                }) : undefined
            ).catch(e => console.error('Background Notification Error:', e));
            recordNotification(recipientId, 'transaction', '🔔 New Transaction Request', `${otherTag} sent you a ${data.transaction_type === 'MILESTONE' ? 'milestone project' : 'trade'} request for ${data.product_name}`, { transaction_id: txn.id, transaction_code: txnCode, amount: data.amount, currency: data.currency, counterparty_name: otherTag, link_url: `/withdraw/${encodeURIComponent(isBuyerInitiated ? seller.safetag : buyer.safetag)}?continue=${txn.id}&txnCode=${txnCode}&txnTitle=${encodeURIComponent(data.product_name || '')}` }).catch(() => {});
            console.log(`[Notification Engine] Dispatched routeNotification to recipient ${recipientId}`);
        }

        res.status(201).json(txn);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { seller_safetag, safetag, status, category } = req.query;
        let query = supabase.from('transactions').select('*, buyer:buyer_id(*), seller:seller_id(*)');

        if (seller_safetag) {
            const { data: profile } = await supabase.from('profiles').select('id').ilike('safetag', seller_safetag as string).single();
            if (profile) query = query.eq('seller_id', profile.id);
        }

        if (safetag) {
            const { data: profile } = await supabase.from('profiles').select('id').ilike('safetag', safetag as string).single();
            if (profile) {
                query = query.or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`);
            }
        }

        if (status) query = query.eq('status', status);

        if (category) {
            if (category === 'ongoing') {
                query = query.in('status', ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER']);
            } else if (category === 'completed') {
                query = query.eq('status', 'FINALIZED');
            } else if (category === 'disputed') {
                query = query.eq('status', 'DISPUTED');
            }
        }

        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    console.log(`🔍 [GET] Transaction Request: ${req.params.id}`);
    const { id } = req.params;
    try {
        if (!id) return res.status(400).json({ error: 'Transaction ID is required' });

        let data, error;

        // Efficient lookup: check format first
        if (typeof id === 'string' && id.startsWith('TXN-')) {
            console.log('  -> Step: Code Lookup');
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            data = result.data;
            error = result.error;
        } else if (isUUID(id)) {
            console.log('  -> Step: UUID Lookup');
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('id', id)
                .single();
            data = result.data;
            error = result.error;
        } else {
            console.log('  -> Step: Fallback Lookup');
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            data = result.data;
            error = result.error;
        }
        console.log(`  -> Result: ${data ? 'Found' : 'Not Found'}, Error: ${error ? error.message : 'None'}`);

        if (error || !data) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(data);
    } catch (err: any) {
        console.error('🔥 [GET /:id] Fatal Crash:', {
            message: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint
        });
        res.status(400).json({
            error: 'Request Error',
            message: err.message || 'Unknown database error',
            code: err.code,
            id: id
        });
    }
});

router.get('/:id/proofs', async (req, res) => {
    const { id } = req.params;
    console.log(`🔍 [GET] Proofs Request for: ${id}`);
    try {
        if (!id) return res.json([]);
        let txnId = null;

        if (typeof id === 'string' && id.startsWith('TXN-')) {
            console.log(`  -> Searching by code: ${id}`);
            const { data: txn, error } = await supabase
                .from('transactions')
                .select('id')
                .eq('txn_code', id)
                .single();
            if (error) {
                console.error(`  -> Code Lookup Error:`, error.message);
            }
            if (txn) {
                txnId = txn.id;
                console.log(`  -> Found Txn ID: ${txnId}`);
            } else {
                console.warn(`  -> No transaction found for code: ${id}`);
            }
        } else if (isUUID(id)) {
            console.log(`  -> Identifier is UUID: ${id}`);
            txnId = id;
        } else {
            console.log(`  -> Fallback code search: ${id}`);
            const { data: txn, error } = await supabase
                .from('transactions')
                .select('id')
                .eq('txn_code', id)
                .single();
             if (error) {
                console.error(`  -> Fallback Lookup Error:`, error.message);
            }
            if (txn) txnId = txn.id;
        }

        if (!txnId) {
            console.warn(`  -> Stop: No txnId resolved for ${id}`);
            return res.json([]);
        }

        console.log(`  -> Fetching proofs for transaction_id: ${txnId}`);
        const { data, error } = await supabase
            .from('transaction_proofs')
            .select('*')
            .eq('transaction_id', txnId);

        if (error) {
            console.error(`  -> Proofs Fetch Error:`, error.message);
            throw error;
        }
        
        console.log(`  -> Found ${data?.length || 0} proofs.`);
        res.json(data || []);
    } catch (err: any) {
        console.error('🔥 [GET /:id/proofs] Fatal:', err.message);
        res.json([]);
    }
});

router.patch('/:id/status', requireUserOrBot, async (req, res) => {
    let newStatus: string = '';
    let txn: any, fetchError: any;
    try {
        const isBot = (req as BotOrUserRequest).isBot;
        const user = isBot ? null : (req as AuthedRequest).user;
        const id = String(req.params.id);
        const status: string = req.body.status;
        const updater_safetag = req.body.updater_safetag;

        if (id.startsWith('TXN-')) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else if (isUUID(id)) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('id', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else {
            const retry = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = retry.data;
            fetchError = retry.error;
        }

        if (fetchError || !txn) return res.status(404).json({ error: 'Transaction not found' });

        // Resolve actor's profile ID — user JWT supplies it directly; bots resolve via updater_safetag
        let actorId: string | null = user?.sub ?? null;
        if (isBot) {
            if (!updater_safetag) return res.status(400).json({ error: 'updater_safetag required' });
            const raw = updater_safetag.startsWith('@') ? updater_safetag : `@${updater_safetag}`;
            const without = raw.slice(1);
            const { data: botProfile } = await supabase.from('profiles').select('id').or(`safetag.ilike.${raw},safetag.ilike.${without}`).maybeSingle();
            if (!botProfile) return res.status(403).json({ error: 'Profile not found' });
            actorId = botProfile.id;
        }

        // Role-based guard for real state changes
        if (!status.endsWith('_prompt') && status !== 'pay_prompt') {
            const isBuyer = actorId === txn.buyer_id;
            const isSeller = actorId === txn.seller_id;
            if (!isBuyer && !isSeller) {
                return res.status(403).json({ error: 'FORBIDDEN' });
            }
            const sellerOnlyActions = ['accept', 'decline', 'complete_yes', 'complete_confirmed', 'seller_cancel'];
            const buyerOnlyActions = ['confirm_receipt'];
            if (sellerOnlyActions.includes(status) && !isSeller) {
                return res.status(403).json({ error: 'Only the seller can perform this action' });
            }
            if (buyerOnlyActions.includes(status) && !isBuyer) {
                return res.status(403).json({ error: 'Only the buyer can perform this action' });
            }
        }

        // Case 1: Just a prompt (no state change)
        if (status.endsWith('_prompt') || status === 'pay_prompt') {
            // These are virtual actions to get instructions/buttons
            let followUpMsg = '';
            let followUpOptions: any[] = [];

            if (status === 'accept_prompt') {
                followUpMsg = `🤝 <b>New Transaction Request!</b>\n\n<code>${txn.buyer.safetag}</code> wants to start a transaction with you for:\n\n🛒 Product: <b>${txn.product_name}</b>\n💰 Total: <b>${txn.total_amount} ${txn.currency}</b>\n\nDo you accept these terms?`;
                followUpOptions = [
                    { label: '✅ Accept', customId: `txn_action_accept|${txn.id}` },
                    { label: '❌ Decline', customId: `txn_action_decline|${txn.id}` },
                    { label: '📋 Full Details', customId: `view_txn_details|${txn.id}` }
                ];
            } else if (status === 'pay_prompt') {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                followUpMsg = `💳 <b>Payment Required</b>\n\nTo proceed with <b>${txn.product_name}</b>, please make your payment:\n\n💰 Total: <b>${txn.total_amount} ${txn.currency}</b>\n\n🔗 Payment Link: <a href="${reviewsUrl}/pay/${txn.id}">PAY_NOW</a>`;
                followUpOptions = [
                    { label: '💳 Pay Now', customId: `txn_pay_${txn.id}` },
                    { label: '📋 Details', customId: `view_txn_details|${txn.id}` }
                ];
            } else if (status === 'complete_prompt') {
                followUpMsg = `✅ <b>Mark Delivery as Completed</b>\n\nHave you completed your part of the agreement for <b>${txn.product_name}</b>?`;
                followUpOptions = [
                    { label: '✅ Yes, Mark Complete', customId: `txn_action_complete_yes|${txn.id}` },
                    { label: '❌ No, Not Yet', customId: 'main_menu' }
                ];
            } else if (status === 'confirm_receipt_prompt') {
                followUpMsg = `📦 <b>Confirm Delivery</b>\n\nPlease confirm if you have received <b>${txn.product_name}</b> as expected and are satisfied.`;
                followUpOptions = [
                    { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                    { label: '⚠️ Raise Dispute', customId: `txn_dispute_${txn.id}` }
                ];
            }

            return res.json({
                status: txn.status,
                follow_up_msg: followUpMsg,
                follow_up_options: followUpOptions
            });
        }

        // Reject skip-proof — proof is now mandatory
        if (status === 'complete_skip') {
            return res.status(400).json({ error: 'Proof of delivery is required. Please upload at least one proof document via the web portal before marking delivery as complete.' });
        }

        // Seller-initiated cancellation — early return with full refund
        if (status === 'seller_cancel') {
            if (txn.status !== 'PAID') {
                return res.status(400).json({ error: 'Cancellation is only available while the transaction is in PAID status. Once delivery has started, please use the dispute process.' });
            }
            const cancellation_reason = req.body.cancellation_reason || 'No reason provided';

            await supabase.from('transactions').update({
                status: 'CANCELLED',
                metadata: { ...(txn.metadata || {}), cancellation_reason, cancelled_by: 'SELLER', cancelled_at: new Date().toISOString() }
            }).eq('id', txn.id);

            await supabase.from('buyer_refund_credits').insert({
                transaction_id: txn.id,
                buyer_id: txn.buyer_id,
                amount: txn.amount,
                currency: txn.currency,
                refund_type: 'FULL',
                status: 'PENDING',
                resolution_source: 'SELLER_CANCELLED'
            });

            try {
                const { data: repRow } = await supabase.from('profile_reputation').select('cancellation_count').eq('profile_id', txn.seller_id).maybeSingle();
                const currentCount = repRow?.cancellation_count ?? 0;
                await supabase.from('profile_reputation').upsert({ profile_id: txn.seller_id, cancellation_count: currentCount + 1 }, { onConflict: 'profile_id' });
            } catch { /* non-critical */ }

            routeNotification(
                txn.buyer_id,
                `💸 <b>Refund Issued</b>\n\n<code>${txn.seller?.safetag}</code> has cancelled the transaction for <b>"${txn.product_name}"</b> and issued a full refund.\n\n💰 Refund Amount: <b>${txn.amount} ${txn.currency}</b>\n📋 Transaction: <b>${txn.txn_code}</b>\n\nYour funds will be returned to your balance shortly.`,
                [{ label: '🏠 Main Menu', customId: 'main_menu' }]
            ).catch(() => {});

            routeNotification(
                txn.seller_id,
                `✅ <b>Cancellation Confirmed</b>\n\nYou have cancelled the transaction for <b>"${txn.product_name}"</b>.\n\n💰 A full refund of <b>${txn.amount} ${txn.currency}</b> has been issued to <code>${txn.buyer?.safetag}</code>.\n📋 Transaction: <b>${txn.txn_code}</b>`,
                [{ label: '🏠 Main Menu', customId: 'main_menu' }]
            ).catch(() => {});

            return res.json({ success: true, message: 'Transaction cancelled and buyer refunded' });
        }

        newStatus = txn.status;
        if (status === 'accept') newStatus = 'ACCEPTED';
        else if (status === 'decline') newStatus = 'DECLINED';
        else if (status === 'complete_yes') newStatus = 'AWAITING_PROOF';
        else if (status === 'complete_confirmed') newStatus = 'COMPLETED_BY_SELLER';
        else if (status === 'confirm_receipt') newStatus = 'FINALIZED';

        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', txn.id);

        if (updateError) throw updateError;

        // Cascade milestone rows to RELEASED when a milestone transaction is finalized via confirm_receipt
        // (WhatsApp/Instagram/Messenger/Apple have no per-milestone UI; buyer confirms the whole job at once)
        if (newStatus === 'FINALIZED' && txn.transaction_type === 'MILESTONE' && txn.milestones?.length) {
            await supabase
                .from('transaction_milestones')
                .update({ status: 'RELEASED', updated_at: new Date().toISOString() })
                .eq('transaction_id', txn.id)
                .in('status', ['PENDING', 'COMPLETED']);
        }

        // --- REFERRAL COMMISSION DISTRIBUTION ENGINE ---
        if (newStatus === 'FINALIZED') {
            try {
                // The new business logic: Referrers ONLY earn commission when their referee is the BUYER.
                const buyerId = txn.buyer_id;

                if (buyerId && txn.fee_amount > 0) {
                    // Fetch referral commission rates from admin settings (fallback: 10% / 5%)
                    let tier1Percent = 0.10;
                    let tier2Percent = 0.05;
                    try {
                        const { data: rateSettings } = await supabase
                            .from('platform_settings')
                            .select('key, value')
                            .in('key', ['referral_tier1_percent', 'referral_tier2_percent']);
                        (rateSettings || []).forEach((s: any) => {
                            if (s.key === 'referral_tier1_percent') tier1Percent = parseFloat(s.value);
                            if (s.key === 'referral_tier2_percent') tier2Percent = parseFloat(s.value);
                        });
                    } catch {
                        console.warn('Could not load referral percentages from settings, using defaults');
                    }

                    // Fetch the buyer's Tier 1 Referrer
                    const { data: buyerProfile } = await supabase
                        .from('profiles')
                        .select('referred_by_id')
                        .eq('id', buyerId)
                        .single();

                    if (buyerProfile && buyerProfile.referred_by_id) {
                        const tier1ReferrerId = buyerProfile.referred_by_id;
                        const tier1Amount = txn.fee_amount * tier1Percent;

                        // Insert Tier 1
                        await supabase.from('referral_commissions').insert({
                            referrer_id: tier1ReferrerId,
                            referred_id: buyerId,
                            amount: tier1Amount,
                            currency: txn.currency,
                            tier: 1,
                            txn_id: txn.id,
                            status: 'COMPLETED'
                        });
                        console.log(`💰 Paid Tier 1 Commission: ${tier1Amount} ${txn.currency} to ${tier1ReferrerId}`);
                        sendReferralNotification(
                            tier1ReferrerId,
                            `💰 <b>Commission Earned!</b>\n\nYou just earned a <b>Tier 1</b> referral commission of <b>${tier1Amount.toFixed(2)} ${txn.currency}</b>. Keep it up!`,
                            'You earned a referral commission on Safeeely!',
                            `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Commission Earned! 💰</h2><p style="color:#475569;">You just earned a <b>Tier 1</b> referral commission of <b>${tier1Amount.toFixed(2)} ${txn.currency}</b>.</p></div>`
                        ).catch(e => console.error('Tier 1 commission notification failed:', e.message));

                        // Referral milestone celebration
                        try {
                            const { count: tier1Count } = await supabase
                                .from('profiles')
                                .select('*', { count: 'exact', head: true })
                                .eq('referred_by_id', tier1ReferrerId);
                            const REFERRAL_MILESTONES = [1, 5, 10, 25, 50, 100];
                            if (tier1Count && REFERRAL_MILESTONES.includes(tier1Count)) {
                                const { data: referrerProfile } = await supabase.from('profiles').select('safetag, email').eq('id', tier1ReferrerId).single();
                                const earningsSummary = `${tier1Amount.toFixed(2)} ${txn.currency} (latest)`;
                                routeNotification(
                                    tier1ReferrerId,
                                    `🏆 <b>Referral Milestone!</b>\n\nYou just hit <b>${tier1Count} referral${tier1Count > 1 ? 's' : ''}</b> on Safeeely! Keep sharing to earn more for life.`,
                                    undefined,
                                    undefined,
                                    referrerProfile?.email ? () => sendReferralMilestoneEmail(referrerProfile.email, { safetag: referrerProfile.safetag, milestone: tier1Count, earningsSummary }) : undefined
                                ).catch(() => {});
                            }
                        } catch { /* non-critical */ }

                        // Fetch the fee payer's Tier 2 Referrer (the person who referred Tier 1)
                        const { data: tier1Profile } = await supabase
                            .from('profiles')
                            .select('referred_by_id')
                            .eq('id', tier1ReferrerId)
                            .single();

                        if (tier1Profile && tier1Profile.referred_by_id) {
                            const tier2ReferrerId = tier1Profile.referred_by_id;
                            const tier2Amount = txn.fee_amount * tier2Percent;

                            // Insert Tier 2
                            await supabase.from('referral_commissions').insert({
                                referrer_id: tier2ReferrerId,
                                referred_id: tier1ReferrerId, // They referred the person who referred the payer
                                amount: tier2Amount,
                                currency: txn.currency,
                                tier: 2,
                                txn_id: txn.id,
                                status: 'COMPLETED'
                            });
                            console.log(`💰 Paid Tier 2 Commission: ${tier2Amount} ${txn.currency} to ${tier2ReferrerId}`);
                            sendReferralNotification(
                                tier2ReferrerId,
                                `💰 <b>Commission Earned!</b>\n\nYou just earned a <b>Tier 2</b> referral commission of <b>${tier2Amount.toFixed(2)} ${txn.currency}</b>. Keep it up!`,
                                'You earned a referral commission on Safeeely!',
                                `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Commission Earned! 💰</h2><p style="color:#475569;">You just earned a <b>Tier 2</b> referral commission of <b>${tier2Amount.toFixed(2)} ${txn.currency}</b>.</p></div>`
                            ).catch(e => console.error('Tier 2 commission notification failed:', e.message));
                        }
                    }
                }
            } catch (commError) {
                console.error('❌ Failed to distribute commissions:', commError);
                // We don't throw here to avoid failing the transaction confirmation
            }
        }
        // --- END COMMISSION ENGINE ---

        // --- COMMUNITY COMMISSION ENGINE ---
        if (newStatus === 'FINALIZED' && (txn as any).group_id && txn.fee_amount > 0) {
            try {
                const groupId = (txn as any).group_id;
                const { data: group } = await supabase
                    .from('community_groups')
                    .select('*')
                    .eq('id', groupId)
                    .eq('status', 'active')
                    .single();

                if (group) {
                    const commissionAmount = txn.fee_amount * (group.admin_revenue_share_percent / 100);

                    await supabase.from('community_commissions').insert({
                        group_id: group.id,
                        admin_profile_id: group.admin_profile_id,
                        txn_id: txn.id,
                        amount: commissionAmount,
                        currency: txn.currency,
                        status: 'COMPLETED',
                    });

                    console.log(`🏘️ Community commission: ${commissionAmount} ${txn.currency} to admin of "${group.group_name}"`);

                    sendReferralNotification(
                        group.admin_profile_id,
                        `🏘️ <b>Group Commission Earned!</b>\n\nA deal was completed in your group <b>${group.group_name}</b>.\n\nYou earned <b>${commissionAmount.toFixed(2)} ${txn.currency}</b> — keep growing your community! 🚀`,
                        'You earned a group commission on Safeeely!',
                        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Group Commission Earned! 🏘️</h2><p style="color:#475569;">A deal was completed in your group <b>${group.group_name}</b>. You earned <b>${commissionAmount.toFixed(2)} ${txn.currency}</b>.</p></div>`
                    ).catch((e: any) => console.error('Community commission notification failed:', e.message));

                    // Post social proof announcement in the group (fire-and-forget)
                    if (group.platform === 'telegram' && group.telegram_group_id) {
                        const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SafeeelyBot';
                        const tradeDeepLink = `https://t.me/${botUsername}?start=group_${group.id}`;
                        sendTelegramGroupMessage(
                            group.telegram_group_id,
                            `🎉 <b>Secure trade completed!</b>\n\nAnother deal was just protected by Safeeely escrow in this group. Both buyer and seller traded safely.\n\n🛡️ Want to trade securely too?`,
                            { text: '🛡️ Start Secure Trade', url: tradeDeepLink }
                        ).catch((e: any) => console.error('Telegram group social proof announcement failed:', e.message));
                    } else if (group.platform === 'discord' && group.discord_announcement_channel_id) {
                        const reviewsBase = process.env.REVIEWS_URL || 'http://localhost:3001';
                        sendDiscordChannelMessage(
                            group.discord_announcement_channel_id,
                            `🎉 **Secure trade completed!**\n\nAnother deal was just protected by Safeeely escrow in this server. Both buyer and seller traded safely.\n\n🛡️ Want to trade securely too?`,
                            { label: '🛡️ Start Secure Trade', url: `${reviewsBase}/trade` }
                        ).catch((e: any) => console.error('Discord group social proof announcement failed:', e.message));
                    }
                }
            } catch (communityCommError) {
                console.error('❌ Failed to distribute community commission:', communityCommError);
            }
        }
        // --- END COMMUNITY COMMISSION ENGINE ---

        // --- GAMIFIED BADGES ENGINE ---
        if (newStatus === 'FINALIZED') {
            try {
                // Background execution, don't await blocking to prevent slowing down the request
                const checkAndAwardBadges = async (sellerId: string, buyerId: string) => {
                    try {
                        // 1. Check Whale Buyer
                        const { data: buyerTxns } = await supabase.from('transactions').select('total_amount').eq('buyer_id', buyerId).eq('status', 'FINALIZED');
                        if (buyerTxns) {
                            const totalSpent = buyerTxns.reduce((sum, t) => sum + Number(t.total_amount), 0);
                            if (totalSpent >= 1000000) {
                                const { error: e1 } = await supabase.from('profile_badges').insert({ profile_id: buyerId, badge_key: 'whale_buyer' });
                                if (!e1) console.log(`🏆 Awarded Whale Buyer badge to ${buyerId}`);
                            }
                        }
                        
                        // 2. Check Trusted Seller & Zero Drama
                        const { data: sellerTxns } = await supabase.from('transactions').select('id, status').eq('seller_id', sellerId);
                        if (sellerTxns) {
                            const finalizedCount = sellerTxns.filter((t) => t.status === 'FINALIZED').length;
                            
                            // Zero Drama: 20 completed, no disputes
                            // Since disputes are linked by transaction_id
                            const txnIds = sellerTxns.map(t => t.id);
                            if (txnIds.length > 0 && finalizedCount >= 20) {
                                const { data: sellerDisputes } = await supabase.from('disputes').select('id').in('transaction_id', txnIds);
                                if (!sellerDisputes || sellerDisputes.length === 0) {
                                    const { error: e2 } = await supabase.from('profile_badges').insert({ profile_id: sellerId, badge_key: 'zero_drama' });
                                    if (!e2) console.log(`🏆 Awarded Zero Drama badge to ${sellerId}`);
                                }
                            }
                            
                            // Trusted Seller: 10 completed, rating > 4.5
                            if (finalizedCount >= 10) {
                                const { data: sellerReviews } = await supabase.from('reviews').select('rating').eq('reviewee_id', sellerId);
                                if (sellerReviews && sellerReviews.length > 0) {
                                    const avgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
                                    if (avgRating >= 4.5) {
                                        const { error: e3 } = await supabase.from('profile_badges').insert({ profile_id: sellerId, badge_key: 'trusted_seller' });
                                        if (!e3) console.log(`🏆 Awarded Trusted Seller badge to ${sellerId}`);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Badge awarding logic failed:', e);
                    }
                };
                
                checkAndAwardBadges(txn.seller_id, txn.buyer_id);
            } catch (badgeErr) {
                console.error('❌ Failed to trigger badges check:', badgeErr);
            }
        }
        // --- END GAMIFIED BADGES ENGINE ---

        // --- TRANSACTION COUNT MILESTONES ---
        if (newStatus === 'FINALIZED') {
            const TRADE_MILESTONES = [1, 5, 10, 25, 50, 100];
            try {
                for (const [userId, role] of [[txn.buyer_id, 'buyer'], [txn.seller_id, 'seller']] as const) {
                    const column = role === 'buyer' ? 'buyer_id' : 'seller_id';
                    const { count } = await supabase
                        .from('transactions')
                        .select('*', { count: 'exact', head: true })
                        .eq(column, userId)
                        .eq('status', 'FINALIZED');
                    if (count && TRADE_MILESTONES.includes(count)) {
                        routeNotification(
                            userId,
                            `🎉 <b>${count} Trade${count > 1 ? 's' : ''} Completed!</b>\n\nYou've now completed <b>${count}</b> secure transaction${count > 1 ? 's' : ''} on Safeeely. You're one of our most active traders. Keep it up!`,
                            [{ label: '🛒 Start Another Trade', customId: 'create_txn' }]
                        ).catch(() => {});
                    }
                }
            } catch { /* non-critical */ }
        }
        // --- END TRANSACTION COUNT MILESTONES ---

        // Notify the OTHER party
        let effectiveUpdaterTag = updater_safetag;
        if (!effectiveUpdaterTag) {
            if (status === 'confirm_receipt') effectiveUpdaterTag = txn.buyer.safetag;
            else if (status.startsWith('complete_')) effectiveUpdaterTag = txn.seller.safetag;
        }

        const buyerIsUpdater = txn.buyer.safetag === effectiveUpdaterTag;
        const recipient = buyerIsUpdater ? txn.seller : txn.buyer;
        const initiatorTag = effectiveUpdaterTag;



        {
            let msg = '';
            let options: any[] = [];

            if (status === 'accept') {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                msg = `✅ <b>Transaction Accepted!</b>\n\n<code>${initiatorTag}</code> just accepted your request for:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n${buyerIsUpdater ? '💼' : '🛒'} Product/Service: <b>${txn.product_name}</b>\n📝 Description: ${txn.description || 'N/A'}\n💰 Amount: **${txn.amount} ${txn.currency}**\n💵 Fee Responsibility: ${txn.fee_allocation}\n💳 Total Amount: <b>${txn.total_amount} ${txn.currency}</b>\n👤 ${buyerIsUpdater ? 'Buyer' : 'Seller'}: <code>${initiatorTag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${!buyerIsUpdater ? `💳 To proceed, please make your payment via the secure payment link below.\n\n🔗 <a href="${reviewsUrl}/pay/${txn.id}">PAYMENT_LINK</a>\n\n📬 You will be notified once the payment is confirmed.` : `⏳ Waiting for buyer to make payment...\n\nYou'll be notified once payment is received and secured in escrow.`}`;
                if (!buyerIsUpdater) {
                    options = [
                        { label: '💳 Pay Now', customId: `txn_pay_${txn.id}` },
                        { label: '📋 View Details', customId: `view_txn_details|${txn.id}` }
                    ];
                } else {
                    options = [
                        { label: '📋 View Details', customId: `view_txn_details|${txn.id}` },
                        { label: '🔙 Main Menu', customId: 'main_menu' }
                    ];
                }
            } else if (status === 'decline') {
                msg = `❌ <b>Transaction Declined</b>\n\n<code>${initiatorTag}</code> just declined your offer for:\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n${buyerIsUpdater ? '💼' : '🛒'} Product/Service: <b>${txn.product_name}</b>\n📝 Description: ${txn.description || 'N/A'}\n💰 Amount: <b>${txn.amount} ${txn.currency}</b>\n💵 Fee Responsibility: ${txn.fee_allocation}\n💳 Total Amount: <b>${txn.total_amount} ${txn.currency}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                options = [
                    { label: '🛒 Create New Transaction', customId: 'create_txn' },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ];
            } else if (status === 'complete_confirmed') {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                msg = `📦 <b>Delivery Update!</b>\n\n<code>${initiatorTag}</code> has marked your order as completed.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product/Service: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📎 Delivery documents are available for review.\n\n🔗 View Delivery Documents: <a href="${reviewsUrl}/delivery/${txn.id}">DOCS_LINK</a>\n\nPlease review the delivery and confirm if you've received everything as expected.\n\n⚠️ You have <b>7 days</b> to confirm receipt or raise a dispute. After that, funds are automatically released to the seller.`;
                options = [
                    { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '👁️ View Documents', customId: `view_docs_${txn.id}` }
                ];
            } else if (status === 'confirm_receipt') {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                msg = `🎉 <b>Transaction Complete</b>\n\nthe buyer has confirmed receipt!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n👤 Buyer: <code>${txn.buyer.safetag}</code>\n💰 Amount: <b>${txn.amount} ${txn.currency}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Funds have been released to your account!\n\n💵 Available Balance: <b>${txn.amount} ${txn.currency}</b>\n\nYou can now:\n• Withdraw your funds\n• Leave a review for the buyer\n• Create a new transaction`;
                const { data: sellerLinked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', txn.seller.id)
                    .eq('is_primary', true)
                    .maybeSingle();
                const sellerWithdrawUrl = sellerLinked
                    ? await buildInternalMagicLink({ profileId: txn.seller.id, safetag: txn.seller.safetag, platform: sellerLinked.platform, platformId: sellerLinked.platform_id, scope: 'withdraw' })
                    : `${reviewsUrl}/withdraw/${encodeURIComponent(txn.seller.safetag)}`;
                options = [
                    { label: '💰 Withdraw Funds', url: sellerWithdrawUrl },
                    { label: '✍️ Leave Review', customId: `leave_review_${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ];
                // Role-based receipt for seller (Standard completion)
                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                (txn as any).receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png?type=completed&v=${Date.now()}`;
            }

            if (msg) {
                const isFinalReceipt = status === 'confirm_receipt';
                const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
                const receiptUrl = isFinalReceipt ? `${apiBaseUrl}/receipts/${(txn as any).txn_code}.png?type=completed` : undefined;

                console.log(`[Transactions] Dispatching status update (${status}) via routeNotification to recipient ${recipient.id}`);

                const recipientEmail: string | undefined = recipient.email;
                let emailFn: (() => void) | undefined;
                if (recipientEmail) {
                    if (status === 'accept' && !buyerIsUpdater) {
                        emailFn = () => sendTransactionAcceptedEmail(recipientEmail, { safetag: recipient.safetag, product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnId: txn.id, txnCode: txn.txn_code });
                    } else if (status === 'decline') {
                        emailFn = () => sendTransactionDeclinedEmail(recipientEmail, { safetag: recipient.safetag, declinerTag: initiatorTag, product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code });
                    } else if (status === 'complete_confirmed') {
                        emailFn = () => sendDeliverySubmittedEmail(recipientEmail, { safetag: recipient.safetag, sellerTag: initiatorTag, product: txn.product_name, txnCode: txn.txn_code, txnId: txn.id });
                    } else if (status === 'confirm_receipt') {
                        emailFn = () => sendTransactionCompletedEmail(recipientEmail, { safetag: recipient.safetag, product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code });
                    }
                }

                routeNotification(recipient.id, msg, options, receiptUrl, emailFn).catch(e => console.error('Background Notification Error:', e));

                const notifTitles: Record<string, string> = {
                    accept: '✅ Transaction Accepted',
                    decline: '❌ Transaction Declined',
                    complete_confirmed: '📦 Delivery Submitted',
                    confirm_receipt: '🎉 Transaction Complete — Funds Released',
                };
                const notifTypes: Record<string, string> = {
                    accept: 'transaction', decline: 'transaction',
                    complete_confirmed: 'transaction',
                    confirm_receipt: 'payment',
                };
                const notifTitle = notifTitles[status] || '🔔 Transaction Update';
                const notifType = notifTypes[status] || 'transaction';
                const notifLinkUrl = status === 'accept'
                    ? `/withdraw/${recipient.safetag}?continue=${txn.id}&txnCode=${txn.txn_code}&txnTitle=${encodeURIComponent(txn.product_name)}`
                    : `/dashboard/transactions/${txn.id}`;
                recordNotification(recipient.id, notifType, notifTitle, `${txn.product_name} · ${txn.amount} ${txn.currency}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: initiatorTag, link_url: notifLinkUrl }).catch(() => {});
            }
        }
        // --- END NOTIFICATION TO OTHER PARTY ---

        // Prompt both parties for feedback after transaction completes (7-day cooldown enforced inside)
        if (status === 'confirm_receipt') {
            maybeSendFeedbackPrompt(txn.buyer.id, 'post_txn_complete', txn.id).catch(() => {});
            maybeSendFeedbackPrompt(txn.seller.id, 'post_txn_complete', txn.id).catch(() => {});
        }

        // Return follow-up info for the person who clicked (the updater)
        let followUpMsg = '';
        let followUpOptions: any[] = [];

        if (status === 'accept') {
            const updaterIsBuyer = txn.buyer.safetag === updater_safetag;
            if (updaterIsBuyer) {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                followUpMsg = `✅ <b>Transaction Accepted!</b>\n\n💳 To proceed, please make your payment via the secure payment link below.\n\n🔗 <a href="${reviewsUrl}/pay/${txn.id}">PAYMENT_LINK</a>\n\n📬 You will be notified once the payment is confirmed.`;
                followUpOptions = [
                    { label: '💳 Pay Now', customId: `txn_pay_${txn.id}` },
                    { label: '📋 View Details', customId: `view_txn_details|${txn.id}` }
                ];
            } else {
                followUpMsg = `✅ <b>Transaction Accepted!</b>\n\n⏳ Waiting for the buyer to make payment...\n\nYou'll be notified once payment is received and secured in escrow.`;
                followUpOptions = [
                    { label: '📋 View Details', customId: `view_txn_details|${txn.id}` },
                    { label: '🔙 Main Menu', customId: 'main_menu' }
                ];
            }
        } else if (status === 'complete_prompt') {
            followUpMsg = `✅ <b>Mark Delivery as Completed</b>\n\nHave you completed your part of the agreement?\n\nPlease confirm:\n• Product has been shipped/delivered\n• Service has been completed\n• Buyer has received everything`;
            followUpOptions = [
                { label: '✅ Yes, Mark as Completed', customId: `txn_action_complete_yes|${txn.id}` },
                { label: '❌ No, Not Yet', customId: 'main_menu' },
                { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
            ];
        } else if (status === 'complete_yes') {
            const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
            followUpMsg = `📎 <b>Upload Proof of Delivery</b>\n\nPlease upload any proof of delivery or confirmation documents now (directly in this chat).\n\nFor multiple or large sized documents, please use our secure upload portal:\n🔗 <a href="${reviewsUrl}/upload/${txn.id}">SECURE_UPLOAD_LINK</a>\n\n⚠️ Uploading proof protects you in case of disputes. Do not skip this step.`;
            followUpOptions = [
                { label: '📎 Upload via Web', url: `${reviewsUrl}/upload/${txn.id}` }
            ];
        } else if (status === 'complete_confirmed') {
            followUpMsg = `✅ <b>Delivery Marked as Completed!</b>\n\nYou've successfully marked the transaction as completed.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n👤 Buyer: <code>${txn.buyer.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📬 The buyer has been notified and can now confirm receipt.\n\n⏳ Waiting for buyer confirmation...\n\nOnce confirmed, funds will be released to your account.`;
            followUpOptions = [
                { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` },
                { label: '🔙 Main Menu', customId: 'main_menu' }
            ];
        } else if (status === 'confirm_receipt') {
            const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
            const cleanTag = txn.buyer.safetag.startsWith('@') ? txn.buyer.safetag : `@${txn.buyer.safetag}`;
            followUpMsg = `🎉 <b>Transaction Complete</b>\n\nthank you for choosing safeeely you are amazing!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n👤 Seller: <code>${txn.seller.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Funds have been released to the seller.\n\n📝 Please take a moment to leave a review on the external Safeeely review site:\n\n🔗 <a href="${reviewsUrl}/reviews/${txn.id}">Leave a Review</a>\n\nYour feedback helps build trust in our community!`;
            followUpOptions = [
                { label: '✍️ Leave Review Now', customId: `leave_review_${txn.id}` },
                { label: '🔙 Main Menu', customId: 'main_menu' }
            ];
            // Role-based receipt for buyer (Marketing loop)
            const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
            const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png?type=completed&role=buyer&v=${Date.now()}`;
            
            return res.json({
                success: true,
                status: newStatus,
                follow_up_msg: followUpMsg,
                follow_up_options: followUpOptions,
                follow_up_receipt_url: receiptUrl
            });
        } else if (status === 'decline') {
            followUpMsg = `❌ <b>Transaction Declined</b>\n\nYou've declined the transaction request for <b>${txn.product_name}</b>.`;
            followUpOptions = [{ label: '🔙 Main Menu', customId: 'main_menu' }];
        } else {
            followUpMsg = `✅ <b>Action Processed!</b>\n\nYour action **${status.replace(/_/g, ' ')}** has been recorded successfully.`;
            followUpOptions = [{ label: '🔙 Main Menu', customId: 'main_menu' }];
        }

        res.json({
            success: true,
            status: newStatus,
            follow_up_msg: followUpMsg,
            follow_up_options: followUpOptions
        });
    } catch (dispatchError: any) {
        console.error('🔥 Notification Dispatch Fatal Error:', dispatchError.message);
        // We still return 200/success because the status DID change in the DB,
        // but the notification engine failed afterward.
        res.json({
            success: true,
            status: newStatus, // or whatever the state became
            follow_up_msg: '✅ Action recorded, but there was a minor issue sending neighbor notifications.',
            follow_up_options: [{ label: '🔙 Main Menu', customId: 'main_menu' }]
        });
    }
});

router.patch('/:id/milestones/:mId/status', requireUserOrBot, async (req, res) => {
    try {
        const isBot = (req as BotOrUserRequest).isBot;
        const user = isBot ? null : (req as AuthedRequest).user;
        const { id, mId } = req.params;
        const { status, proof_url, updater_safetag } = req.body;

        const { data: txn } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
            .eq('id', id)
            .single();

        if (!txn) return res.status(404).json({ error: 'Transaction not found' });

        let actorId: string | null = user?.sub ?? null;
        if (isBot) {
            if (!updater_safetag) return res.status(400).json({ error: 'updater_safetag required' });
            const raw = updater_safetag.startsWith('@') ? updater_safetag : `@${updater_safetag}`;
            const without = raw.slice(1);
            const { data: botProfile } = await supabase.from('profiles').select('id').or(`safetag.ilike.${raw},safetag.ilike.${without}`).maybeSingle();
            if (!botProfile) return res.status(403).json({ error: 'Profile not found' });
            actorId = botProfile.id;
        }

        const isBuyer = actorId === txn.buyer_id;
        const isSeller = actorId === txn.seller_id;
        if (!isBuyer && !isSeller) return res.status(403).json({ error: 'FORBIDDEN' });
        if (status === 'COMPLETED' && !isSeller) return res.status(403).json({ error: 'Only seller can complete a milestone' });
        if (status === 'RELEASED' && !isBuyer) return res.status(403).json({ error: 'Only buyer can release a milestone' });

        const milestone = txn.milestones?.find((m: any) => m.id === mId);
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

        const updates: any = { status };
        if (proof_url) updates.proof_url = proof_url;
        updates.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
            .from('transaction_milestones')
            .update(updates)
            .eq('id', mId);

        if (updateError) throw updateError;

        // Parent status logic
        let newParentStatus = txn.status;
        const allMilestones = txn.milestones.map((m: any) => m.id === mId ? { ...m, ...updates } : m);
        
        const allCompletedOrReleased = allMilestones.every((m: any) => m.status === 'COMPLETED' || m.status === 'RELEASED');
        const allReleased = allMilestones.every((m: any) => m.status === 'RELEASED');

        if (allReleased) {
            newParentStatus = 'FINALIZED';
            // Here we should trigger the full finalize logic (like in /status)
            // For now, update the parent status
            await supabase.from('transactions').update({ status: 'FINALIZED' }).eq('id', txn.id);
        } else if (allCompletedOrReleased) {
            newParentStatus = 'AWAITING_PROOF'; // or COMPLETED_BY_SELLER
            await supabase.from('transactions').update({ status: 'COMPLETED_BY_SELLER' }).eq('id', txn.id);
        }

        // Notify counterparties based on the action
        try {
            const buyerMsg = status === 'COMPLETED' 
                ? `📦 <b>Milestone Completed</b>\n\nThe seller has marked "<b>${milestone.title}</b>" as completed. Please review and release the funds if satisfied.`
                : `💸 <b>Milestone Released</b>\n\nYou have released the funds for "<b>${milestone.title}</b>".`;
            
            const sellerMsg = status === 'COMPLETED'
                ? `✅ <b>Milestone Submitted</b>\n\nYou've marked "<b>${milestone.title}</b>" as completed. Awaiting buyer's release.`
                : `💰 <b>Funds Received!</b>\n\nThe buyer has released the funds for "<b>${milestone.title}</b>". They are now available in your balance.`;

            // Build milestone tracker data for dashboard progress card
            const milestoneLabels = (txn.milestones || []).map((m: any) => m.title);
            const milestoneIndex = (txn.milestones || []).findIndex((m: any) => m.id === mId);
            const milestoneTotal = (txn.milestones || []).length;
            const milestoneNotifData = {
                transaction_id: txn.id, transaction_code: txn.txn_code,
                transaction_title: txn.product_name,
                milestone_index: milestoneIndex,
                milestone_total: milestoneTotal,
                milestone_labels: milestoneLabels,
                amount: milestone.amount, currency: txn.currency,
                link_url: `/dashboard/transactions/${txn.id}`,
            };

            routeNotification(txn.buyer_id, buyerMsg, [], undefined,
                (status === 'RELEASED' && txn.buyer?.email)
                    ? () => sendMilestoneReleasedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, role: 'buyer', milestoneTitle: milestone.title, milestoneIndex, milestoneTotal, amount: milestone.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id })
                    : undefined
            ).catch(() => {});
            routeNotification(txn.seller_id, sellerMsg, [{ label: '✅ View Transaction', customId: `view_txn_${txn.id}` }], undefined,
                (status === 'RELEASED' && txn.seller?.email)
                    ? () => sendMilestoneReleasedEmail(txn.seller.email, { safetag: txn.seller.safetag, role: 'seller', milestoneTitle: milestone.title, milestoneIndex, milestoneTotal, amount: milestone.amount, currency: txn.currency, txnCode: txn.txn_code, txnId: txn.id })
                    : undefined
            ).catch(() => {});

            if (status === 'RELEASED') {
                const releaseTitle = `💰 Milestone Released — ${milestone.title}`;
                const releaseMsg = `Stage ${milestoneIndex + 1} of ${milestoneTotal} · ${milestone.amount} ${txn.currency}`;
                recordNotification(txn.buyer_id, 'milestone', releaseTitle, releaseMsg, milestoneNotifData).catch(() => {});
                recordNotification(txn.seller_id, 'milestone', releaseTitle, releaseMsg, milestoneNotifData).catch(() => {});
            } else if (status === 'COMPLETED') {
                const completedTitle = `📦 Milestone Submitted — ${milestone.title}`;
                const completedMsg = `Stage ${milestoneIndex + 1} of ${milestoneTotal} awaiting release`;
                recordNotification(txn.buyer_id, 'milestone', completedTitle, completedMsg, milestoneNotifData).catch(() => {});
                recordNotification(txn.seller_id, 'milestone', completedTitle, completedMsg, milestoneNotifData).catch(() => {});
            }

            if (allReleased) {
                const finalMsg = `🎉 <b>Project Finalized!</b>\n\nAll milestones for "<b>${txn.product_name}</b>" have been completed and released. The transaction is now officially finalized.`;
                routeNotification(txn.buyer_id, finalMsg, [], undefined,
                    txn.buyer?.email ? () => sendTransactionCompletedEmail(txn.buyer.email, { safetag: txn.buyer.safetag, product: txn.product_name, amount: txn.total_amount, currency: txn.currency, txnCode: txn.txn_code }) : undefined
                ).catch(() => {});
                routeNotification(txn.seller_id, finalMsg, [], undefined,
                    txn.seller?.email ? () => sendTransactionCompletedEmail(txn.seller.email, { safetag: txn.seller.safetag, product: txn.product_name, amount: txn.amount, currency: txn.currency, txnCode: txn.txn_code }) : undefined
                ).catch(() => {});
                const finalTitle = '🎉 Project Finalized!';
                const finalNotifMsg = `All milestones for "${txn.product_name}" completed and released`;
                recordNotification(txn.buyer_id, 'milestone', finalTitle, finalNotifMsg, { ...milestoneNotifData, milestone_index: milestoneTotal - 1 }).catch(() => {});
                recordNotification(txn.seller_id, 'milestone', finalTitle, finalNotifMsg, { ...milestoneNotifData, milestone_index: milestoneTotal - 1 }).catch(() => {});
            }
        } catch (e: any) {
            console.error('Milestone notification error:', e.message);
        }

        res.json({ success: true, parent_status: newParentStatus });
    } catch (err: any) {
        console.error('🔥 Milestone Status Error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// Real binary file upload from the web portal → Supabase Storage
router.post('/:id/upload-proof-files', requireUser, upload.array('files', 10), async (req, res) => {
    const { id } = req.params;
    const user = (req as AuthedRequest).user;
    const files = req.files as Express.Multer.File[];
    try {
        if (!files || files.length === 0) return res.status(400).json({ error: 'No files provided' });

        const { data: txn, error: txnErr } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*)')
            .eq('id', id)
            .single();
        if (txnErr || !txn) return res.status(404).json({ error: 'Transaction not found' });
        if (user.sub !== txn.seller_id) return res.status(403).json({ error: 'Only the seller can upload proof' });

        const proofRecords: any[] = [];
        for (const file of files) {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const fileName = `${id}/${Date.now()}-${safeName}`;
            const { error: storageErr } = await supabase.storage
                .from('transaction-proofs')
                .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });
            if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);

            const { data: { publicUrl } } = supabase.storage
                .from('transaction-proofs').getPublicUrl(fileName);
            proofRecords.push({
                transaction_id: txn.id,
                file_url: publicUrl,
                file_name: file.originalname,
                file_size: file.size,
            });
        }

        const { error: insertError } = await supabase.from('transaction_proofs').insert(proofRecords);
        if (insertError) throw insertError;

        await supabase.from('transactions').update({ status: 'COMPLETED_BY_SELLER', updated_at: new Date().toISOString() }).eq('id', txn.id);

        // Notify buyer
        const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        const buyerProofMsg = `📦 <b>Delivery Update!</b>\n\n<code>${txn.seller.safetag}</code> has uploaded <b>${files.length} proof file(s)</b> for your order.\n\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n\n🔗 <a href="${reviewsUrl}/delivery/${txn.id}">View Documents Portal</a>\n\n⚠️ You have <b>7 days</b> to confirm receipt or raise a dispute. If no action is taken, funds will be automatically released to the seller.`;
        routeNotification(txn.buyer_id, buyerProofMsg, [
            { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
            { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
            { label: '🔗 View Proofs', url: `${reviewsUrl}/delivery/${txn.id}` },
        ]).catch(e => console.error('Background Notification Error:', e));
        recordNotification(txn.buyer_id, 'transaction', '📦 Delivery Proof Uploaded', `${txn.seller.safetag} submitted ${files.length} proof file(s) for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: txn.seller.safetag, link_url: `/delivery/${txn.id}` }).catch(() => {});

        // Notify seller
        const sellerProofMsg = `✅ <b>Proof Uploaded!</b>\n\nBuyer notified for <b>${txn.product_name}</b> — awaiting confirmation.\n📋 ID: <b>${txn.txn_code}</b>`;
        routeNotification(txn.seller_id, sellerProofMsg, []).catch(e => console.error('Background Notification Error:', e));
        recordNotification(txn.seller_id, 'transaction', '✅ Proof Upload Confirmed', `Buyer notified for ${txn.product_name} — awaiting confirmation`, { transaction_id: txn.id, transaction_code: txn.txn_code, link_url: `/delivery/${txn.id}` }).catch(() => {});

        res.json({ success: true, count: proofRecords.length });
    } catch (err: any) {
        console.error('❌ Error in upload-proof-files:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/upload-proofs', async (req, res) => {
    const { id } = req.params;
    const { proofs } = req.body;
    try {
        console.log(`📂 Receiving proofs for Transaction ID: ${id}`);
        let txn, fetchError;

        if (typeof id === 'string' && id.startsWith('TXN-')) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else if (isUUID(id)) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('id', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        }

        if (fetchError || !txn) {
            console.error(`❌ Transaction ${id} not found:`, fetchError?.message);
            return res.status(404).json({ error: `Transaction ${id} not found` });
        }

        // Save to transaction_proofs table
        if (proofs && Array.isArray(proofs)) {
            console.log(`  -> Inserting ${proofs.length} proofs for ${txn.id}`);
            const inserts = proofs.map((p: any) => ({
                transaction_id: txn.id,
                file_url: p.url,
                file_name: p.name,
                file_size: Math.round(p.size || 0)
            }));
            const { error: insertError } = await supabase.from('transaction_proofs').insert(inserts);
            if (insertError) {
                console.error('  -> Proofs Insert Error:', insertError.message);
                throw insertError;
            }
        }

        const { error: updateError } = await supabase.from('transactions').update({
            status: 'COMPLETED_BY_SELLER',
            updated_at: new Date().toISOString()
        }).eq('id', txn.id);

        if (updateError) {
            console.error('  -> Status Update Error:', updateError.message);
            throw updateError;
        }

        // Notify Buyer
        const reviewsUrlUp = process.env.REVIEWS_URL || 'http://localhost:3001';
        const buyerUploadMsg = `📦 <b>Delivery Update!</b>\n\n<code>${txn.seller.safetag}</code> has marked your order as completed and uploaded <b>${proofs?.length || 0} proof document(s)</b>.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📁 <b>Uploaded Files:</b>\n${proofs?.map((p: any) => `• <a href="${p.url}">${p.name || 'View File'}</a>`).join('\n') || '<i>No specific files attached</i>'}\n\n🔗 Full Documents Portal: <a href="${reviewsUrlUp}/delivery/${txn.id}">VIEW_PORTAL</a>\n\nPlease review the delivery carefully before confirming receipt.\n\n⚠️ You have <b>7 days</b> to confirm receipt or raise a dispute. If no action is taken, funds will be automatically released to the seller.`;
        routeNotification(txn.buyer_id, buyerUploadMsg, [
            { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
            { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
            { label: '🔗 View Proofs', url: `${reviewsUrlUp}/delivery/${txn.id}` },
        ]).catch(e => console.error('Background Notification Error:', e));
        recordNotification(txn.buyer_id, 'transaction', '📦 Delivery Proof Uploaded', `${txn.seller.safetag} submitted ${proofs?.length || 0} proof file(s) for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: txn.seller.safetag, link_url: `/delivery/${txn.id}` }).catch(() => {});

        // Notify Seller (External Upload Case)
        const sellerUploadMsg = `✅ <b>Proof Uploaded Successfully!</b>\n\nThe buyer has been notified and can now review the delivery.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        routeNotification(txn.seller_id, sellerUploadMsg, [
            { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` }
        ]).catch(e => console.error('Background Notification Error:', e));
        recordNotification(txn.seller_id, 'transaction', '✅ Proof Upload Confirmed', `Buyer notified for ${txn.product_name} — awaiting confirmation`, { transaction_id: txn.id, transaction_code: txn.txn_code, link_url: `/delivery/${txn.id}` }).catch(() => {});

        res.json({ success: true });
    } catch (err: any) {
        console.error('❌ Error in upload-proofs:', err);
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/upload-proof', async (req, res) => {
    const { id } = req.params;
    const { proof_url } = req.body;
    try {
        let txn, fetchError;

        if (typeof id === 'string' && id.startsWith('TXN-')) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else if (isUUID(id)) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('id', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        }

        if (fetchError || !txn) return res.status(404).json({ error: 'Transaction not found' });

        console.log(`  -> Updating status for ${txn.id} to COMPLETED_BY_SELLER`);
        const { error: updateError } = await supabase.from('transactions').update({ status: 'COMPLETED_BY_SELLER' }).eq('id', txn.id);
        if (updateError) {
            console.error('  -> Status Update Error:', updateError.message);
            throw updateError;
        }

        // Save to transaction_proofs table
        console.log(`  -> Inserting singular proof for ${txn.id}`);
        const { error: insertError } = await supabase.from('transaction_proofs').insert({
            transaction_id: txn.id,
            file_url: proof_url,
            file_name: req.body.file_name || `Proof (${new Date().toISOString().slice(0, 10)})`,
            file_size: req.body.file_size || 0
        });

        if (insertError) {
            console.error('  -> Proof Insert Error:', insertError.message);
            throw insertError;
        }

        // Notify Buyer
        const reviewsUrlSingle = process.env.REVIEWS_URL || 'http://localhost:3001';
        const singleProofMsg = `📦 <b>Delivery Update with Proof!</b>\n\n<code>${txn.seller.safetag}</code> has delivered your order and uploaded proof.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n📎 Proof Attached Below\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease review the delivery and confirm receipt.\n\n🖼️ <b>Proof Image:</b> ${proof_url}\n\n🔗 View All Documents: <a href="${reviewsUrlSingle}/delivery/${txn.id}">DOCS_LINK</a>\n\n⚠️ You have <b>7 days</b> to confirm receipt or raise a dispute. If no action is taken, funds will be automatically released to the seller.`;
        routeNotification(txn.buyer_id, singleProofMsg, [
            { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
            { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
            { label: '🔗 View Proofs', url: `${reviewsUrlSingle}/delivery/${txn.id}` },
        ]).catch(e => console.error('Background Notification Error:', e));
        recordNotification(txn.buyer_id, 'transaction', '📦 Delivery Proof Uploaded', `${txn.seller.safetag} submitted proof for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: txn.seller.safetag, link_url: `/delivery/${txn.id}` }).catch(() => {});

        // Notify Seller
        const sellerSingleMsg = `✅ <b>Proof Uploaded Successfully!</b>\n\nThe buyer has been notified and can now review the delivery.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        routeNotification(txn.seller_id, sellerSingleMsg, [
            { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` }
        ]).catch(e => console.error('Background Notification Error:', e));
        recordNotification(txn.seller_id, 'transaction', '✅ Proof Upload Confirmed', `Buyer notified for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, link_url: `/delivery/${txn.id}` }).catch(() => {});
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/initialize-payment', async (req, res) => {
    const { id } = req.params;
    const { platform } = req.body;
    try {
        let txn, fetchError;

        if (typeof id === 'string' && id.startsWith('TXN-')) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else if (isUUID(id)) {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('id', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        } else {
            const result = await supabase
                .from('transactions')
                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                .eq('txn_code', id)
                .single();
            txn = result.data;
            fetchError = result.error;
        }

        if (fetchError || !txn) return res.status(404).json({ error: 'Transaction not found' });

        console.log(`🚀 [Payment] Initializing ${platform} for transaction ${txn.txn_code}`);

        if (platform?.toLowerCase() === 'opay') {
            const publicKey = process.env.OPAY_PUBLIC_KEY;
            const merchantId = process.env.OPAY_MERCHANT_ID;
            const dynamicOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.REVIEWS_URL || 'http://localhost:3001';
            const reviewsUrl = dynamicOrigin;

            if (!publicKey || !merchantId) {
                console.error('❌ OPay Configuration Missing (Public Key or MerchantID)');
                return res.status(500).json({ error: 'Payment configuration error' });
            }

            // OPay Payload (Aligned with Official Manual)
            const payload = {
                country: "NG",
                reference: txn.txn_code + '_' + Date.now(),
                amount: {
                    total: Math.round(txn.total_amount * 100),
                    currency: txn.currency === 'USD' ? 'USD' : 'NGN'
                },
                returnUrl: `${reviewsUrl}/pay/success/${txn.id}`,
                callbackUrl: `${process.env.API_URL}/payments/opay/webhook`,
                cancelUrl: `${reviewsUrl}/pay/${txn.id}`,
                product: {
                    name: txn.product_name,
                    description: txn.description || 'Safeeely Protected Escrow'
                },
                expireAt: 30
            };

            const tryOpay = async (url: string) => {
                console.log(`🚀 Triggering OPay Cashier: ${url}`);
                const response = await axios.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${publicKey}`,
                        'MerchantId': merchantId,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                return response.data;
            };

            // Aligned with OPay Cashier Documentation
            const endpoints = [
                'https://testapi.opaycheckout.com/api/v1/international/cashier/create',
                'https://liveapi.opaycheckout.com/api/v1/international/cashier/create'
            ];

            for (const url of endpoints) {
                try {
                    const result = await tryOpay(url);
                    console.log(`📥 OPay Response (${url.includes('international') ? 'INTL' : 'STD'}):`, JSON.stringify(result));

                    if (result.code === '00000' || result.code === '0000') {
                        // Docs show result.data.cashierUrl for international
                        return res.json({
                            checkoutUrl: result.data.cashierUrl || result.data.checkoutUrl,
                            reference: payload.reference
                        });
                    }

                    // Specific OPay Error Codes
                    if (result.code === '02000') {
                        console.error('❌ OPay Auth Failed. Check your Public Key and MerchantID.');
                    }
                } catch (apiErr: any) {
                    const errorDetail = apiErr.response?.data || apiErr.message;
                    console.error(`❌ OPay Request Failed at ${url}:`, JSON.stringify(errorDetail));
                }
            }

            return res.status(500).json({ error: 'Failed to create OPay session. Please check your dashboard settings or keys.' });
        } else if (platform?.toLowerCase() === 'flutterwave') {
            const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
            if (!secretKey) {
                console.error('FATAL: FLUTTERWAVE_SECRET_KEY env var is not set');
                return res.status(503).json({ error: 'Payment gateway not configured' });
            }
            const dynamicOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.REVIEWS_URL || 'http://localhost:3001';

            const payload = {
                tx_ref: `${txn.txn_code}_${Date.now()}`,
                amount: txn.total_amount,
                currency: txn.currency === 'USD' ? 'USD' : 'NGN',
                redirect_url: `${dynamicOrigin}/pay/success/${txn.id}`,
                payment_options: "card,banktransfer,ussd",
                customer: {
                    email: txn.buyer?.email || "customer@safeeely.com",
                    name: `${txn.buyer?.first_name || ''} ${txn.buyer?.last_name || ''}`.trim() || txn.buyer?.safetag
                },
                customizations: {
                    title: "Safeeely Protection",
                    description: `Payment for ${txn.product_name}`,
                    logo: "https://safeeely.com/logo.png"
                }
            };

            try {
                const response = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
                    headers: {
                        Authorization: `Bearer ${secretKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data.status === 'success') {
                    return res.json({ checkoutUrl: response.data.data.link });
                }
                throw new Error(response.data.message || 'Flutterwave initialization failed');
            } catch (err: any) {
                console.error('❌ Flutterwave Error:', err.response?.data || err.message);
                return res.status(500).json({ error: 'Failed to initialize Flutterwave payment' });
            }
        } else if (platform?.toLowerCase() === 'airwallex') {
            const clientId = process.env.AIRWALLEX_CLIENT_ID;
            const apiKey = process.env.AIRWALLEX_API_KEY;
            const dynamicOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.REVIEWS_URL || 'http://localhost:3001';
            const reviewsUrl = dynamicOrigin;
            const apiUrl = process.env.AIRWALLEX_ENV === 'production'
                ? 'https://api.airwallex.com'
                : 'https://api-demo.airwallex.com';

            const checkoutBaseUrl = process.env.AIRWALLEX_ENV === 'production'
                ? 'https://checkout.airwallex.com'
                : 'https://checkout-demo.airwallex.com';

            if (!clientId || !apiKey) {
                console.error('❌ Airwallex Configuration Missing (Client ID or API Key)');
                return res.status(500).json({ error: 'Payment configuration error' });
            }

            try {
                // 1. Authenticate to Airwallex
                console.log('🚀 Authenticating with Airwallex...');
                const authRes = await axios.post(`${apiUrl}/api/v1/authentication/login`, {}, {
                    headers: {
                        'x-client-id': clientId,
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json'
                    }
                });
                const token = authRes.data.token;

                // 2. Create Payment Intent
                console.log('🚀 Creating Airwallex Payment Intent...');
                const piPayload = {
                    request_id: `${txn.txn_code}_${Date.now()}`,
                    amount: Number(txn.total_amount.toFixed(2)),
                    currency: txn.currency === 'USD' ? 'USD' : (txn.currency === 'EUR' ? 'EUR' : 'NGN'), // Airwallex might not support NGN natively everywhere, but we pass it
                    merchant_order_id: txn.txn_code,
                    return_url: `${reviewsUrl}/pay/success/${txn.id}`,
                    // Required fields for hosted payment page redirection
                    descriptor: 'Safeeely Escrow',
                    metadata: {
                        transaction_id: txn.id,
                        buyer_safetag: txn.buyer.safetag,
                        seller_safetag: txn.seller.safetag
                    }
                };

                const piRes = await axios.post(`${apiUrl}/api/v1/pa/payment_intents/create`, piPayload, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const intentId = piRes.data.id;
                console.log(`✅ Airwallex Intent Created: ${intentId}`);

                // Return Hosted Payment Page URL
                return res.json({
                    checkoutUrl: `${checkoutBaseUrl}/pay/${intentId}`,
                    reference: piPayload.request_id
                });
            } catch (awxErr: any) {
                const errorDetail = awxErr.response?.data || awxErr.message;
                console.error('❌ Airwallex Creation Failed:', JSON.stringify(errorDetail));
                return res.status(500).json({ error: 'Airwallex session failed to initialize. Try again.' });
            }
        } else if (platform?.toLowerCase() === 'chainrails') {
            const apiKey = process.env.CHAINRAILS_API_KEY;
            const recipientAddress = process.env.CHAINRAILS_RECIPIENT_ADDRESS;
            const destinationChain = process.env.CHAINRAILS_DESTINATION_CHAIN || 'BASE_MAINNET';
            const tokenOut = process.env.CHAINRAILS_TOKEN_OUT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

            if (!apiKey) {
                console.error('❌ ChainRails configuration missing (API key)');
                return res.status(500).json({ error: 'Payment configuration error' });
            }
            if (!recipientAddress) {
                console.error('❌ ChainRails CHAINRAILS_RECIPIENT_ADDRESS not set');
                return res.status(500).json({ error: 'Escrow wallet address not configured for crypto payments' });
            }

            try {
                console.log(`🚀 Creating ChainRails modal session for ${txn.txn_code}`);
                const sessionRes = await axios.post(
                    'https://api.chainrails.io/api/v1/modal/sessions',
                    {
                        recipient: recipientAddress,
                        tokenOut,
                        destinationChain,
                        amount: String(txn.total_amount)
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000
                    }
                );

                const { sessionId, sessionToken } = sessionRes.data;
                console.log(`✅ ChainRails session created: ${sessionId}`);

                // Persist sessionId so the webhook can look up this transaction later
                await supabase.from('transactions').update({
                    metadata: { ...(txn.metadata || {}), chainrails_session_id: sessionId }
                }).eq('id', txn.id);

                return res.json({
                    sessionToken,
                    sessionId,
                    checkoutUrl: `https://app.chainrails.io/checkout?token=${sessionToken}`
                });
            } catch (crErr: any) {
                const errDetail = crErr.response?.data || crErr.message;
                console.error('❌ ChainRails Session Error:', JSON.stringify(errDetail));
                return res.status(500).json({ error: 'Failed to initialize ChainRails payment. Please try again.' });
            }
        }

        res.status(400).json({ error: `Unsupported payment platform: ${platform}` });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Dedicated session endpoint called directly by the ChainRails SDK (usePaymentSession)
router.get('/:id/chainrails-session', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: txn, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !txn) return res.status(404).json({ error: 'Transaction not found' }) as any;

        const apiKey = process.env.CHAINRAILS_API_KEY;
        const recipientAddress = process.env.CHAINRAILS_RECIPIENT_ADDRESS;
        const destinationChain = process.env.CHAINRAILS_DESTINATION_CHAIN || 'BASE_MAINNET';
        const tokenOut = process.env.CHAINRAILS_TOKEN_OUT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

        if (!apiKey) return res.status(500).json({ error: 'Payment configuration error' }) as any;
        if (!recipientAddress) return res.status(500).json({ error: 'Escrow wallet address not configured' }) as any;

        console.log(`🚀 ChainRails session requested for ${txn.txn_code}`);
        const sessionRes = await axios.post(
            'https://api.chainrails.io/api/v1/modal/sessions',
            { recipient: recipientAddress, tokenOut, destinationChain, amount: String(txn.total_amount) },
            { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const { sessionId } = sessionRes.data;
        console.log(`✅ ChainRails session created: ${sessionId}`);

        await supabase.from('transactions').update({
            metadata: { ...(txn.metadata || {}), chainrails_session_id: sessionId }
        }).eq('id', id);

        res.json(sessionRes.data);
    } catch (err: any) {
        console.error('❌ ChainRails Session Error:', JSON.stringify(err.response?.data || err.message));
        res.status(500).json({ error: 'Failed to initialize ChainRails session' });
    }
});

export default router;
