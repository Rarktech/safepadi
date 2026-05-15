import { Router, Request, Response } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification, routeNotification, recordNotification } from '../services/notifications';
import { sendDisputeRaisedEmail, sendDisputeResolvedEmail } from '../services/email';
import multer from 'multer';
import { classifyDisputeType } from '../services/dispute-ai/classifier';
import { quickTierHint } from '../services/dispute-ai/config/disputeTypes';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Zod schemas for validation
const RaiseDisputeSchema = z.object({
    transaction_id: z.string().uuid(),
    raised_by: z.string().uuid(),
    reason: z.string().min(10)
});

const ResolveDisputeSchema = z.object({
    resolution_type: z.enum(['REFUND_BUYER', 'PAY_SELLER', 'SPLIT']),
    resolution_notes: z.string().optional(),
    buyer_amount: z.number().optional(),
    seller_amount: z.number().optional()
});

async function sendVerdictNotifications(disputeId: string, action: string, txn: any) {
    try {
        const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';
        const actionLabels: Record<string, string> = {
            REFUND_BUYER: '✅ Refund issued to buyer',
            PAY_SELLER: '✅ Payment released to seller',
            SPLIT: '⚖️ Payment split between parties'
        };
        const label = actionLabels[action] || action;

        await Promise.all([txn.buyer, txn.seller].map(async (user: any) => {
            try {
                const disputeUrl = `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${txn.id}`;
                await routeNotification(
                    user.id,
                    `⚖️ <b>Dispute Resolved</b>\n\nCase for <b>"${txn.product_name}"</b> (#${txn.txn_code}) has been resolved by AI Mediation.\n\n<b>Outcome:</b> ${label}\n\nView your case details for next steps.`,
                    [{ label: '👁️ View Case', url: disputeUrl }],
                    undefined,
                    user.email ? () => sendDisputeResolvedEmail(user.email, { safetag: user.safetag, product: txn.product_name, txnCode: txn.txn_code, outcome: label, txnId: txn.id }) : undefined
                );
                recordNotification(user.id, 'dispute', '⚖️ Dispute Resolved', `Case for "${txn.product_name}" resolved — ${label}`, { transaction_id: txn.id, transaction_code: txn.txn_code, dispute_id: disputeId, link_url: `/dashboard/transactions/${txn.id}` }).catch(() => {});
            } catch { /* non-critical */ }
        }));
    } catch (err) {
        console.error('Failed to send verdict notifications:', err);
    }
}

async function runAIForDispute(disputeId: string, txn?: any) {
    // DB-level lock — survives server restarts (replaces in-memory Set)
    const { data: lockAcquired } = await supabase
        .from('disputes')
        .update({ processing_locked_at: new Date().toISOString() })
        .eq('id', disputeId)
        .is('processing_locked_at', null)
        .select('id')
        .maybeSingle();

    if (!lockAcquired) return;

    const { processAIDispute } = require('../services/dispute-ai');
    processAIDispute(disputeId).then(async (aiResult: any) => {
        try {
            if (!aiResult || !aiResult.content) return;

            await supabase.from('dispute_messages').insert({
                dispute_id: disputeId,
                sender_type: 'AI',
                content: aiResult.content
            });

            if (aiResult.type === 'VERDICT') {
                let newTxnStatus = 'FINALIZED';
                if (aiResult.action === 'REFUND_BUYER') newTxnStatus = 'CANCELLED';
                else if (aiResult.action === 'SPLIT') newTxnStatus = 'RESOLVED_SPLIT';

                const txnMeta = (aiResult.action === 'SPLIT' && aiResult.split_pct_buyer != null && txn)
                    ? { resolution: 'SPLIT', buyer_pct: aiResult.split_pct_buyer, seller_pct: 100 - aiResult.split_pct_buyer, buyer_amount: +(txn.amount * aiResult.split_pct_buyer / 100).toFixed(2), seller_amount: +(txn.amount * (100 - aiResult.split_pct_buyer) / 100).toFixed(2) }
                    : undefined;

                await supabase.from('disputes').update({
                    status: 'RESOLVED',
                    resolution: `AI_MEDIATION: ${aiResult.action}`,
                    resolved_at: new Date().toISOString()
                }).eq('id', disputeId);

                if (txn) {
                    await supabase.from('transactions').update({
                        status: newTxnStatus,
                        ...(txnMeta ? { metadata: txnMeta } : {})
                    }).eq('id', txn.id);

                    await sendVerdictNotifications(disputeId, aiResult.action, txn);
                }

            } else if (aiResult.type === 'ESCALATE') {
                // Reviewer rejected the verdict — flag for human admin
                await supabase.from('disputes').update({ is_ai_paused: true }).eq('id', disputeId);

            } else if (aiResult.type === 'QUESTION' && aiResult.restrict) {
                const { data: current } = await supabase
                    .from('disputes')
                    .select('ai_rounds')
                    .eq('id', disputeId)
                    .single();

                const newRounds = (current?.ai_rounds || 0) + 1;

                await supabase.from('disputes').update({
                    restricted_to: aiResult.restrict,
                    ai_rounds: newRounds
                }).eq('id', disputeId);

                if (newRounds >= 5) {
                    await supabase.from('disputes').update({ is_ai_paused: true }).eq('id', disputeId);
                    await supabase.from('dispute_messages').insert({
                        dispute_id: disputeId,
                        sender_type: 'AI',
                        content: '**[SYSTEM]** This case has been reviewed extensively and requires human judgment. A support agent will review this case shortly.'
                    });
                }
            }
        } finally {
            await supabase.from('disputes').update({ processing_locked_at: null }).eq('id', disputeId);
        }
    }).catch(async () => {
        await supabase.from('disputes').update({ processing_locked_at: null }).eq('id', disputeId);
    });
}

/**
 * Raise a dispute
 */
router.post('/raise', async (req: Request, res: Response) => {
    try {
        const data = RaiseDisputeSchema.parse(req.body);

        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*)')
            .eq('id', data.transaction_id)
            .single();

        if (txnError || !txn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (!['PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(txn.status)) {
            return res.status(400).json({ error: 'Transaction cannot be disputed in its current state.' });
        }

        const { data: dispute, error: disputeError } = await supabase
            .from('disputes')
            .insert({
                transaction_id: data.transaction_id,
                raised_by: data.raised_by,
                reason: data.reason,
                status: 'OPEN'
            })
            .select()
            .single();

        if (disputeError) throw disputeError;

        // Classify dispute type + tier (awaited so AI receives it)
        try {
            const classification = await classifyDisputeType(
                data.reason,
                txn.product_name,
                txn.amount,
                txn.currency,
                txn.buyer?.primary_platform || '',
                txn.seller?.primary_platform || ''
            );
            await supabase
                .from('disputes')
                .update({ dispute_type: classification.dispute_type, pipeline_tier: classification.pipeline_tier })
                .eq('id', dispute.id);
        } catch (classifyErr) {
            console.warn('⚠️ Dispute classification failed (non-critical):', classifyErr);
        }

        // Upsert reputation rows so AI can load them immediately
        await Promise.all([txn.buyer?.id, txn.seller?.id].filter(Boolean).map((pid: string) =>
            Promise.resolve(
                supabase.from('profile_reputation')
                    .upsert({ profile_id: pid }, { onConflict: 'profile_id', ignoreDuplicates: true })
            ).catch(() => {})
        ));

        await supabase
            .from('dispute_messages')
            .insert({
                dispute_id: dispute.id,
                sender_id: data.raised_by,
                sender_type: 'USER',
                content: data.reason
            });

        await supabase
            .from('transactions')
            .update({ status: 'DISPUTED' })
            .eq('id', data.transaction_id);

        // Trigger AI Mediator (fire-and-forget with DB lock)
        runAIForDispute(dispute.id, txn);

        // Notifications
        try {
            const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';
            const otherParty = txn.buyer.id === data.raised_by ? txn.seller : txn.buyer;
            const raiser = txn.buyer.id === data.raised_by ? txn.buyer : txn.seller;
            const disputeDetailsUrl = `${REVIEWS_URL}/withdraw/${encodeURIComponent(otherParty.safetag)}?view=dispute_details&txnId=${txn.id}`;
            await routeNotification(
                otherParty.id,
                `⚠️ <b>Transaction Disputed</b>\n\nTransaction <b>${txn.txn_code}</b> for "${txn.product_name}" has been disputed by @${raiser.safetag}.\n\n<b>Reason:</b> ${data.reason}\n\nFunds have been locked. Please visit your Web Dashboard to review the evidence and resolve the dispute.`,
                [{ label: '👁️ View Dispute Details', url: disputeDetailsUrl }],
                undefined,
                otherParty.email ? () => sendDisputeRaisedEmail(otherParty.email, { safetag: otherParty.safetag, raisingParty: raiser.safetag, product: txn.product_name, txnCode: txn.txn_code, reason: data.reason, txnId: txn.id }) : undefined
            );
            recordNotification(otherParty.id, 'dispute', '⚠️ Dispute Raised Against You', `@${raiser.safetag} disputed "${txn.product_name}" — funds locked`, { transaction_id: txn.id, transaction_code: txn.txn_code, reason: data.reason, link_url: `/dashboard/transactions/${txn.id}` }).catch(() => {});
        } catch (notifErr) {
            console.error('Failed to send dispute notification:', notifErr);
        }

        res.status(201).json({ message: 'Dispute raised successfully', dispute });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: (err as any).errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Get dispute details by transaction ID
 */
router.get('/transaction/:txnId', async (req: Request, res: Response) => {
    try {
        const { txnId } = req.params;
        const { data, error } = await supabase
            .from('disputes')
            .select('*, raised_by_profile:profiles!raised_by(*)')
            .eq('transaction_id', txnId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'No dispute found for this transaction' });

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Upload evidence
 */
router.post('/:id/upload', upload.array('files', 5), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const files = req.files as Express.Multer.File[];

        console.log(`📤 Upload request for dispute ${id}. Files:`, files?.length);

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedAttachments = [];

        for (const file of files) {
            const fileName = `${id}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
            console.log(`🚀 Uploading to Supabase: ${fileName} (${file.mimetype})`);
            
            const { error } = await supabase.storage
                .from('dispute-evidence')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (error) {
                console.error('❌ Supabase Storage Error:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('dispute-evidence')
                .getPublicUrl(fileName);

            console.log(`✅ Uploaded: ${publicUrl}`);

            uploadedAttachments.push({
                name: file.originalname,
                url: publicUrl,
                type: file.mimetype,
                size: file.size
            });
        }

        res.json(uploadedAttachments);
    } catch (err: any) {
        console.error('🚨 Upload Route Failure:', err);
        res.status(500).json({ error: 'Failed to upload files', details: err.message });
    }
});

/**
 * Get messages
 */
router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('dispute_messages')
            .select('*')
            .eq('dispute_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Send message
 */
router.post('/:id/messages', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { sender_id, content, attachments, sender_type = 'USER', metadata = {} } = req.body;

        // 1. Initial Dispute Check
        const { data: disputeData, error: dError } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*))')
            .eq('id', id)
            .single();

        if (dError || !disputeData) {
            return res.status(404).json({ error: 'Dispute not found' });
        }

        // 2. Server-Side Enforcement (for Users)
        if (sender_type === 'USER' && disputeData.restricted_to !== 'ALL') {
            const isBuyer = sender_id === disputeData.transaction.buyer_id;
            const isSeller = sender_id === disputeData.transaction.seller_id;
            
            if ((disputeData.restricted_to === 'BUYER' && !isBuyer) || 
                (disputeData.restricted_to === 'SELLER' && !isSeller)) {
                return res.status(403).json({ 
                    error: 'You are temporarily restricted from sending messages by the mediator.' 
                });
            }
        }

        // 3. Parse Mentions (@buyer, @seller, @all)
        let restrictedTo = 'ALL';
        const lowerContent = typeof content === 'string' ? content.toLowerCase() : '';
        if (lowerContent.includes('@buyer')) restrictedTo = 'BUYER';
        else if (lowerContent.includes('@seller')) restrictedTo = 'SELLER';
        else if (lowerContent.includes('@all')) restrictedTo = 'ALL';

        // 2. If Admin, Pause AI and broadcast "Join" if needed
        let adminJoinedText = '';
        if (sender_type === 'ADMIN') {
            try {
                await supabase
                    .from('disputes')
                    .update({ 
                        is_ai_paused: true,
                        restricted_to: restrictedTo 
                    })
                    .eq('id', id);
            } catch (sqErr) {
                console.warn('⚠️ Could not update AI Pause status.');
            }

            // IMPROVED: Check if this is the first admin presence ever
            const { data: existingAdminMsgs } = await supabase
                .from('dispute_messages')
                .select('content')
                .eq('dispute_id', id)
                .or('content.ilike.%[ADMIN_MSG:%,content.ilike.%[ADMIN_JOINED:%');
            
            if (!existingAdminMsgs || existingAdminMsgs.length === 0) {
                adminJoinedText = `[ADMIN_JOINED:${metadata.identity || 'Administrator'}]`;
            }
        }

        // 3. Save Message
        const isSignal = typeof content === 'string' && (content.startsWith('[ADMIN_JOINED:') || content.startsWith('[ADMIN_LEFT:'));
        const adminTag = (sender_type === 'ADMIN' && !isSignal) ? `[ADMIN_MSG:${metadata.identity || 'Administrator'}]` : '';
        const messageData: any = {
            dispute_id: id,
            sender_id: sender_id === 'SYSTEM_ADMIN' ? null : sender_id,
            sender_type: 'USER', // Internal storage uses USER/AI; 'sender_type: ADMIN' in req is a helper
            content: adminJoinedText ? `${adminJoinedText}\n${adminTag}${content}` : `${adminTag}${content}`,
            attachments: attachments || [],
            metadata: metadata || {}
        };

        let savedMessage;
        try {
            const { data: message, error } = await supabase
                .from('dispute_messages')
                .insert(messageData)
                .select()
                .single();

            if (error) throw error;
            savedMessage = message;

            // Tag evidence tier on user messages (fire-and-forget — non-critical)
            if (sender_type !== 'ADMIN' && savedMessage?.id) {
                const tierHint = quickTierHint(content || '', attachments || []);
                Promise.resolve(
                    supabase
                        .from('dispute_messages')
                        .update({ evidence_tier: tierHint.tier, evidence_tags: tierHint.tags })
                        .eq('id', savedMessage.id)
                ).catch(() => {});
            }
        } catch (insertErr: any) {
            console.error('❌ Insert Message Error:', insertErr.message);
            return res.status(500).json({ error: insertErr.message });
        }

        // 5. Notify parties about admin message / human intervention
        if (sender_type === 'ADMIN' && metadata.type !== 'restriction_signal') {
            try {
                if (disputeData && disputeData.transaction) {
                    const { buyer, seller } = disputeData.transaction;
                    const parties = [buyer, seller];
                    const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';

                    // Send notifications concurrently for better performance
                    await Promise.all(parties.map(async (user) => {
                        try {
                            const { data: linked } = await supabase
                                .from('linked_accounts')
                                .select('platform, platform_id')
                                .eq('profile_id', user.id)
                                .eq('is_primary', true)
                                .single();

                            if (linked) {
                                const txn = disputeData.transaction;
                                let cleanMsgContent = content.replace(/\[ADMIN_MSG:.*?\]/g, '').replace(/\[ADMIN_JOINED:.*?\]/g, '').trim();
                                
                                // Handle voice recording notification specifically
                                const isRecording = cleanMsgContent.includes('[Voice Recording:') || 
                                                   (attachments && attachments.length > 0 && attachments.some((a: any) => a.type?.includes('audio') || a.name?.toLowerCase().endsWith('.webm')));

                                if (isRecording) {
                                    cleanMsgContent = 'a new recording has been sent';
                                }

                                let msgHeader = '';
                                let msgBody = '';
                                
                                if (metadata.type === 'join_announcement' || adminJoinedText) {
                                    msgHeader = `🛡️ <b>Human Support Joined</b>`;
                                    msgBody = `Support agent <b>${metadata.identity || 'Admin'}</b> has joined the conversation to resolve this dispute personally. AI Mediation is now on standby.`;
                                } else if (metadata.type === 'leave_announcement') {
                                    msgHeader = `🛡️ <b>Human Support Left</b>`;
                                    msgBody = `Support agent <b>${metadata.identity || 'Admin'}</b> has left the conversation. AI Mediation or final resolution will follow.`;
                                } else if (isRecording) {
                                    msgHeader = `🎙️ <b>New Voice Note from Support</b>`;
                                    msgBody = `<b>${metadata.identity || 'Admin'}</b> just sent a voice message to your case.`;
                                } else if (!cleanMsgContent && (attachments && attachments.length > 0)) {
                                    msgHeader = `📎 <b>Admin added an attachment</b>`;
                                    msgBody = `<b>${metadata.identity || 'Admin'}</b> just added a file to your case context.`;
                                } else {
                                    msgHeader = `💬 <b>New Message from Support</b>`;
                                    msgBody = `<b>${metadata.identity || 'Admin'}</b>: ${cleanMsgContent.substring(0, 100)}${cleanMsgContent.length > 100 ? '...' : ''}`;
                                }

                                const fullMsg = `${msgHeader}\n\n${msgBody}\n\n<b>Case Context:</b>\n📦 ${txn.product_name}\n💰 ${txn.amount} ${txn.currency}\n🆔 #${txn.txn_code}`;

                                const actionBtn = {
                                    label: '👁️ View Case',
                                    url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${disputeData.transaction_id}`
                                };

                                await sendNotification(linked.platform, linked.platform_id, fullMsg, [actionBtn]);
                                recordNotification(user.id, 'dispute', '💬 Dispute Message', msgBody.substring(0, 120), { transaction_id: disputeData.transaction_id, link_url: `/dashboard/transactions/${disputeData.transaction_id}` }).catch(() => {});
                            }
                        } catch (e: any) {
                            console.warn(`Could not notify user ${user.safetag}:`, e.message);
                        }
                    }));
                }
            } catch (notifyErr) {
                console.warn('⚠️ Notification failed but message was saved.');
            }
        }

        // 5. Trigger AI only if not paused and not an admin message
        if (!disputeData.is_ai_paused && sender_type !== 'ADMIN') {
            runAIForDispute(id as string, disputeData.transaction);
        }

        return res.status(201).json(savedMessage);
    } catch (err: any) {
        console.error('❌ Send Message Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Resolve dispute
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = ResolveDisputeSchema.parse(req.body);

        const { data: dispute, error: fetchError } = await supabase
            .from('disputes')
            .select('transaction_id')
            .eq('id', id)
            .single();

        if (fetchError || !dispute) return res.status(404).json({ error: 'Dispute not found' });

        let resolutionText = data.resolution_type;
        if (data.resolution_type === 'SPLIT') {
            resolutionText += ` (Buyer: ${data.buyer_amount}, Seller: ${data.seller_amount})`;
        }
        if (data.resolution_notes) resolutionText += `: ${data.resolution_notes}`;

        await supabase
            .from('disputes')
            .update({
                status: 'RESOLVED',
                resolution: resolutionText,
                resolved_at: new Date().toISOString()
            })
            .eq('id', id);

        let newTxnStatus = 'FINALIZED';
        if (data.resolution_type === 'REFUND_BUYER') {
            newTxnStatus = 'CANCELLED';
        } else if (data.resolution_type === 'SPLIT') {
            newTxnStatus = 'RESOLVED_SPLIT';
        }

        await supabase
            .from('transactions')
            .update({ 
                status: newTxnStatus,
                metadata: data.resolution_type === 'SPLIT' ? { 
                    resolution: 'SPLIT',
                    buyer_refund: data.buyer_amount,
                    seller_payout: data.seller_amount
                } : undefined
            })
            .eq('id', dispute.transaction_id);

        console.log(`⚖️ Dispute ${id} resolved as ${data.resolution_type}`);
        res.json({ message: 'Dispute resolved successfully', status: newTxnStatus });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: (err as any).errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Notify Join
 */
router.post('/:id/notify-join', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { admin_name } = req.body;

        const { data: disputeData } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*))')
            .eq('id', id)
            .single();

        if (disputeData && disputeData.transaction) {
            const { buyer, seller } = disputeData.transaction;
            const txn = disputeData.transaction;
            const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';

            await Promise.all([buyer, seller].map(async (user) => {
                const { data: linked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', user.id)
                    .eq('is_primary', true)
                    .single();

                if (linked) {
                    const fullMsg = `🛡️ <b>Human Support Joined</b>\n\nSupport agent <b>${admin_name || 'Admin'}</b> has joined the conversation to resolve this dispute personally. AI Mediation is now on standby.\n\n<b>Case Context:</b>\n📦 ${txn.product_name}\n💰 ${txn.amount} ${txn.currency}\n🆔 #${txn.txn_code}`;
                    const actionBtn = {
                        label: '👁️ View Case',
                        url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${disputeData.transaction_id}`
                    };
                    await sendNotification(linked.platform, linked.platform_id, fullMsg, [actionBtn]);
                    recordNotification(user.id, 'dispute', '🛡️ Human Support Joined', `Support agent ${admin_name || 'Admin'} joined your dispute for "${txn.product_name}"`, { transaction_id: disputeData.transaction_id, link_url: `/dashboard/transactions/${disputeData.transaction_id}` }).catch(() => {});
                }
            }));
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Notify Leave
 */
router.post('/:id/notify-leave', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { admin_name } = req.body;

        const { data: disputeData } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*))')
            .eq('id', id)
            .single();

        if (disputeData && disputeData.transaction) {
            const { buyer, seller } = disputeData.transaction;
            const txn = disputeData.transaction;
            const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';

            await Promise.all([buyer, seller].map(async (user) => {
                const { data: linked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', user.id)
                    .eq('is_primary', true)
                    .single();

                if (linked) {
                    const fullMsg = `🛡️ <b>Human Support Left</b>\n\nSupport agent <b>${admin_name || 'Admin'}</b> has left the conversation. Standard dispute terms still apply.\n\n<b>Case Context:</b>\n📦 ${txn.product_name}\n💰 ${txn.amount} ${txn.currency}\n🆔 #${txn.txn_code}`;
                    const actionBtn = {
                        label: '👁️ View Case',
                        url: `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${disputeData.transaction_id}`
                    };
                    await sendNotification(linked.platform, linked.platform_id, fullMsg, [actionBtn]);
                    recordNotification(user.id, 'dispute', '🛡️ Support Left', `Support agent ${admin_name || 'Admin'} left your dispute for "${txn.product_name}"`, { transaction_id: disputeData.transaction_id, link_url: `/dashboard/transactions/${disputeData.transaction_id}` }).catch(() => {});
                }
            }));
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Restrict Chat Participation
 */
router.post('/:id/restrict', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { restricted_to } = req.body; // 'ALL', 'BUYER', or 'SELLER'

        if (!['ALL', 'BUYER', 'SELLER'].includes(restricted_to)) {
            return res.status(400).json({ error: 'Invalid restriction target' });
        }

        const { error } = await supabase
            .from('disputes')
            .update({ restricted_to })
            .eq('id', id);

        if (error) throw error;
        
        res.json({ success: true, restricted_to });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Feature C: SLA Timeouts & Ghosting
 * Endpoint intended to be called hourly by a cron service
 */
router.post('/cron/timeouts', async (req: Request, res: Response) => {
    try {
        const { cron_secret } = req.body;
        if (cron_secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get all OPEN disputes that are purely AI managed
        const { data: openDisputes } = await supabase
            .from('disputes')
            .select('id, restricted_to, transaction_id, is_ai_paused')
            .eq('status', 'OPEN')
            .eq('is_ai_paused', false);

        if (!openDisputes || openDisputes.length === 0) {
            return res.json({ processed: 0, message: 'No open AI disputes' });
        }

        let processed = 0;
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

        for (const dispute of openDisputes) {
            // Find the last message
            const { data: lastMsgs } = await supabase
                .from('dispute_messages')
                .select('created_at, sender_type')
                .eq('dispute_id', dispute.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (lastMsgs && lastMsgs.length > 0) {
                const lastMsg = lastMsgs[0];
                const msgTime = new Date(lastMsg.created_at).getTime();
                const now = new Date().getTime();

                // If AI was the last to speak, AND it's been > 48 hours
                if (lastMsg.sender_type === 'AI' && (now - msgTime) > FORTY_EIGHT_HOURS) {
                    let action: string | null = null;
                    if (dispute.restricted_to === 'BUYER') action = 'PAY_SELLER';
                    else if (dispute.restricted_to === 'SELLER') action = 'REFUND_BUYER';
                    // If ALL restriction (both silent) — default to PAY_SELLER (escrow standard: funds go to seller if buyer didn't pursue)
                    else if (!dispute.restricted_to || dispute.restricted_to === 'ALL') action = 'PAY_SELLER';

                    if (action) {
                        const newTxnStatus = action === 'REFUND_BUYER' ? 'CANCELLED' : 'FINALIZED';

                        await supabase.from('dispute_messages').insert({
                            dispute_id: dispute.id,
                            sender_type: 'AI',
                            content: `**SYSTEM VERDICT:** The required party failed to provide evidence within 48 hours. The dispute has been automatically closed (${action}).`
                        });

                        await supabase.from('disputes').update({
                            status: 'RESOLVED',
                            resolution: `SLA_TIMEOUT: ${action}`,
                            resolved_at: new Date().toISOString()
                        }).eq('id', dispute.id);

                        await supabase.from('transactions').update({ status: newTxnStatus }).eq('id', dispute.transaction_id);

                        // Notify both parties of timeout resolution
                        try {
                            const { data: fullTxn } = await supabase
                                .from('transactions')
                                .select('*, buyer:buyer_id(*), seller:seller_id(*)')
                                .eq('id', dispute.transaction_id)
                                .single();
                            if (fullTxn) await sendVerdictNotifications(dispute.id, action, fullTxn);
                        } catch { /* non-critical */ }

                        processed++;
                    }
                }
            }
        }

        res.json({ success: true, processed });
    } catch (err: any) {
        console.error('Cron error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin: List SOPs
 */
router.get('/admin/sops', async (req: Request, res: Response) => {
    try {
        const { type, status } = req.query;
        let query = supabase.from('dispute_sops').select('*').order('priority', { ascending: false });
        if (type) query = query.eq('dispute_type', type as string);
        if (status) query = query.eq('status', status as string);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin: Approve a HARD_GATE SOP
 */
router.post('/admin/sops/:sopId/approve', async (req: Request, res: Response) => {
    try {
        const { sopId } = req.params;
        const { error } = await supabase
            .from('dispute_sops')
            .update({ human_approved: true, status: 'ACTIVE' })
            .eq('id', sopId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin: Archive a SOP
 */
router.post('/admin/sops/:sopId/archive', async (req: Request, res: Response) => {
    try {
        const { sopId } = req.params;
        const { error } = await supabase
            .from('dispute_sops')
            .update({ status: 'ARCHIVED' })
            .eq('id', sopId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get dispute evolution log (stub — Phase 3 will populate)
 */
router.get('/:id/evolution-log', async (req: Request, res: Response) => {
    res.json([]);
});

export default router;
