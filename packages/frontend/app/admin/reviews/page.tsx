"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Star, Flag, Trash2, RefreshCw, Search } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} className="w-3 h-3" style={{ color: i <= rating ? '#f59e0b' : '#e2e8f0', fill: i <= rating ? '#f59e0b' : 'none' }} />
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
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const fetchReviews = useCallback(() =>
    axios.get(`${API_URL}/admin/reviews`, { headers: H, params: { rating: ratingFilter || undefined, flagged: flaggedOnly ? 'true' : undefined, search: search || undefined } })
      .then(r => setReviews(r.data)).catch(() => {}), [ratingFilter, flaggedOnly, search]);

  const fetchStats = useCallback(() =>
    axios.get(`${API_URL}/admin/reviews/stats`, { headers: H }).then(r => setStats(r.data)).catch(() => {}), []);

  useEffect(() => { setLoading(true); Promise.allSettled([fetchReviews(), fetchStats()]).finally(() => setLoading(false)); }, []);
  useEffect(() => { fetchReviews(); }, [ratingFilter, flaggedOnly, search]);

  const applyFlag = async () => {
    if (!flagModal) return; setFlagLoading(true);
    try {
      const newFlagged = !flagModal.currently;
      await axios.patch(`${API_URL}/admin/reviews/${flagModal.id}/flag`, { flagged: newFlagged, reason: flagReason || undefined }, { headers: H });
      showToast(newFlagged ? 'Review flagged' : 'Flag removed');
      setFlagModal(null); setFlagReason(''); fetchReviews();
    } catch { showToast('Action failed', 'error'); }
    finally { setFlagLoading(false); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      await axios.delete(`${API_URL}/admin/reviews/${id}`, { headers: H });
      showToast('Review deleted'); setReviews(prev => prev.filter(r => r.id !== id)); fetchStats();
    } catch { showToast('Delete failed', 'error'); }
  };

  const distData = stats?.distribution ? Object.entries(stats.distribution).map(([star, count]) => ({ star: `${star}★`, count })) : [];

  return (
    <AdminShell title="Review Moderation" subtitle="Flag, review, and remove inappropriate ratings">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>
          {toast.msg}
        </div>
      )}

      {/* Flag modal */}
      {flagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-7 w-full max-w-sm" style={{ border: '1px solid #edeff3' }}>
            <p className="font-tight text-[17px] font-bold text-[#0f172a] mb-5">{flagModal.currently ? 'Remove Flag' : 'Flag Review'}</p>
            {!flagModal.currently && (
              <div className="mb-4">
                <label className="adm-section-label block mb-1.5">Reason</label>
                <textarea value={flagReason} onChange={e => setFlagReason(e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setFlagModal(null); setFlagReason(''); }} className="flex-1 h-11 rounded-xl text-[12px] font-semibold text-[#64748b]" style={{ border: '1px solid #e9eaec' }}>Cancel</button>
              <button onClick={applyFlag} disabled={flagLoading} className="flex-1 h-11 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#d97706' }}>
                {flagLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Reviews', value: stats?.total ?? '—', color: '#2563eb', bg: '#eff6ff' },
            { label: 'Avg Rating', value: stats?.avg_rating ? `${stats.avg_rating}★` : '—', color: '#d97706', bg: '#fffbeb' },
            { label: 'Flagged', value: stats?.flagged ?? '—', color: '#e11d48', bg: '#fff1f2' },
            { label: 'This Week', value: stats?.this_week ?? '—', color: '#059669', bg: '#f0fdf4' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
              <p className="font-tight text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
              <p className="adm-section-label">{card.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
          <p className="adm-section-label mb-4">Rating Distribution</p>
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
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search safetag…"
            className="w-52 h-9 pl-9 pr-4 rounded-xl text-[12px] font-semibold outline-none"
            style={{ background: '#fff', border: '1px solid #e9eaec', color: '#0f172a' }} />
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
          {['', '1', '2', '3', '4', '5'].map(r => (
            <button key={r} onClick={() => setRatingFilter(r)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={ratingFilter === r ? { background: '#d97706', color: '#fff' } : { color: '#64748b' }}>
              {r ? `${r}★` : 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setFlaggedOnly(!flaggedOnly)}
          className="h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors"
          style={flaggedOnly ? { background: '#e11d48', color: '#fff', border: '1px solid #e11d48' } : { background: '#fff', color: '#64748b', border: '1px solid #e9eaec' }}>
          <Flag className="w-3.5 h-3.5" /> Flagged Only
        </button>
        <button onClick={() => { fetchReviews(); fetchStats(); }}
          className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]"
          style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
              {['Reviewer', 'Reviewee', 'Rating', 'Comment', 'Status', 'Date', ''].map((h, i) => (
                <th key={i} className={`px-5 py-3 adm-section-label ${h === '' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center"><div className="w-7 h-7 border-[3px] border-[#e9eaec] border-t-[#f59e0b] rounded-full animate-spin mx-auto" /></td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Star className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
                <p className="text-[12px] font-bold text-[#94a3b8]">No reviews found</p>
              </td></tr>
            ) : reviews.map((r: any) => (
              <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors" style={r.flagged ? { background: '#fff9f9' } : {}}>
                <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{r.reviewer?.safetag}</td>
                <td className="px-5 py-3.5 text-[12px] text-[#64748b]">{r.reviewee?.safetag}</td>
                <td className="px-5 py-3.5"><StarRating rating={r.rating} /></td>
                <td className="px-5 py-3.5 text-[11px] text-[#94a3b8] max-w-[200px] truncate">{r.comment || '—'}</td>
                <td className="px-5 py-3.5">
                  {r.flagged ? <span className="adm-chip chip-red">Flagged</span> : <span className="adm-chip chip-slate">OK</span>}
                </td>
                <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setFlagModal({ id: r.id, currently: r.flagged })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={r.flagged ? { background: '#f1f5f9', color: '#64748b' } : { background: '#fffbeb', color: '#d97706' }}>
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteReview(r.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#fff1f2] hover:text-[#e11d48]"
                      style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
