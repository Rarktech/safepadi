import { Router, Request, Response } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification } from '../services/notifications';
import multer from 'multer';

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

        // Trigger AI Mediator
        const { processAIDispute } = require('../services/gemini');
        processAIDispute(dispute.id).then(async (aiResult: any) => {
            if (aiResult && aiResult.content) {
                await supabase.from('dispute_messages').insert({
                    dispute_id: dispute.id,
                    sender_type: 'AI',
                    content: aiResult.content
                });
            }
        });

        // Notifications
        try {
            const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';
            const otherParty = txn.buyer.id === data.raised_by ? txn.seller : txn.buyer;
            const raiser = txn.buyer.id === data.raised_by ? txn.buyer : txn.seller;

            const { data: linkedAccount } = await supabase
                .from('linked_accounts')
                .select('platform, platform_id')
                .eq('profile_id', otherParty.id)
                .eq('is_primary', true)
                .single();

            if (linkedAccount) {
                const disputeDetailsUrl = `${REVIEWS_URL}/withdraw/${encodeURIComponent(otherParty.safetag)}?view=dispute_details&txnId=${txn.id}`;
                await sendNotification(
                    linkedAccount.platform,
                    linkedAccount.platform_id,
                    `⚠️ <b>Transaction Disputed</b>\n\nTransaction <b>${txn.txn_code}</b> for "${txn.product_name}" has been disputed by @${raiser.safetag}.\n\n<b>Reason:</b> ${data.reason}\n\nFunds have been locked. Please visit your Web Dashboard to review the evidence and resolve the dispute.`,
                    [{ label: '👁️ View Dispute Details', url: disputeDetailsUrl }]
                );
            }
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
        try {
            const { data: currentDispute } = await supabase.from('disputes').select('is_ai_paused').eq('id', id).single();
            if (currentDispute && !currentDispute.is_ai_paused && sender_type !== 'ADMIN') {
                const { processAIDispute } = require('../services/gemini');
                processAIDispute(id).then(async (aiResult: any) => {
                    if (aiResult && aiResult.content) {
                        await supabase.from('dispute_messages').insert({
                            dispute_id: id,
                            sender_type: 'AI',
                            content: aiResult.content
                        });
                    }
                });
            }
        } catch (aiErr) {
            console.warn('AI skip due to column mismatch.');
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

export default router;
