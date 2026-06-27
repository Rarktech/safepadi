"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ShoppingBag, Star, Eye, Trash2, XCircle, CheckCircle2, RefreshCw, Search, Filter } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const CATEGORY_LABELS: Record<string, string> = {
    SOCIAL_ACCOUNT: 'Social Account', DIGITAL_GOODS: 'Digital Goods',
    FREELANCE: 'Freelance', PHYSICAL_GOODS: 'Physical Goods',
    CRYPTO: 'Crypto', OTHER: 'Other',
};

const INTENT_COLORS: Record<string, string> = {
    SELLING: 'bg-blue-50 text-blue-600',
    BUYING: 'bg-purple-50 text-purple-600',
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600',
    REMOVED: 'bg-rose-50 text-rose-600',
    PENDING: 'bg-amber-50 text-amber-600',
};

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

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchListings = useCallback(() =>
        axios.get(`${API_URL}/admin/marketplace/listings`, { headers: H, params: { status: statusFilter || undefined, search: search || undefined } })
            .then(r => setListings(r.data)).catch(() => {}), [statusFilter, search]);

    const fetchStats = useCallback(() =>
        axios.get(`${API_URL}/admin/marketplace/stats`, { headers: H })
            .then(r => setStats(r.data)).catch(() => {}), []);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([fetchListings(), fetchStats()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchListings(); }, [statusFilter, search]);

    const toggleFeatured = async (id: string, current: boolean) => {
        try {
            await axios.patch(`${API_URL}/admin/marketplace/listings/${id}/featured`, { featured: !current }, { headers: H });
            showToast(current ? 'Removed from featured' : 'Added to featured');
            setListings(prev => prev.map(l => l.id === id ? { ...l, featured: !current } : l));
        } catch {
            showToast('Failed to update featured status', 'error');
        }
    };

    const applyAction = async () => {
        if (!actionModal) return;
        setActionLoading(true);
        try {
            const newStatus = actionModal.action === 'remove' ? 'REMOVED' : 'ACTIVE';
            await axios.patch(`${API_URL}/admin/marketplace/listings/${actionModal.id}/status`,
                { status: newStatus, reason: actionReason }, { headers: H });
            showToast(`Listing ${newStatus === 'REMOVED' ? 'removed' : 'reactivated'}`);
            setActionModal(null);
            setActionReason('');
            fetchListings();
            fetchStats();
        } catch {
            showToast('Action failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const deleteListing = async (id: string) => {
        if (!confirm('Delete this listing permanently?')) return;
        try {
            await axios.delete(`${API_URL}/admin/marketplace/listings/${id}`, { headers: H });
            showToast('Listing deleted');
            setListings(prev => prev.filter(l => l.id !== id));
            fetchStats();
        } catch {
            showToast('Delete failed', 'error');
        }
    };

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

            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-sm mx-4">
                        <h3 className="text-xl font-black text-slate-900 mb-1">
                            {actionModal.action === 'remove' ? 'Remove Listing' : 'Reactivate Listing'}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mb-6 truncate">{actionModal.title}</p>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                Reason {actionModal.action === 'remove' ? '(required)' : '(optional)'}
                            </label>
                            <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} rows={3}
                                placeholder={actionModal.action === 'remove' ? 'Why is this being removed?' : 'Reactivation note...'}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none resize-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setActionModal(null); setActionReason(''); }}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 font-black text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={applyAction} disabled={actionLoading || (actionModal.action === 'remove' && !actionReason)}
                                className={cn("flex-1 h-12 rounded-2xl text-white font-black text-xs disabled:opacity-50 flex items-center justify-center gap-2",
                                    actionModal.action === 'remove' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                )}>
                                {actionLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto">

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Marketplace</h1>
                            <p className="text-xs font-bold text-slate-400">Moderate listings, manage featured content</p>
                        </div>
                        <button onClick={() => { fetchListings(); fetchStats(); }}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {[
                            { label: 'Total Listings', value: stats?.total ?? '—', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Active', value: stats?.active ?? '—', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Removed', value: stats?.removed ?? '—', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.bg, card.color)}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-900">{card.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 mb-6 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..."
                                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
                        </div>
                        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                            {['', 'ACTIVE', 'REMOVED'].map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                        statusFilter === s ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                    )}>{s || 'All'}</button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[900px]">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {['Title', 'Seller', 'Category', 'Intent', 'Price', 'Status', 'Featured', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="w-8 h-8 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                                        </td></tr>
                                    ) : listings.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-16 text-center">
                                            <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm font-bold">No listings found</p>
                                        </td></tr>
                                    ) : listings.map((l: any) => (
                                        <tr key={l.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900 max-w-[180px] truncate">{l.title}</p>
                                                <p className="text-[9px] text-slate-400 font-mono">{l.id.slice(0, 8)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-700">{l.seller?.safetag}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[9px] font-black rounded-xl">
                                                    {CATEGORY_LABELS[l.category_type] || l.category_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black", INTENT_COLORS[l.intent] || 'bg-slate-50 text-slate-500')}>
                                                    {l.intent}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-slate-900">
                                                {l.currency} {Number(l.price).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black", STATUS_COLORS[l.status] || 'bg-slate-50 text-slate-500')}>
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleFeatured(l.id, l.featured)}
                                                    className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                                        l.featured ? "bg-amber-100 text-amber-500 hover:bg-amber-200" : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-400"
                                                    )}>
                                                    <Star className={cn("w-4 h-4", l.featured && "fill-current")} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5">
                                                    {l.status !== 'REMOVED' ? (
                                                        <button onClick={() => setActionModal({ id: l.id, title: l.title, action: 'remove' })}
                                                            className="h-8 px-3 rounded-xl bg-rose-50 text-rose-600 font-black text-[9px] uppercase hover:bg-rose-100">Remove</button>
                                                    ) : (
                                                        <button onClick={() => setActionModal({ id: l.id, title: l.title, action: 'activate' })}
                                                            className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase hover:bg-emerald-100">Restore</button>
                                                    )}
                                                    <button onClick={() => deleteListing(l.id)}
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
