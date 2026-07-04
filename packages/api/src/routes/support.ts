import { Router, Request, Response } from 'express';
import { supabase } from '@safepal/shared';
import multer from 'multer';
import { requireBot, BotAuthedRequest } from '../middleware/requireBot';
import { requireUser, AuthedRequest } from '../middleware/requireUser';
import { adminAuthMiddleware } from './admin';
import { routeNotification, recordNotification } from '../services/notifications';
import { buildInternalMagicLink } from '../services/magicLinkInternal';
import { sendAdminSupportTicketAssignedEmail, sendSupportReplyEmail } from '../services/email';
import { routeSupportTicket, shortTicketCode } from '../services/supportRouter';

const upload = multer({ storage: multer.memoryStorage() });

// Bot/user-facing endpoints — mounted at /api/support
export const supportRoutes = Router();
// Admin-facing endpoints — mounted at /api/admin/support
export const adminSupportRoutes = Router();

async function uploadAttachments(ticketId: string, files: Express.Multer.File[]) {
    const uploaded: { name: string; url: string; type: string; size: number }[] = [];
    for (const file of files) {
        const fileName = `${ticketId}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const { error } = await supabase.storage
            .from('support-attachments')
            .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('support-attachments').getPublicUrl(fileName);
        uploaded.push({ name: file.originalname, url: publicUrl, type: file.mimetype, size: file.size });
    }
    return uploaded;
}

/**
 * POST /support/tickets
 * Called by every bot when a user's message matches the support-trigger keyword set.
 * Creates a ticket, auto-assigns an admin (unless handled_externally), and returns
 * a magic-link URL the bot can show the user.
 */
supportRoutes.post('/tickets', requireBot, async (req: Request, res: Response) => {
    try {
        const platform = (req as BotAuthedRequest).botPlatform;
        const { platform_id, trigger_phrase, handled_externally } = req.body;
        if (!platform_id) return res.status(400).json({ error: 'platform_id is required' });

        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('profile_id, profiles(safetag, email)')
            .eq('platform', platform)
            .eq('platform_id', String(platform_id))
            .maybeSingle();

        if (!linked) return res.status(404).json({ error: 'NO_LINKED_ACCOUNT' });

        const profileId = (linked as any).profile_id;
        const safetag = (linked as any).profiles?.safetag || '';

        const { data: ticket, error: insertErr } = await supabase
            .from('support_tickets')
            .insert({
                profile_id: profileId,
                safetag,
                origin_platform: platform,
                origin_platform_id: String(platform_id),
                trigger_phrase: trigger_phrase || null,
                status: handled_externally ? 'HANDLED_EXTERNALLY' : 'OPEN',
            })
            .select()
            .single();

        if (insertErr || !ticket) throw insertErr || new Error('Failed to create ticket');

        await supabase.from('support_messages').insert({
            ticket_id: ticket.id,
            sender_type: 'SYSTEM',
            content: handled_externally
                ? `Ticket opened via ${platform} — handled live via native platform support.`
                : `Ticket opened — trigger: "${trigger_phrase || 'support request'}"`,
        });

        const ticketCode = shortTicketCode(ticket.id);

        if (handled_externally) {
            // Apple Business already hands the user off to a live agent natively (JivoChat) —
            // this row exists purely for unified /admin/support visibility.
            return res.status(201).json({ ticket_id: ticket.id, ticket_code: ticketCode });
        }

        routeSupportTicket(ticket.id).catch((e) => console.error('[support] routing failed:', e));

        const url = await buildInternalMagicLink({
            profileId, safetag, platform, platformId: String(platform_id), scope: 'support', ticketId: ticket.id,
        });

        res.status(201).json({ ticket_id: ticket.id, ticket_code: ticketCode, url });
    } catch (err: any) {
        console.error('[support] create ticket error:', err);
        res.status(500).json({ error: err.message || 'Internal error' });
    }
});

/**
 * GET /support/my-tickets
 * Lists the caller's own support tickets — lets a user find a ticket again after
 * its magic link has expired, without needing a fresh bot-issued link. Must be
 * registered before GET /:id so Express doesn't swallow "my-tickets" as an :id.
 */
supportRoutes.get('/my-tickets', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;

        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, assigned_admin:admin_users!assigned_admin_id(id, name)')
            .eq('profile_id', user.sub)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /support/:id
 * Ticket detail, owner-only. Powers the web chat page on load.
 */
supportRoutes.get('/:id', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const { id } = req.params;

        const { data: ticket, error } = await supabase
            .from('support_tickets')
            .select('*, assigned_admin:admin_users!assigned_admin_id(id, name)')
            .eq('id', id)
            .single();

        if (error || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.profile_id !== user.sub) return res.status(403).json({ error: 'FORBIDDEN' });

        res.json(ticket);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /support/:id/messages
 */
supportRoutes.get('/:id/messages', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const { id } = req.params;

        const { data: ticket } = await supabase.from('support_tickets').select('profile_id').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.profile_id !== user.sub) return res.status(403).json({ error: 'FORBIDDEN' });

        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /support/:id/messages
 * User sends a message on the web chat page.
 */
supportRoutes.post('/:id/messages', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const { id } = req.params;
        const { content, attachments } = req.body;
        if (!content && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ error: 'content or at least one attachment is required' });
        }

        const { data: ticket } = await supabase.from('support_tickets').select('profile_id').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.profile_id !== user.sub) return res.status(403).json({ error: 'FORBIDDEN' });

        const { data: message, error } = await supabase
            .from('support_messages')
            .insert({ ticket_id: id, sender_id: user.sub, sender_type: 'USER', content, attachments: attachments || [] })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(message);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /support/:id/upload
 * User-side attachment upload (images/documents) — mirrors disputes.ts's /:id/upload.
 */
supportRoutes.post('/:id/upload', requireUser, upload.array('files', 20), async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const { id } = req.params;
        const files = req.files as Express.Multer.File[];

        const { data: ticket } = await supabase.from('support_tickets').select('profile_id').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.profile_id !== user.sub) return res.status(403).json({ error: 'FORBIDDEN' });

        if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

        const uploaded = await uploadAttachments(String(id), files);
        res.json(uploaded);
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to upload files', details: err.message });
    }
});

// ============================================================
// ADMIN — SUPPORT TICKET QUEUE, ASSIGNMENT, REPLY
// ============================================================

adminSupportRoutes.use(adminAuthMiddleware);

/**
 * GET /admin/support?status=OPEN
 */
adminSupportRoutes.get('/', async (req: any, res: Response) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('support_tickets')
            .select('*, profile:profile_id(safetag, first_name, last_name, email), assigned_admin:admin_users!assigned_admin_id(id, name)')
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        res.json({ tickets: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /admin/support/unassigned
 */
adminSupportRoutes.get('/unassigned', async (req: any, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, profile:profile_id(safetag, first_name, last_name)')
            .eq('status', 'OPEN')
            .is('assigned_admin_id', null)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const now = Date.now();
        const enriched = (data || []).map((t: any) => ({
            ...t,
            age_hours: Math.floor((now - new Date(t.created_at).getTime()) / 3600000),
        }));

        res.json({ tickets: enriched, count: enriched.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /admin/support/my-cases
 */
adminSupportRoutes.get('/my-cases', async (req: any, res: Response) => {
    try {
        const adminId = req.admin?.id;
        if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, profile:profile_id(safetag, first_name, last_name)')
            .eq('assigned_admin_id', adminId)
            .eq('status', 'OPEN')
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ tickets: data || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /admin/support/:id
 */
adminSupportRoutes.get('/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const { data: ticket, error } = await supabase
            .from('support_tickets')
            .select('*, profile:profile_id(safetag, first_name, last_name, email), assigned_admin:admin_users!assigned_admin_id(id, name)')
            .eq('id', id)
            .single();

        if (error || !ticket) return res.status(404).json({ error: 'Ticket not found' });

        const { data: messages } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', id)
            .order('created_at', { ascending: true });

        const { data: assignments } = await supabase
            .from('support_assignments')
            .select(`
                id, reason, assigned_at, unassigned_at,
                assigned_to:admin_users!support_assignments_assigned_to_fkey(id, name),
                assigned_by:admin_users!support_assignments_assigned_by_fkey(id, name)
            `)
            .eq('ticket_id', id)
            .order('assigned_at', { ascending: true });

        res.json({ ...ticket, messages: messages || [], assignments: assignments || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /admin/support/:id/assign
 */
adminSupportRoutes.patch('/:id/assign', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { admin_id, reason } = req.body;
        const assignedBy = req.admin?.id;
        if (!admin_id) return res.status(400).json({ error: 'admin_id is required' });

        const { data: targetAdmin, error: adminErr } = await supabase
            .from('admin_users')
            .select('id, name, email')
            .eq('id', admin_id)
            .eq('status', 'ACTIVE')
            .single();

        if (adminErr || !targetAdmin) return res.status(404).json({ error: 'Admin not found or inactive' });

        const { data: ticket } = await supabase.from('support_tickets').select('metadata').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        await supabase.from('support_assignments')
            .update({ unassigned_at: new Date().toISOString() })
            .eq('ticket_id', id)
            .is('unassigned_at', null)
            .then(undefined, () => {});

        const snapshot = { id: (targetAdmin as any).id, name: (targetAdmin as any).name };
        const merged = { ...((ticket as any).metadata || {}), assigned_admin: snapshot };

        await supabase.from('support_tickets')
            .update({ assigned_admin_id: admin_id, metadata: merged, updated_at: new Date().toISOString() })
            .eq('id', id);

        await supabase.from('support_assignments').insert({
            ticket_id: id,
            assigned_to: admin_id,
            assigned_by: assignedBy || null,
            reason: reason || 'MANUAL_REASSIGN',
        }).then(undefined, () => {});

        await supabase.from('support_messages').insert({
            ticket_id: id,
            sender_type: 'SYSTEM',
            content: `This ticket has been reassigned to ${(targetAdmin as any).name}.`,
        });

        if ((targetAdmin as any).email) {
            const adminPanelUrl = `${process.env.REVIEWS_URL || 'https://safeeely.com'}/admin/support/${id}`;
            sendAdminSupportTicketAssignedEmail((targetAdmin as any).email, {
                adminName: (targetAdmin as any).name, ticketCode: shortTicketCode(id), adminPanelUrl,
            });
        }

        res.json({ success: true, assigned_admin: snapshot });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/support/:id/reply
 * Admin replies from the dashboard — message is stored and relayed back to the
 * user's bot(s) via routeNotification, same pattern disputes.ts uses for verdicts.
 */
adminSupportRoutes.post('/:id/reply', async (req: any, res: Response) => {
    try {
        const admin = req.admin;
        const { id } = req.params;
        const { content, attachments } = req.body;
        if (!content && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ error: 'content or at least one attachment is required' });
        }

        const { data: ticket } = await supabase.from('support_tickets').select('*').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const { data: message, error } = await supabase
            .from('support_messages')
            .insert({ ticket_id: id, sender_id: admin.id, sender_type: 'ADMIN', content, attachments: attachments || [] })
            .select()
            .single();

        if (error) throw error;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, safetag, email')
            .eq('id', ticket.profile_id)
            .single();

        if (profile) {
            const code = shortTicketCode(id);
            // Relative path for the website notification tab's router.push(); absolute for the email link.
            const relativeTicketPath = `/withdraw/${encodeURIComponent(profile.safetag)}?view=support_chat&ticketId=${id}`;
            const replyUrl = `${process.env.REVIEWS_URL || 'http://localhost:3001'}${relativeTicketPath}`;

            await routeNotification(
                profile.id,
                `🆘 <b>Support Reply</b> — 🎫 ${code}\n\nOur support team has responded to your support ticket. Tap below to view and continue the conversation.`,
                async (platform, platformId) => [{
                    label: '💬 View Reply',
                    url: await buildInternalMagicLink({ profileId: profile.id, safetag: profile.safetag, platform, platformId, scope: 'support', ticketId: id }),
                }],
                undefined,
                profile.email ? () => sendSupportReplyEmail(profile.email, { safetag: profile.safetag, ticketCode: code, replyUrl }) : undefined,
                true // isTransactional — direct reply to a user-initiated ticket, bypasses the 24h Meta window
            );
            recordNotification(profile.id, 'support', `🆘 Support Reply — ${code}`, content.slice(0, 120), { ticket_id: id, link_url: relativeTicketPath }).catch(() => {});
        }

        res.status(201).json(message);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/support/:id/upload
 * Admin-side attachment upload — no ownership check needed since adminSupportRoutes
 * is already globally gated by adminAuthMiddleware.
 */
adminSupportRoutes.post('/:id/upload', upload.array('files', 20), async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const files = req.files as Express.Multer.File[];

        const { data: ticket } = await supabase.from('support_tickets').select('id').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

        const uploaded = await uploadAttachments(id, files);
        res.json(uploaded);
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to upload files', details: err.message });
    }
});

/**
 * POST /admin/support/:id/resolve
 */
adminSupportRoutes.post('/:id/resolve', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { resolution_notes } = req.body;

        const { data: ticket } = await supabase.from('support_tickets').select('profile_id, status, safetag').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        await supabase.from('support_tickets')
            .update({
                status: 'RESOLVED',
                resolved_at: new Date().toISOString(),
                resolution_notes: resolution_notes || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        await supabase.from('support_messages').insert({
            ticket_id: id,
            sender_type: 'SYSTEM',
            content: 'This ticket has been marked resolved.',
        });

        const code = shortTicketCode(id);
        const resolvedLinkUrl = `/withdraw/${encodeURIComponent(ticket.safetag)}?view=support_chat&ticketId=${id}`;

        if (ticket.status === 'OPEN') {
            routeNotification(
                ticket.profile_id,
                `✅ <b>Support Ticket Resolved</b> — 🎫 ${code}\n\nYour support ticket has been marked as resolved. If you still need help, just reach out again with "i need support".`
            ).catch(() => {});
        }
        recordNotification(ticket.profile_id, 'support', `✅ Support Ticket Resolved — ${code}`, 'Your support ticket has been marked as resolved.', { ticket_id: id, link_url: resolvedLinkUrl }).catch(() => {});

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/support/:id/reopen
 * Moves a RESOLVED ticket back to OPEN. Deliberately excludes HANDLED_EXTERNALLY
 * tickets — those are Apple/JivoChat-native shadow records logged only for
 * dashboard visibility, not real threads with a reply flow to reopen.
 */
adminSupportRoutes.post('/:id/reopen', async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const { data: ticket } = await supabase.from('support_tickets').select('profile_id, status, safetag').eq('id', id).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'RESOLVED') {
            return res.status(400).json({ error: 'Only a RESOLVED ticket can be reopened' });
        }

        await supabase.from('support_tickets')
            .update({ status: 'OPEN', resolved_at: null, updated_at: new Date().toISOString() })
            .eq('id', id);

        await supabase.from('support_messages').insert({
            ticket_id: id,
            sender_type: 'SYSTEM',
            content: 'This ticket has been reopened.',
        });

        const reopenCode = shortTicketCode(id);

        routeNotification(
            ticket.profile_id,
            `🔄 <b>Support Ticket Reopened</b> — 🎫 ${reopenCode}\n\nYour support ticket has been reopened — our team is looking into it again.`,
            async (platform, platformId) => [{
                label: '💬 View Ticket',
                url: await buildInternalMagicLink({ profileId: ticket.profile_id, safetag: ticket.safetag, platform, platformId, scope: 'support', ticketId: id }),
            }],
            undefined,
            undefined,
            true
        ).catch(() => {});
        recordNotification(ticket.profile_id, 'support', `🔄 Support Ticket Reopened — ${reopenCode}`, 'Your support ticket has been reopened.', {
            ticket_id: id,
            link_url: `/withdraw/${encodeURIComponent(ticket.safetag)}?view=support_chat&ticketId=${id}`,
        }).catch(() => {});

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
