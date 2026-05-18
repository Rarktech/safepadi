import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { requireUser, requireSafetagOwner, AuthedRequest } from '../middleware/requireUser';

const router = Router();

// GET /notifications/:safetag?limit=20&offset=0
router.get('/:safetag', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const [{ data: notifications, error }, { count: unread_count }] = await Promise.all([
            supabase
                .from('notifications')
                .select('*')
                .eq('profile_id', profileId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1),
            supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('profile_id', profileId)
                .eq('is_read', false),
        ]);

        if (error) throw error;

        res.json({ notifications: notifications || [], unread_count: unread_count || 0 });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /notifications/:safetag/read  body: { ids?: string[], all?: boolean }
router.patch('/:safetag/read', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;
        const { ids, all } = req.body as { ids?: string[]; all?: boolean };

        let query = supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('profile_id', profileId);

        if (!all && ids && ids.length > 0) {
            query = query.in('id', ids);
        }

        const { error } = await query;
        if (error) throw error;

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /notifications/:safetag/:id
router.delete('/:safetag/:id', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const profileId = (req as AuthedRequest).user.sub;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('profile_id', profileId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
