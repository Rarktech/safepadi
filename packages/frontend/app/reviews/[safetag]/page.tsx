'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import styles from './reviews.module.css';

import { SkeletonReviews } from '@/components/skeletons/SkeletonReviews';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/* ─── helpers ─── */
const timeAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return `${d}s ago`;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
};

const initials = (r: any) => {
    const fn = r?.first_name?.[0] ?? '';
    const ln = r?.last_name?.[0] ?? '';
    return (fn + ln).toUpperCase() || '?';
};

const distInit: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

/* ── Star bar in hero ── */
function StarBar({ rating, count, total }: { rating: number; count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className={styles.starBar}>
            <span className={styles.starLabel}>{rating}★</span>
            <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.barCount}>({count})</span>
        </div>
    );
}

/* ── Star rating display ── */
function StarDisplay({ rating }: { rating: number }) {
    return (
        <span className={styles.stars}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={i <= rating ? styles.starFilled : styles.starEmpty}>★</span>
            ))}
        </span>
    );
}

/* ── Avatar initials ── */
function Avatar({ profile, size = 40 }: { profile: any; size?: number }) {
    return (
        <div className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {initials(profile)}
        </div>
    );
}

/* ─── Reply Modal ─── */
function ReplyModal({
    review,
    onClose,
    onSuccess,
    viewerSafetag,
}: {
    review: any;
    onClose: () => void;
    onSuccess: () => void;
    viewerSafetag: string;
}) {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const submit = async () => {
        if (!text.trim()) { setErr('Reply cannot be empty.'); return; }
        setLoading(true); setErr('');
        try {
            const res = await fetch(`${API_URL}/reviews/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    review_id: review.id,
                    responder_safetag: viewerSafetag,
                    comment: text.trim(),
                }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
            onSuccess();
            onClose();
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>↩ Reply to Review</h3>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Preview of the review being replied to */}
                <div className={styles.originalSnippet}>
                    <StarDisplay rating={review.rating} />
                    <p className={styles.snippetText}>
                        {review.reviewer?.first_name} {review.reviewer?.last_name} wrote: "
                        {review.comment?.slice(0, 120) || 'No comment'}{review.comment?.length > 120 ? '…' : ''}"
                    </p>
                </div>

                <textarea
                    className={styles.replyTextarea}
                    placeholder="Write your reply…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={4}
                    autoFocus
                />
                {err && <p className={styles.errorMsg}>⚠ {err}</p>}

                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button className={styles.submitBtn} onClick={submit} disabled={loading}>
                        {loading ? 'Posting…' : 'Post Reply'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Review Card ─── */
function ReviewCard({
    review,
    profileSafetag,
    viewerSafetag,
    onRefresh,
}: {
    review: any;
    profileSafetag: string;
    viewerSafetag: string | null;
    onRefresh: () => void;
}) {
    const [showReply, setShowReply] = useState(false);

    // Profile owner = person whose page we're on
    const isProfileOwner = viewerSafetag === profileSafetag;
    // Reviewer = the person who left the review
    const isReviewer = viewerSafetag === review.reviewer?.safetag;
    // Can reply if: they are the profile owner OR they are the reviewer
    const canReply = viewerSafetag && (isProfileOwner || isReviewer);
    // Can vote only if they are NOT the profile owner
    const canVote = viewerSafetag && !isProfileOwner;

    const vote = async (type: 'upvote' | 'downvote') => {
        if (!canVote || !viewerSafetag) return;
        try {
            await fetch(`${API_URL}/reviews/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ review_id: review.id, voter_safetag: viewerSafetag, vote_type: type }),
            });
            onRefresh();
        } catch { /* silently ignore */ }
    };

    return (
        <div className={styles.card}>
            {/* Header */}
            <div className={styles.cardHeader}>
                <div className={styles.reviewerInfo}>
                    <Avatar profile={review.reviewer} size={44} />
                    <div>
                        <div className={styles.reviewerName}>
                            {review.reviewer?.first_name} {review.reviewer?.last_name}
                            <span className={styles.reviewerTag}>{review.reviewer?.safetag}</span>
                        </div>
                        <StarDisplay rating={review.rating} />
                    </div>
                </div>

                <div className={styles.cardMeta}>
                    <span className={styles.timeAgo}>{timeAgo(review.created_at)}</span>
                    <div className={styles.voteRow}>
                        {canVote ? (
                            <>
                                <button className={styles.voteBtn} onClick={() => vote('upvote')} title="Mark as helpful">
                                    👍 <span>{review.upvotes}</span>
                                </button>
                                <button className={`${styles.voteBtn} ${styles.voteBtnDown}`} onClick={() => vote('downvote')} title="Not helpful">
                                    👎 <span>{review.downvotes}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <span className={styles.voteDisplay}>👍 {review.upvotes}</span>
                                <span className={styles.voteDisplay}>👎 {review.downvotes}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Review comment */}
            <p className={styles.comment}>{review.comment || <em style={{ color: 'var(--text-muted)' }}>No comment left.</em>}</p>

            {/* Proof attachment */}
            {review.proof_url && (
                <div className={styles.proofWrap}>
                    <img src={review.proof_url} alt="Proof of transaction" className={styles.proofImg} />
                </div>
            )}

            {/* Threaded replies */}
            {review.replies?.length > 0 && (
                <div className={styles.repliesSection}>
                    {review.replies.map((rep: any) => (
                        <div key={rep.id} className={styles.replyCard}>
                            <div className={styles.replyHeader}>
                                <Avatar profile={rep.responder} size={28} />
                                <span className={styles.replyName}>
                                    {rep.responder?.first_name} {rep.responder?.last_name}
                                    {rep.responder?.safetag === profileSafetag && (
                                        <span className={styles.ownerBadge}>Owner</span>
                                    )}
                                </span>
                                <span className={styles.replyTime}>{timeAgo(rep.created_at)}</span>
                            </div>
                            <p className={styles.replyText}>{rep.comment}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            {canReply && (
                <div className={styles.cardActions}>
                    <button className={styles.actionBtn} onClick={() => setShowReply(true)}>
                        ↩ Reply
                    </button>
                </div>
            )}

            {showReply && viewerSafetag && (
                <ReplyModal
                    review={review}
                    viewerSafetag={viewerSafetag}
                    onClose={() => setShowReply(false)}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
}

/* ─── Main Page ─── */
export default function ReviewsPage() {
    const { safetag } = useParams() as { safetag: string };
    const searchParams = useSearchParams();

    // Decode the profile safetag from the URL path
    const profileSafetag = decodeURIComponent(safetag);

    // Magic-link: viewer identity comes from ?viewer=@safetag query param
    // The bot encodes the bot user's safetag here when generating the link
    const viewerParam = searchParams.get('viewer');
    const viewerSafetag = viewerParam ? decodeURIComponent(viewerParam) : null;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/reviews/user/${profileSafetag}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!res.ok) throw new Error('Profile not found.');
            setData(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            // Buffer for premium feel
            setTimeout(() => setLoading(false), 800);
        }
    }, [profileSafetag]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <SkeletonReviews />;

    if (error) return (
        <div className={styles.centered}>
            <p style={{ color: '#dc2626', fontWeight: 600 }}>⚠ {error}</p>
        </div>
    );

    if (!data) return null;

    const { profile, reviews } = data;
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / total : 0;

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: any) => { if (dist[r.rating] !== undefined) dist[r.rating]++; });

    const isViewingOwnPage = viewerSafetag === profileSafetag;

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <header className={styles.pageHeader}>
                <div className={styles.logo}>
                    <img src="/logo-main.svg" alt="Safeeely" style={{ height: '28px' }} />
                </div>
                <div className={styles.headerBadge}>✓ Verified Escrow Platform</div>
            </header>

            <main className={styles.main}>
                {/* ── Session Banner ── */}
                {viewerSafetag && (
                    <div className={styles.sessionBanner}>
                        <div className={styles.sessionDot} />
                        {isViewingOwnPage
                            ? `Viewing your profile as ${viewerSafetag} — you can reply to reviews`
                            : `Viewing as ${viewerSafetag} — you can vote & reply`}
                    </div>
                )}

                {/* ── Profile Hero ── */}
                <section className={styles.heroSection}>
                    <div className={styles.heroLeft}>
                        <Avatar profile={profile} size={68} />
                        <div>
                            <h1 className={styles.profileName}>
                                {profile.first_name} {profile.last_name}
                            </h1>
                            <p className={styles.profileTag}>{profile.safetag}</p>
                            <div className={styles.heroRating}>
                                <span className={styles.heroScore}>{avg.toFixed(1)}</span>
                                <div>
                                    <StarDisplay rating={Math.round(avg)} />
                                    <p className={styles.reviewCount}>{total} {total === 1 ? 'review' : 'reviews'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroRight}>
                        {[5, 4, 3, 2, 1].map(n => (
                            <StarBar key={n} rating={n} count={dist[n]} total={total} />
                        ))}
                    </div>
                </section>

                {/* ── Reviews List ── */}
                <section className={styles.reviewsSection}>
                    <h2 className={styles.sectionTitle}>
                        Reviews <span className={styles.sectionCount}>{total}</span>
                    </h2>

                    {total === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>💬</span>
                            <p>No reviews yet for <strong>{profileSafetag}</strong>.</p>
                            <p style={{ fontSize: 13 }}>Complete a transaction to receive your first review!</p>
                        </div>
                    ) : (
                        <div className={styles.reviewList}>
                            {reviews.map((r: any) => (
                                <ReviewCard
                                    key={r.id}
                                    review={r}
                                    profileSafetag={profileSafetag}
                                    viewerSafetag={viewerSafetag}
                                    onRefresh={load}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
