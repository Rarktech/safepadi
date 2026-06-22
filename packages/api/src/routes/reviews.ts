import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification, routeNotification, recordNotification } from '../services/notifications';
import { sendReviewReceivedEmail } from '../services/email';
import { requireUser, AuthedRequest } from '../middleware/requireUser';

const router = Router();

const CreateReviewSchema = z.object({
    transaction_id: z.string(),
    reviewer_safetag: z.string(),
    reviewee_safetag: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    proof_url: z.string().optional()
});

router.post('/create', async (req, res) => {
    try {
        const data = CreateReviewSchema.parse(req.body);

        // Get IDs and reviewee email (for fallback)
        const { data: reviewer } = await supabase.from('profiles').select('id').eq('safetag', data.reviewer_safetag).single();
        const { data: reviewee } = await supabase.from('profiles').select('id, email, safetag').eq('safetag', data.reviewee_safetag).single();

        if (!reviewer || !reviewee) {
            return res.status(400).json({ error: 'Reviewer or Reviewee not found' });
        }

        // Guard 1: transaction_id is required
        if (!data.transaction_id) {
            return res.status(400).json({ error: 'TRANSACTION_REQUIRED', message: 'A transaction ID is required to leave a review.' });
        }

        // Guard 2: verify both parties were part of this transaction
        const { data: txn } = await supabase
            .from('transactions')
            .select('id, buyer_id, seller_id, status')
            .eq('id', data.transaction_id)
            .maybeSingle();

        if (!txn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const validParties = new Set([txn.buyer_id, txn.seller_id]);
        if (!validParties.has(reviewer.id) || !validParties.has(reviewee.id)) {
            return res.status(403).json({ error: 'REVIEW_NOT_ALLOWED', message: 'You can only review users you have completed a transaction with.' });
        }

        // Guard 3: transaction must be in a completed state
        const REVIEWABLE_STATUSES = new Set(['COMPLETED', 'FINALIZED', 'RESOLVED_SPLIT']);
        if (!REVIEWABLE_STATUSES.has(txn.status)) {
            return res.status(400).json({ error: 'TRANSACTION_NOT_COMPLETE', message: 'Reviews can only be left after a transaction is completed.' });
        }

        // Guard 4: only one review per (reviewer, reviewee, transaction) pair
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('reviewer_id', reviewer.id)
            .eq('reviewee_id', reviewee.id)
            .eq('transaction_id', data.transaction_id)
            .maybeSingle();

        if (existingReview) {
            return res.status(409).json({ error: 'REVIEW_ALREADY_EXISTS', message: 'You have already reviewed this user for this transaction.' });
        }

        // Capture existing ratings before insert to detect milestone crossings
        const { data: existingRatings } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', reviewee.id);
        const prevCount = existingRatings?.length ?? 0;
        const prevAvg = prevCount > 0
            ? (existingRatings!.reduce((s, r) => s + r.rating, 0) / prevCount)
            : 0;

        const { data: review, error } = await supabase
            .from('reviews')
            .insert({
                transaction_id: data.transaction_id,
                reviewer_id: reviewer.id,
                reviewee_id: reviewee.id,
                rating: data.rating,
                comment: data.comment,
                proof_url: data.proof_url
            })
            .select()
            .single();

        if (error) throw error;

        // Notify the reviewee they received a new review
        const stars = '⭐'.repeat(data.rating);
        const reviewMsg = `${stars} <b>New Review!</b>\n\n<b>${data.reviewer_safetag}</b> left you a <b>${data.rating}/5</b> review.\n\n"${data.comment || '(no comment)'}"`;
        routeNotification(
            reviewee.id,
            reviewMsg,
            [],
            undefined,
            reviewee.email ? () => sendReviewReceivedEmail(reviewee.email, { safetag: reviewee.safetag, reviewerTag: data.reviewer_safetag, rating: data.rating, comment: data.comment }) : undefined
        ).catch(() => {});
        recordNotification(reviewee.id, 'review', `${stars} New Review`, `${data.reviewer_safetag} left you a ${data.rating}/5 review`, { reviewer_safetag: data.reviewer_safetag, rating: data.rating, comment: data.comment, link_url: `/reviews/${data.reviewee_safetag}` }).catch(() => {});

        // Trust score milestone check
        const newAvg = (existingRatings?.reduce((s, r) => s + r.rating, 0) ?? 0 + data.rating) / (prevCount + 1);
        const TRUST_MILESTONES = [3.0, 4.0, 4.5, 5.0];
        const crossed = TRUST_MILESTONES.find(m => prevAvg < m && newAvg >= m);
        if (crossed) {
            const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
            routeNotification(
                reviewee.id,
                `🏅 <b>Trust Milestone!</b>\n\nYour trust score just reached <b>${crossed}/5</b>! High-trust users attract more buyers. Share your profile to show it off.`,
                [{ label: '🔗 Share My Profile', url: `${reviewsUrl}/reviews/${encodeURIComponent(reviewee.safetag)}` }]
            ).catch(() => {});
        }

        res.status(201).json(review);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/stats/:safetag', async (req, res) => {
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
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', profile.id);

        if (error) throw error;

        const count = data.length;
        const avg = count > 0 ? data.reduce((acc, curr) => acc + curr.rating, 0) / count : 0;

        res.json({ average_rating: avg, review_count: count });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/user/:safetag', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, safetag, first_name, last_name')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // Fetch reviews with reviewer details
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                reviewer:profiles!reviewer_id (safetag, first_name, last_name)
            `)
            .eq('reviewee_id', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch replies for these reviews
        const reviewIds = reviews.map(r => r.id);
        const { data: replies } = await supabase
            .from('review_replies')
            .select(`
                *,
                responder:profiles!responder_id (safetag, first_name, last_name)
            `)
            .in('review_id', reviewIds);

        // Fetch votes for these reviews
        const { data: votes } = await supabase
            .from('review_votes')
            .select('*')
            .in('review_id', reviewIds);

        // Map everything together
        const detailedReviews = reviews.map(r => {
            const rReplies = (replies || []).filter(rep => rep.review_id === r.id);
            const rVotes = (votes || []).filter(v => v.review_id === r.id);
            const upvotes = rVotes.filter(v => v.vote_type === 'upvote').length;
            const downvotes = rVotes.filter(v => v.vote_type === 'downvote').length;

            return {
                ...r,
                replies: rReplies,
                upvotes,
                downvotes
            };
        });

        res.json({
            profile,
            reviews: detailedReviews
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/reply', requireUser, async (req, res) => {
    try {
        const user = (req as AuthedRequest).user;
        const { review_id, comment } = req.body;
        const profileId = user.sub;
        const responderSafetag = user.safetag;

        const { data: reply, error } = await supabase
            .from('review_replies')
            .insert({
                review_id,
                responder_id: profileId,
                comment
            })
            .select()
            .single();

        if (error) throw error;

        // Notify the original reviewer that their review received a reply
        const { data: originalReview } = await supabase.from('reviews').select('reviewer_id, reviewer:reviewer_id(safetag)').eq('id', review_id).single();
        if (originalReview && originalReview.reviewer_id !== profileId) {
            const reviewerSafetag = (originalReview.reviewer as any)?.safetag;
            routeNotification(originalReview.reviewer_id, `💬 <b>${responderSafetag}</b> replied to your review:\n\n"${comment}"`).catch(() => {});
            recordNotification(originalReview.reviewer_id, 'review', '💬 Reply to Your Review', `${responderSafetag} replied: "${comment?.substring(0, 80)}"`, { review_id, responder_safetag: responderSafetag, link_url: reviewerSafetag ? `/reviews/${encodeURIComponent(reviewerSafetag)}` : '/login' }).catch(() => {});
        }

        res.status(201).json(reply);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/vote', requireUser, async (req, res) => {
    try {
        const user = (req as AuthedRequest).user;
        const { review_id, vote_type } = req.body;

        const { data: vote, error } = await supabase
            .from('review_votes')
            .upsert({
                review_id,
                voter_id: user.sub,
                vote_type
            }, { onConflict: 'review_id,voter_id' })
            .select()
            .single();

        if (error) throw error;
        res.json(vote);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
