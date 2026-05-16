import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { routeNotification, recordNotification } from '../services/notifications';
import { FEEDBACK_HOOK_PROMPTS, pickRandom } from '@safepal/shared';

const router = Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

// Helper: send a feedback prompt to a user if the 7-day cooldown has passed
export async function maybeSendFeedbackPrompt(
    profileId: string,
    source: 'post_txn_complete' | 'post_dispute_resolved',
    refId: string
): Promise<void> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('last_feedback_prompted_at')
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
            { source, ref_id: refId, link_url: '/dashboard' }
        ).catch(() => {});
    } catch (err) {
        console.error('[Feedback] maybeSendFeedbackPrompt error:', err);
    }
}

export default router;
