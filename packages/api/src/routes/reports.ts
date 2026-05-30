/**
 * User Reports Route
 *
 * Required DB migration (run once before deploying):
 *
 *   -- 1. user_reports table
 *   CREATE TABLE user_reports (
 *     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     reporter_id   UUID NOT NULL REFERENCES profiles(id),
 *     reported_id   UUID NOT NULL REFERENCES profiles(id),
 *     reason        TEXT NOT NULL CHECK (reason IN ('SCAM','FAKE_PROOF','HARASSMENT','OTHER')),
 *     description   TEXT,
 *     transaction_id UUID REFERENCES transactions(id),
 *     status        TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','REVIEWED','DISMISSED')),
 *     reviewed_at   TIMESTAMPTZ,
 *     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 *   -- 2. Add flag columns to profiles (skip if they already exist)
 *   ALTER TABLE profiles
 *     ADD COLUMN IF NOT EXISTS is_flagged  BOOLEAN NOT NULL DEFAULT false,
 *     ADD COLUMN IF NOT EXISTS flagged_at  TIMESTAMPTZ;
 */

import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { requireUser, AuthedRequest } from '../middleware/requireUser';

const router = Router();

const CreateReportSchema = z.object({
    reported_safetag: z.string(),
    reason: z.enum(['SCAM', 'FAKE_PROOF', 'HARASSMENT', 'OTHER']),
    transaction_id: z.string().uuid().optional(),
    description: z.string().max(500).optional(),
});

router.post('/', requireUser, async (req, res) => {
    try {
        const user = (req as AuthedRequest).user;
        const data = CreateReportSchema.parse(req.body);

        // Resolve reported user
        const tag = data.reported_safetag.startsWith('@') ? data.reported_safetag : `@${data.reported_safetag}`;
        const tagNoAt = tag.slice(1);
        const { data: reported } = await supabase
            .from('profiles')
            .select('id, safetag')
            .or(`safetag.ilike.${tag},safetag.ilike.${tagNoAt}`)
            .maybeSingle();

        if (!reported) return res.status(404).json({ error: 'Reported user not found' });
        if (reported.id === user.sub) return res.status(400).json({ error: 'You cannot report yourself' });

        // Prevent duplicate reports from the same reporter on the same reported user within 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existingReport } = await supabase
            .from('user_reports')
            .select('id')
            .eq('reporter_id', user.sub)
            .eq('reported_id', reported.id)
            .gte('created_at', sevenDaysAgo)
            .maybeSingle();

        if (existingReport) {
            return res.status(409).json({ error: 'REPORT_ALREADY_SUBMITTED', message: 'You have already reported this user recently. Our team is reviewing it.' });
        }

        const { data: report, error } = await supabase
            .from('user_reports')
            .insert({
                reporter_id: user.sub,
                reported_id: reported.id,
                reason: data.reason,
                description: data.description,
                transaction_id: data.transaction_id ?? null,
                status: 'OPEN',
            })
            .select()
            .single();

        if (error) throw error;

        // Auto-flag: if 3+ distinct reporters reported this user in the last 30 days, flag them
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: reportCount } = await supabase
            .from('user_reports')
            .select('reporter_id', { count: 'exact', head: true })
            .eq('reported_id', reported.id)
            .eq('status', 'OPEN')
            .gte('created_at', thirtyDaysAgo);

        if ((reportCount ?? 0) >= 3) {
            await supabase
                .from('profiles')
                .update({ is_flagged: true, flagged_at: new Date().toISOString() })
                .eq('id', reported.id)
                .eq('is_flagged', false); // only update if not already flagged

            // Notify admins by fetching all admin accounts and routing a notification
            // (Simple: log it — admins will see it in the /admin/reports page)
            console.log(`🚨 [Reports] User ${reported.safetag} auto-flagged after ${reportCount} reports in 30 days`);
        }

        res.status(201).json({ success: true, report_id: report.id });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Admin: list reports
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('user_reports')
            .select('*, reporter:reporter_id(safetag), reported:reported_id(safetag, is_blocked, is_flagged)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (status && typeof status === 'string') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: update report status
router.patch('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const { data, error } = await supabase
            .from('user_reports')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
