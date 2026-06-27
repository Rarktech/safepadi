"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Star, Flag, Trash2, RefreshCw, Search } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={cn("w-3 h-3", i <= rating ? "text-amber-400 fill-current" : "text-slate-200")} />
        ))}
    </div>
);

export default function ReviewsModerationPage() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [ratingFilter, setRatingFilter] = useState('');
    const [flaggedOnly, setFlaggedOnly] = useState(false);
    const [search, setSearch] = useState('');
    const [flagModal, setFlagModal] = useState<{ id: string; currently: boolean } | null>(null);
    const [flagReason, setFlagReason] = useState('');
    const [flagLoading, setFlagLoading] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchReviews = useCallback(() =>
        axios.get(`${API_URL}/admin/reviews`, { headers: H, params: {
            rating: ratingFilter || undefined,
            flagged: flaggedOnly ? 'true' : undefined,
            search: search || undefined,
        }}).then(r => setReviews(r.data)).catch(() => {}), [ratingFilter, flaggedOnly, search]);

    const fetchStats = useCallback(() =>
        axios.get(`${API_URL}/admin/reviews/stats`, { headers: H }).then(r => setStats(r.data)).catch(() => {}), []);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([fetchReviews(), fetchStats()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchReviews(); }, [ratingFilter, flaggedOnly, search]);

    const applyFlag = async () => {
        if (!flagModal) return;
        setFlagLoading(true);
        try {
            const newFlagged = !flagModal.currently;
            await axios.patch(`${API_URL}/admin/reviews/${flagModal.id}/flag`, { flagged: newFlagged, reason: flagReason || undefined }, { headers: H });
            showToast(newFlagged ? 'Review flagged' : 'Flag removed');
            setFlagModal(null);
            setFlagReason('');
            fetchReviews();
        } catch {
            showToast('Action failed', 'error');
        } finally {
            setFlagLoading(false);
        }
    };

    const deleteReview = async (id: string) => {
        if (!confirm('Delete this review permanently?')) return;
        try {
            await axios.delete(`${API_URL}/admin/reviews/${id}`, { headers: H });
            showToast('Review deleted');
            setReviews(prev => prev.filter(r => r.id !== id));
            fetchStats();
        } catch {
            showToast('Delete failed', 'error');
        }
    };

    const distData = stats?.distribution
        ? Object.entries(stats.distribution).map(([star, count]) => ({ star: `${star}★`, count }))
        : [];

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />

            {toast && (
                <div className={cn("fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300",
                    toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                )}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {flagModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-sm mx-4">
                        <h3 className="text-xl font-black text-slate-900 mb-6">
                            {flagModal.currently ? 'Remove Flag' : 'Flag Review'}
                        </h3>
                        {!flagModal.currently && (
                            <div className="mb-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason</label>
                                <textarea value={flagReason} onChange={e => setFlagReason(e.target.value)} rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none resize-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setFlagModal(null); setFlagReason(''); }}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 font-black text-xs text-slate-600">Cancel</button>
                            <button onClick={applyFlag} disabled={flagLoading}
                                className="flex-1 h-12 rounded-2xl bg-amber-500 text-white font-black text-xs hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                {flagLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Review Moderation</h1>
                            <p className="text-xs font-bold text-slate-400">Flag, review, and remove inappropriate ratings</p>
                        </div>
                        <button onClick={() => { fetchReviews(); fetchStats(); }}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* KPIs + distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Reviews', value: stats?.total ?? '—', color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Avg Rating', value: stats?.avg_rating ? `${stats.avg_rating}★` : '—', color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Flagged', value: stats?.flagged ?? '—', color: 'text-rose-600', bg: 'bg-rose-50' },
                                { label: 'This Week', value: stats?.this_week ?? '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            ].map(card => (
                                <div key={card.label} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5">
                                    <p className={cn("text-2xl font-black mb-1", card.color)}>{card.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rating Distribution</p>
                            <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={distData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="star" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} width={22} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11, fontWeight: 700 }} formatter={(v: any) => [v, 'reviews']} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 mb-6 flex-wrap">
                        <div className="relative min-w-[200px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search safetag..."
                                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
                        </div>
                        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                            {['', '1', '2', '3', '4', '5'].map(r => (
                                <button key={r} onClick={() => setRatingFilter(r)}
                                    className={cn("px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                        ratingFilter === r ? "bg-amber-500 text-white" : "text-slate-400 hover:text-slate-700"
                                    )}>{r ? `${r}★` : 'All'}</button>
                            ))}
                        </div>
                        <button onClick={() => setFlaggedOnly(!flaggedOnly)}
                            className={cn("h-11 px-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-colors flex items-center gap-2",
                                flaggedOnly ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-500 border-slate-200"
                            )}>
                            <Flag className="w-3.5 h-3.5" /> Flagged Only
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {['Reviewer', 'Reviewee', 'Rating', 'Comment', 'Status', 'Date', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={7} className="py-12 text-center">
                                            <div className="w-8 h-8 border-4 border-slate-100 border-t-amber-400 rounded-full animate-spin mx-auto" />
                                        </td></tr>
                                    ) : reviews.length === 0 ? (
                                        <tr><td colSpan={7} className="py-16 text-center">
                                            <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm font-bold">No reviews found</p>
                                        </td></tr>
                                    ) : reviews.map((r: any) => (
                                        <tr key={r.id} className={cn("hover:bg-slate-50/50", r.flagged && "bg-rose-50/30")}>
                                            <td className="px-6 py-4 text-sm font-black text-slate-900">{r.reviewer?.safetag}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{r.reviewee?.safetag}</td>
                                            <td className="px-6 py-4"><StarRating rating={r.rating} /></td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{r.comment || '—'}</td>
                                            <td className="px-6 py-4">
                                                {r.flagged ? (
                                                    <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-black rounded-xl border border-rose-100">Flagged</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-50 text-slate-400 text-[9px] font-black rounded-xl">OK</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => setFlagModal({ id: r.id, currently: r.flagged })}
                                                        className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                                                            r.flagged ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                                        )}>
                                                        <Flag className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => deleteReview(r.id)}
                                                        className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
