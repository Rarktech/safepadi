"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ShoppingBag, Star, Trash2, XCircle, CheckCircle2, RefreshCw, Search, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const CATEGORY_LABELS: Record<string, string> = { SOCIAL_ACCOUNT: 'Social Account', DIGITAL_GOODS: 'Digital Goods', FREELANCE: 'Freelance', PHYSICAL_GOODS: 'Physical Goods', CRYPTO: 'Crypto', OTHER: 'Other' };

export default function MarketplaceModerationPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [actionModal, setActionModal] = useState<{ id: string; title: string; action: 'remove' | 'activate' } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchListings = useCallback(() =>
    axios.get(`${API_URL}/admin/marketplace/listings`, { headers: H, params: { status: statusFilter || undefined, search: search || undefined } })
      .then(r => setListings(r.data)).catch(() => {}), [statusFilter, search]);
  const fetchStats = useCallback(() =>
    axios.get(`${API_URL}/admin/marketplace/stats`, { headers: H }).then(r => setStats(r.data)).catch(() => {}), []);

  useEffect(() => { setLoading(true); Promise.allSettled([fetchListings(), fetchStats()]).finally(() => setLoading(false)); }, []);
  useEffect(() => { fetchListings(); }, [statusFilter, search]);

  const toggleFeatured = async (id: string, current: boolean) => {
    try {
      await axios.patch(`${API_URL}/admin/marketplace/listings/${id}/featured`, { featured: !current }, { headers: H });
      showToast(current ? 'Removed from featured' : 'Added to featured');
      setListings(prev => prev.map(l => l.id === id ? { ...l, featured: !current } : l));
    } catch { showToast('Failed to update', 'error'); }
  };

  const applyAction = async () => {
    if (!actionModal) return; setActionLoading(true);
    try {
      const newStatus = actionModal.action === 'remove' ? 'REMOVED' : 'ACTIVE';
      await axios.patch(`${API_URL}/admin/marketplace/listings/${actionModal.id}/status`, { status: newStatus, reason: actionReason }, { headers: H });
      showToast(`Listing ${newStatus === 'REMOVED' ? 'removed' : 'reactivated'}`);
      setActionModal(null); setActionReason(''); fetchListings(); fetchStats();
    } catch { showToast('Action failed', 'error'); }
    finally { setActionLoading(false); }
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Delete permanently?')) return;
    try {
      await axios.delete(`${API_URL}/admin/marketplace/listings/${id}`, { headers: H });
      showToast('Listing deleted'); setListings(prev => prev.filter(l => l.id !== id)); fetchStats();
    } catch { showToast('Delete failed', 'error'); }
  };

  return (
    <AdminShell title="Marketplace" subtitle="Moderate listings and manage featured content">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>
          {toast.msg}
        </div>
      )}

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-7 w-full max-w-sm" style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-tight text-[17px] font-bold text-[#0f172a]">{actionModal.action === 'remove' ? 'Remove Listing' : 'Reactivate Listing'}</p>
              <button onClick={() => { setActionModal(null); setActionReason(''); }} className="w-8 h-8 rounded-xl hover:bg-[#f1f5f9] flex items-center justify-center"><X className="w-4 h-4 text-[#64748b]" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] mb-4 truncate">{actionModal.title}</p>
            <label className="adm-section-label block mb-1.5">Reason {actionModal.action === 'remove' ? '(required)' : '(optional)'}</label>
            <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} rows={3}
              placeholder={actionModal.action === 'remove' ? 'Why is this being removed?' : 'Reactivation note...'}
              className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none mb-5" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
            <div className="flex gap-3">
              <button onClick={() => { setActionModal(null); setActionReason(''); }} className="flex-1 h-11 rounded-xl text-[12px] font-semibold text-[#64748b]" style={{ border: '1px solid #e9eaec' }}>Cancel</button>
              <button onClick={applyAction} disabled={actionLoading || (actionModal.action === 'remove' && !actionReason)}
                className="flex-1 h-11 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: actionModal.action === 'remove' ? '#e11d48' : '#059669' }}>
                {actionLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Listings', value: stats?.total ?? '—', icon: ShoppingBag, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Active', value: stats?.active ?? '—', icon: CheckCircle2, color: '#059669', bg: '#f0fdf4' },
          { label: 'Removed', value: stats?.removed ?? '—', icon: XCircle, color: '#e11d48', bg: '#fff1f2' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="font-tight text-2xl font-bold text-[#0f172a]">{card.value}</p>
                <p className="adm-section-label mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…"
            className="w-52 h-9 pl-9 pr-4 rounded-xl text-[12px] font-semibold outline-none" style={{ background: '#fff', border: '1px solid #e9eaec', color: '#0f172a' }} />
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
          {['', 'ACTIVE', 'REMOVED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={statusFilter === s ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => { fetchListings(); fetchStats(); }} className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]" style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
              {['Title', 'Seller', 'Category', 'Intent', 'Price', 'Status', '★', ''].map((h, i) => <th key={i} className="px-5 py-3 adm-section-label">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="w-7 h-7 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin mx-auto" /></td></tr>
              ) : listings.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
                  <p className="text-[12px] font-bold text-[#94a3b8]">No listings found</p>
                </td></tr>
              ) : listings.map((l: any) => (
                <tr key={l.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-[12px] font-bold text-[#0f172a] max-w-[180px] truncate">{l.title}</p>
                    <p className="text-[10px] font-mono text-[#94a3b8]">{l.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] font-semibold text-[#64748b]">{l.seller?.safetag}</td>
                  <td className="px-5 py-3.5"><span className="adm-chip chip-slate">{CATEGORY_LABELS[l.category_type] || l.category_type}</span></td>
                  <td className="px-5 py-3.5"><span className={`adm-chip ${l.intent === 'SELLING' ? 'chip-blue' : 'chip-purple'}`}>{l.intent}</span></td>
                  <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{l.currency} {Number(l.price).toLocaleString()}</td>
                  <td className="px-5 py-3.5"><span className={`adm-chip ${l.status === 'ACTIVE' ? 'chip-green' : l.status === 'PENDING' ? 'chip-amber' : 'chip-red'}`}>{l.status}</span></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => toggleFeatured(l.id, l.featured)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={l.featured ? { background: '#fef3c7', color: '#d97706' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                      <Star className="w-3.5 h-3.5" style={l.featured ? { fill: '#d97706' } : {}} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      {l.status !== 'REMOVED' ? (
                        <button onClick={() => setActionModal({ id: l.id, title: l.title, action: 'remove' })} className="h-8 px-3 rounded-lg text-[11px] font-bold transition-colors" style={{ background: '#fff1f2', color: '#e11d48' }}>Remove</button>
                      ) : (
                        <button onClick={() => setActionModal({ id: l.id, title: l.title, action: 'activate' })} className="h-8 px-3 rounded-lg text-[11px] font-bold transition-colors" style={{ background: '#f0fdf4', color: '#059669' }}>Restore</button>
                      )}
                      <button onClick={() => deleteListing(l.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#fff1f2] hover:text-[#e11d48]" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
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
    </AdminShell>
  );
}
