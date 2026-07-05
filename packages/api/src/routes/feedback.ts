import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { routeNotification, recordNotification, sendNotification } from '../services/notifications';
import { FEEDBACK_HOOK_PROMPTS, pickRandom } from '@safepal/shared';
import { requireReportToken } from '../middleware/requireReportToken';
import { sendEmail } from '../services/email';

const router = Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DIGEST_CURSOR_KEY = 'feedback_digest_last_run_at';

const CreateFeedbackSchema = z.object({
    reviewer_safetag: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
    source: z.enum(['post_txn_complete', 'post_dispute_resolved', 'menu']),
    source_ref_id: z.string().uuid().optional(),
    platform: z.string(),
});

const UpdateFeedbackSchema = z.object({
    status: z.enum(['NEW', 'TRIAGED', 'RESOLVED', 'DISMISSED']).optional(),
    admin_notes: z.string().optional(),
});

// POST /api/feedback — submit feedback
router.post('/', async (req, res) => {
    try {
        const data = CreateFeedbackSchema.parse(req.body);

        const withAt = data.reviewer_safetag.startsWith('@') ? data.reviewer_safetag : `@${data.reviewer_safetag}`;
        const withoutAt = data.reviewer_safetag.startsWith('@') ? data.reviewer_safetag.slice(1) : data.reviewer_safetag;
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(400).json({ error: 'Profile not found' });

        const { data: feedback, error } = await supabase
            .from('platform_feedback')
            .insert({
                profile_id: profile.id,
                rating: data.rating,
                comment: data.comment,
                source: data.source,
                source_ref_id: data.source_ref_id,
                platform: data.platform,
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(feedback);
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Feedback already submitted for this event' });
        }
        res.status(400).json({ error: err.message });
    }
});

// GET /api/feedback/mine/:safetag — user's own feedback history
router.get('/mine/:safetag', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { data, error } = await supabase
            .from('platform_feedback')
            .select('*')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/admin/feedback — paginated admin list
router.get('/admin', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 25;
        const offset = (page - 1) * limit;
        const status = req.query.status as string | undefined;
        const platform = req.query.platform as string | undefined;
        const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;

        let query = supabase
            .from('platform_feedback')
            .select('*, profile:profiles!profile_id(safetag, first_name, last_name, email)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (platform) query = query.eq('platform', platform);
        if (rating) query = query.eq('rating', rating);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ data, total: count, page, limit });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// PATCH /api/admin/feedback/:id — admin triage
router.patch('/admin/:id', async (req, res) => {
    try {
        const data = UpdateFeedbackSchema.parse(req.body);
        const { data: updated, error } = await supabase
            .from('platform_feedback')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/feedback/digest — scheduled-agent read: feedback since the last digest run
// Auth: x-report-token header (see requireReportToken), not the admin JWT.
router.get('/digest', requireReportToken, async (req, res) => {
    try {
        const { data: cursorRow } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', DIGEST_CURSOR_KEY)
            .maybeSingle();

        const since = cursorRow?.value || new Date(0).toISOString();
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('platform_feedback')
            .select('rating, comment, source, platform, created_at, profile:profiles!profile_id(safetag)')
            .gt('created_at', since)
            .order('created_at', { ascending: true });

        if (error) throw error;

        await supabase
            .from('platform_settings')
            .upsert({ key: DIGEST_CURSOR_KEY, value: now }, { onConflict: 'key' });

        res.json({ since, until: now, count: data?.length ?? 0, feedback: data ?? [] });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

const DeliverDigestSchema = z.object({
    subject: z.string().min(1),
    text: z.string().min(1),
    html: z.string().optional(),
    telegram: z.string().optional(),
});

// Telegram messages cap at 4096 chars — split on line breaks, leaving headroom for HTML tags.
function splitTelegramMessage(text: string, maxLen = 3900): string[] {
    if (text.length <= maxLen) return [text];
    const lines = text.split('\n');
    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
        if (current && (current.length + line.length + 1) > maxLen) {
            chunks.push(current);
            current = line;
        } else {
            current = current ? `${current}\n${line}` : line;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

// POST /api/feedback/digest/deliver — scheduled-agent write: push the analyzed digest to ops (email + Telegram)
router.post('/digest/deliver', requireReportToken, async (req, res) => {
    try {
        const data = DeliverDigestSchema.parse(req.body);
        const opsEmail = process.env.OPS_EMAIL;
        const opsTelegramChatId = process.env.OPS_TELEGRAM_CHAT_ID;

        const result: { email: boolean; telegram: boolean } = { email: false, telegram: false };

        if (opsEmail) {
            await sendEmail({
                to: opsEmail,
                subject: data.subject,
                html: data.html || `<pre style="font-family:inherit;white-space:pre-wrap">${data.text}</pre>`,
            });
            result.email = true;
        }

        if (opsTelegramChatId && data.telegram) {
            const chunks = splitTelegramMessage(data.telegram);
            let allSent = true;
            for (const chunk of chunks) {
                const sent = await sendNotification('telegram', opsTelegramChatId, chunk);
                if (!sent) allSent = false;
            }
            result.telegram = allSent;
        }

        if (!result.email && !result.telegram) {
            return res.status(500).json({ error: 'No delivery channel configured (set OPS_EMAIL and/or OPS_TELEGRAM_CHAT_ID)' });
        }

        res.json({ success: true, ...result });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Helper: send a feedback prompt to a user if the 7-day cooldown has passed
export async function maybeSendFeedbackPrompt(
    profileId: string,
    source: 'post_txn_complete' | 'post_dispute_resolved',
    refId: string
): Promise<void> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('last_feedback_prompted_at, safetag')
            .eq('id', profileId)
            .single();

        if (profile?.last_feedback_prompted_at) {
            const elapsed = Date.now() - new Date(profile.last_feedback_prompted_at).getTime();
            if (elapsed < SEVEN_DAYS_MS) return;
        }

        const hookMsg = pickRandom(FEEDBACK_HOOK_PROMPTS);
        const label = source === 'post_txn_complete' ? 'txn' : 'dispute';

        await routeNotification(
            profileId,
            hookMsg,
            [{ label: '💭 Rate Safeeely', customId: `pf_rate_menu|${label}|${refId}` }]
        );

        await supabase
            .from('profiles')
            .update({ last_feedback_prompted_at: new Date().toISOString() })
            .eq('id', profileId);

        recordNotification(
            profileId,
            'feedback_prompt',
            '💭 Rate your Safeeely experience',
            hookMsg,
            { source, ref_id: refId, link_url: profile?.safetag ? `/withdraw/${encodeURIComponent(profile.safetag)}` : '/login' }
        ).catch(() => {});
    } catch (err) {
        console.error('[Feedback] maybeSendFeedbackPrompt error:', err);
    }
}

export default router;
