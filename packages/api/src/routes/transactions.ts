import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification, sendReferralNotification, recordNotification } from '../services/notifications';
import { sendTransactionInvoiceEmail } from '../services/email';
import crypto from 'crypto';
import axios from 'axios';

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
                    transaction_type: data.transaction_type
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

        const { data: linkedAccounts, error: accountError } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', recipientId)
            .eq('is_primary', true)
            .single();

        if (linkedAccounts) {
            const who = isBuyerInitiated ? 'Buyer' : 'Seller';
            const otherWho = isBuyerInitiated ? 'Seller' : 'Buyer';
            const otherTag = isBuyerInitiated ? data.buyer_safetag : data.seller_safetag;

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

            sendNotification(linkedAccounts.platform, linkedAccounts.platform_id, msg, [
                { label: '✅ Accept', customId: `txn_action_accept|${txn.id}` },
                { label: '❌ Decline', customId: `txn_action_decline|${txn.id}` },
                { label: '⭐ View Reviews', url: `${reviewsUrl}/reviews/${encodeURIComponent(otherTag)}?viewer=${encodeURIComponent(recipientTag)}` }
            ]).catch(e => console.error('Background Notification Error:', e));
            recordNotification(recipientId, 'transaction', '🔔 New Transaction Request', `${otherTag} sent you a ${data.transaction_type === 'MILESTONE' ? 'milestone project' : 'trade'} request for ${data.product_name}`, { transaction_id: txn.id, transaction_code: txnCode, amount: data.amount, currency: data.currency, counterparty_name: otherTag, link_url: `/withdraw/${encodeURIComponent(isBuyerInitiated ? seller.safetag : buyer.safetag)}?continue=${txn.id}&txnCode=${txnCode}&txnTitle=${encodeURIComponent(data.product_name || '')}` }).catch(() => {});
            console.log(`[Notification Engine] Dispatched to ${linkedAccounts.platform} user ${linkedAccounts.platform_id}`);
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

router.patch('/:id/status', async (req, res) => {
    let newStatus: string = '';
    let txn: any, fetchError: any;
    try {
        const { id } = req.params;
        const { status, updater_safetag } = req.body;

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

        newStatus = txn.status;
        if (status === 'accept') newStatus = 'ACCEPTED';
        else if (status === 'decline') newStatus = 'DECLINED';
        else if (status === 'complete_yes') newStatus = 'AWAITING_PROOF';
        else if (status === 'complete_confirmed' || status === 'complete_skip') newStatus = 'COMPLETED_BY_SELLER';
        else if (status === 'confirm_receipt') newStatus = 'FINALIZED';

        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', txn.id);

        if (updateError) throw updateError;

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

        // Notify the OTHER party
        let effectiveUpdaterTag = updater_safetag;
        if (!effectiveUpdaterTag) {
            if (status === 'confirm_receipt') effectiveUpdaterTag = txn.buyer.safetag;
            else if (status.startsWith('complete_')) effectiveUpdaterTag = txn.seller.safetag;
        }

        const buyerIsUpdater = txn.buyer.safetag === effectiveUpdaterTag;
        const recipient = buyerIsUpdater ? txn.seller : txn.buyer;
        const initiatorTag = effectiveUpdaterTag;



        const { data: linked, error: linkError } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', recipient.id)
            .eq('is_primary', true)
            .single();



        if (linked) {
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
            } else if (status === 'complete_confirmed' || status === 'complete_skip') {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                msg = `📦 <b>Delivery Update!</b>\n\n<code>${initiatorTag}</code> has marked your order as completed.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product/Service: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${status === 'complete_skip' ? '⚠️ <i>Seller skipped formal proof upload, but marked as delivered.</i>' : '📎 Delivery documents are available for review.'}\n\n🔗 View Delivery Documents: <a href="${reviewsUrl}/delivery/${txn.id}">DOCS_LINK</a>\n\nPlease review the delivery and confirm if you've received everything as expected.`;
                options = [
                    { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                    { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                    { label: '👁️ View Documents', customId: `view_docs_${txn.id}` }
                ];
            } else if (status === 'confirm_receipt') {
                const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
                msg = `🎉 <b>Transaction Complete</b>\n\nthe buyer has confirmed receipt!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n👤 Buyer: <code>${txn.buyer.safetag}</code>\n💰 Amount: <b>${txn.amount} ${txn.currency}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Funds have been released to your account!\n\n💵 Available Balance: <b>${txn.amount} ${txn.currency}</b>\n\nYou can now:\n• Withdraw your funds\n• Leave a review for the buyer\n• Create a new transaction`;
                options = [
                    { label: '💰 Withdraw Funds', url: `${reviewsUrl}/withdraw/${encodeURIComponent(txn.seller.safetag)}?viewer=${encodeURIComponent(txn.seller.safetag)}` },
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

                if (isFinalReceipt) {
                    console.log(`[Transactions] Finalized Receipt URL: ${receiptUrl}`);
                } else {
                    console.log(`[Transactions] Dispatching status update (${status}) to: ${linked.platform} (${linked.platform_id})`);
                }

                sendNotification(linked.platform, linked.platform_id, msg, options, receiptUrl).catch(e => console.error('Background Notification Error:', e));

                const notifTitles: Record<string, string> = {
                    accept: '✅ Transaction Accepted',
                    decline: '❌ Transaction Declined',
                    complete_confirmed: '📦 Delivery Submitted',
                    complete_skip: '📦 Delivery Submitted',
                    confirm_receipt: '🎉 Transaction Complete — Funds Released',
                };
                const notifTypes: Record<string, string> = {
                    accept: 'transaction', decline: 'transaction',
                    complete_confirmed: 'transaction', complete_skip: 'transaction',
                    confirm_receipt: 'payment',
                };
                const notifTitle = notifTitles[status] || '🔔 Transaction Update';
                const notifType = notifTypes[status] || 'transaction';
                // For 'accept': buyer is the recipient — link opens the ContinueTransaction modal
                const notifLinkUrl = status === 'accept'
                    ? `/withdraw/${recipient.safetag}?continue=${txn.id}&txnCode=${txn.txn_code}&txnTitle=${encodeURIComponent(txn.product_name)}`
                    : `/dashboard/transactions/${txn.id}`;
                recordNotification(recipient.id, notifType, notifTitle, `${txn.product_name} · ${txn.amount} ${txn.currency}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: initiatorTag, link_url: notifLinkUrl }).catch(() => {});
            }
        } else {
            console.warn(`[Transactions] No primary linked account found for recipient: ${recipient.id}`);
        }
        // --- END NOTIFICATION TO OTHER PARTY ---

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
            followUpMsg = `📎 <b>Upload Proof of Delivery</b>\n\nPlease upload any proof of delivery or confirmation documents now (directly in this chat).\n\nFor multiple or large sized documents, please use our secure external link:\n🔗 <a href="${reviewsUrl}/upload/${txn.id}">SECURE_UPLOAD_LINK</a>\n\n⏱️ Link expires in 2 hours.`;
            followUpOptions = [
                { label: '📎 External Upload', url: `${reviewsUrl}/upload/${txn.id}` },
                { label: 'Skip (not recommended)', customId: `txn_action_complete_skip|${txn.id}` }
            ];
        } else if (status === 'complete_confirmed' || status === 'complete_skip') {
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

router.patch('/:id/milestones/:mId/status', async (req, res) => {
    try {
        const { id, mId } = req.params;
        const { status, proof_url } = req.body; // status can be COMPLETED, RELEASED

        const { data: txn } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
            .eq('id', id)
            .single();

        if (!txn) return res.status(404).json({ error: 'Transaction not found' });

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

            const buyerAcc = await supabase.from('linked_accounts').select('*').eq('profile_id', txn.buyer_id).eq('is_primary', true).maybeSingle();
            const sellerAcc = await supabase.from('linked_accounts').select('*').eq('profile_id', txn.seller_id).eq('is_primary', true).maybeSingle();

            if (buyerAcc.data) await sendNotification(buyerAcc.data.platform, buyerAcc.data.platform_id, buyerMsg);
            if (sellerAcc.data) await sendNotification(sellerAcc.data.platform, sellerAcc.data.platform_id, sellerMsg);

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

            if (status === 'RELEASED') {
                const releaseTitle = `💰 Milestone Released — ${milestone.title}`;
                const releaseMsg = `Stage ${milestoneIndex + 1} of ${milestoneTotal} · ${milestone.amount} ${txn.currency}`;
                if (buyerAcc.data) recordNotification(txn.buyer_id, 'milestone', releaseTitle, releaseMsg, milestoneNotifData).catch(() => {});
                if (sellerAcc.data) recordNotification(txn.seller_id, 'milestone', releaseTitle, releaseMsg, milestoneNotifData).catch(() => {});
            } else if (status === 'COMPLETED') {
                const completedTitle = `📦 Milestone Submitted — ${milestone.title}`;
                const completedMsg = `Stage ${milestoneIndex + 1} of ${milestoneTotal} awaiting release`;
                if (buyerAcc.data) recordNotification(txn.buyer_id, 'milestone', completedTitle, completedMsg, milestoneNotifData).catch(() => {});
                if (sellerAcc.data) recordNotification(txn.seller_id, 'milestone', completedTitle, completedMsg, milestoneNotifData).catch(() => {});
            }

            if (allReleased) {
                 const finalMsg = `🎉 <b>Project Finalized!</b>\n\nAll milestones for "<b>${txn.product_name}</b>" have been completed and released. The transaction is now officially finalized.`;
                 if (buyerAcc.data) await sendNotification(buyerAcc.data.platform, buyerAcc.data.platform_id, finalMsg);
                 if (sellerAcc.data) await sendNotification(sellerAcc.data.platform, sellerAcc.data.platform_id, finalMsg);
                 const finalTitle = '🎉 Project Finalized!';
                 const finalNotifMsg = `All milestones for "${txn.product_name}" completed and released`;
                 if (buyerAcc.data) recordNotification(txn.buyer_id, 'milestone', finalTitle, finalNotifMsg, { ...milestoneNotifData, milestone_index: milestoneTotal - 1 }).catch(() => {});
                 if (sellerAcc.data) recordNotification(txn.seller_id, 'milestone', finalTitle, finalNotifMsg, { ...milestoneNotifData, milestone_index: milestoneTotal - 1 }).catch(() => {});
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
        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', txn.buyer_id)
            .eq('is_primary', true)
            .single();

        if (linked) {
            const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
            let msg = `📦 <b>Delivery Update!</b>\n\n<code>${txn.seller.safetag}</code> has marked your order as completed and uploaded <b>${proofs?.length || 0} proof document(s)</b>.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📁 <b>Uploaded Files:</b>\n${proofs?.map((p: any) => `• <a href="${p.url}">${p.name || 'View File'}</a>`).join('\n') || '<i>No specific files attached</i>'}\n\n🔗 Full Documents Portal: <a href="${reviewsUrl}/delivery/${txn.id}">VIEW_PORTAL</a>\n\nPlease review the delivery carefully before confirming receipt.`;

            sendNotification(linked.platform, linked.platform_id, msg, [
                { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                { label: '👁️ View Documents', customId: `view_docs_${txn.id}` }
            ]).catch(e => console.error('Background Notification Error:', e));
            recordNotification(txn.buyer_id, 'transaction', '📦 Delivery Proof Uploaded', `${txn.seller.safetag} submitted ${proofs?.length || 0} proof file(s) for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: txn.seller.safetag, link_url: `/delivery/${txn.id}` }).catch(() => {});
        }

        // Notify Seller (External Upload Case)
        const { data: sellerLinked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', txn.seller_id)
            .eq('is_primary', true)
            .single();

        if (sellerLinked) {
            const sellerMsg = `✅ <b>Proof Uploaded Successfully!</b>\n\nThe buyer has been notified and can now review the delivery.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            sendNotification(sellerLinked.platform, sellerLinked.platform_id, sellerMsg, [
                { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` }
            ]).catch(e => console.error('Background Notification Error:', e));
            recordNotification(txn.seller_id, 'transaction', '✅ Proof Upload Confirmed', `Buyer notified for ${txn.product_name} — awaiting confirmation`, { transaction_id: txn.id, transaction_code: txn.txn_code, link_url: `/delivery/${txn.id}` }).catch(() => {});
        }

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
            file_name: 'Discord Upload (Image)',
            file_size: 0
        });

        if (insertError) {
            console.error('  -> Proof Insert Error:', insertError.message);
            throw insertError;
        }

        // Notify Buyer
        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', txn.buyer_id)
            .eq('is_primary', true)
            .single();

        if (linked) {
            const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
            const msg = `📦 <b>Delivery Update with Proof!</b>\n\n<code>${txn.seller.safetag}</code> has delivered your order and uploaded proof.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n📎 Proof Attached Below\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease review the delivery and confirm receipt.`;
            const fullMsg = `${msg}\n\n🖼️ <b>Proof Image:</b> ${proof_url}\n\n🔗 View All Documents: <a href="${reviewsUrl}/delivery/${txn.id}">DOCS_LINK</a>`;

            sendNotification(linked.platform, linked.platform_id, fullMsg, [
                { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${txn.id}` },
                { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
            ]).catch(e => console.error('Background Notification Error:', e));
            recordNotification(txn.buyer_id, 'transaction', '📦 Delivery Proof Uploaded', `${txn.seller.safetag} submitted proof for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, counterparty_name: txn.seller.safetag, link_url: `/delivery/${txn.id}` }).catch(() => {});
        }

        // Notify Seller
        const { data: sellerLinked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', txn.seller_id)
            .eq('is_primary', true)
            .single();

        if (sellerLinked) {
            const sellerMsg = `✅ <b>Proof Uploaded Successfully!</b>\n\nThe buyer has been notified and can now review the delivery.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n🛒 Product: <b>${txn.product_name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            sendNotification(sellerLinked.platform, sellerLinked.platform_id, sellerMsg, [
                { label: '👁️ View Transaction', customId: `view_txn_details|${txn.id}` }
            ]).catch(e => console.error('Background Notification Error:', e));
            recordNotification(txn.seller_id, 'transaction', '✅ Proof Upload Confirmed', `Buyer notified for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, link_url: `/delivery/${txn.id}` }).catch(() => {});
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/pay', async (req, res) => {
    const { id } = req.params;
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

        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: 'PAID' })
            .eq('id', id);

        if (updateError) throw updateError;

        // Notify Buyer
        const { data: buyerLinked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', txn.buyer_id)
            .eq('is_primary', true)
            .maybeSingle();

        if (buyerLinked) {
            const msg = `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Paid: <b>${txn.total_amount} ${txn.currency}</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller has been notified and can now proceed to fulfill the order.\n\nYou'll be notified when:\n• Seller marks delivery as completed\n• Delivery documents are available\n• It's time to confirm receipt`;

            const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
            const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

            sendNotification((buyerLinked as any).platform, (buyerLinked as any).platform_id, msg, [
                { label: '👁️ View Transaction', customId: `view_txn_${txn.id}` },
                { label: '❌ Raise Dispute', customId: `txn_dispute_${txn.id}` },
                { label: '🔙 Main Menu', customId: 'main_menu' }
            ], receiptUrl).catch(e => console.error('Background Notification Error:', e));
            recordNotification(txn.buyer_id, 'payment', '✅ Payment Confirmed', `${txn.total_amount} ${txn.currency} secured in escrow for ${txn.product_name}`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.total_amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
        }

        // Notify Seller
        const { data: sellerLinked, error: sellerAccErr } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', txn.seller_id)
            .eq('is_primary', true)
            .maybeSingle();

        if (sellerAccErr) console.error('❌ Seller account lookup error:', sellerAccErr.message);

        if (sellerLinked) {
            const msg = `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Transaction ID: <b>${txn.txn_code}</b>\n💰 Amount Secured: <b>${txn.amount} ${txn.currency}</b>\n👤 Buyer: <code>${txn.buyer.safetag}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Seller, you can now proceed to fulfill the order.\n\n❓ Have you completed your part of the agreement?\n   (Shipped the product or delivered the service)\n\n⚠️ Important: Please be sure the buyer has received satisfactory delivery — any disputes raised after confirmation won't be considered.`;

            const apiBaseUrl = process.env.API_URL || 'http://localhost:3000/api';
            const receiptUrl = `${apiBaseUrl}/receipts/${txn.txn_code}.png`;

            sendNotification((sellerLinked as any).platform, (sellerLinked as any).platform_id, msg, [
                { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${txn.id}` },
                { label: '🔄 New Transaction', customId: 'create_txn' },
                { label: '👁️ View Details', customId: `view_txn_${txn.id}` }
            ], receiptUrl).catch(e => console.error('Background Notification Error:', e));
            recordNotification(txn.seller_id, 'payment', '🔐 Payment Received in Escrow', `${txn.amount} ${txn.currency} secured for ${txn.product_name} — proceed to fulfill`, { transaction_id: txn.id, transaction_code: txn.txn_code, amount: txn.amount, currency: txn.currency, link_url: `/receipt/${txn.id}` }).catch(() => {});
        } else {
            console.warn('⚠️ No primary linked account found for seller:', txn.seller_id);
        }

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
            const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-d37f68bfe20c57467bcfad91ae51881c-X';
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

export default router;
