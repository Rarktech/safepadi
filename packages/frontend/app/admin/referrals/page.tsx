"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, DollarSign, TrendingUp, Gift, RefreshCw, CheckCircle2 } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const TABS = ['Overview', 'Leaderboard', 'Commissions'] as const;
type Tab = typeof TABS[number];

const PIE_COLORS = ['#3b82f6', '#8b5cf6'];
const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];

const fmtNum = (n: number, currency?: string) => {
    const abs = Math.abs(n);
    const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M`
        : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K`
        : abs.toFixed(0);
    return `${currency ? `${currency} ` : ''}${s}`;
};

export default function ReferralsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Overview');
    const [period, setPeriod] = useState('all');
    const [commCurrency, setCommCurrency] = useState('NGN');
    const [commStatus, setCommStatus] = useState('');
    const [commTier, setCommTier] = useState('');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [overview, setOverview] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchOverview = useCallback(() =>
        axios.get(`${API_URL}/admin/referrals/overview`, { headers: H }).then(r => setOverview(r.data)).catch(() => {}), []);

    const fetchLeaderboard = useCallback(() =>
        axios.get(`${API_URL}/admin/referrals/leaderboard`, { headers: H, params: { period } }).then(r => setLeaderboard(r.data)).catch(() => {}), [period]);

    const fetchCommissions = useCallback(() =>
        axios.get(`${API_URL}/admin/referrals/commissions`, { headers: H, params: { currency: commCurrency || undefined, status: commStatus || undefined, tier: commTier || undefined } })
            .then(r => setCommissions(r.data)).catch(() => {}), [commCurrency, commStatus, commTier]);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([fetchOverview(), fetchLeaderboard(), fetchCommissions()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchLeaderboard(); }, [period]);
    useEffect(() => { fetchCommissions(); }, [commCurrency, commStatus, commTier]);

    const awardCommission = async (id: string) => {
        try {
            await axios.post(`${API_URL}/admin/referrals/commissions/${id}/award`, {}, { headers: H });
            showToast('Commission marked as paid');
            setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'COMPLETED' } : c));
        } catch {
            showToast('Failed to award commission', 'error');
        }
    };

    const topCurrency = overview?.total_paid ? Object.keys(overview.total_paid)[0] : 'NGN';
    const totalPaid = overview?.total_paid?.[topCurrency] || 0;
    const totalPending = overview?.pending_liability?.[topCurrency] || 0;

    const tier1Count = commissions.filter(c => c.tier === 1).length;
    const tier2Count = commissions.filter(c => c.tier === 2).length;
    const tierPie = [
        { name: 'Tier 1', value: tier1Count },
        { name: 'Tier 2', value: tier2Count },
    ].filter(d => d.value > 0);

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

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Referral Program</h1>
                            <p className="text-xs font-bold text-slate-400">Leaderboards, commission management, and tier analytics</p>
                        </div>
                        <button onClick={() => Promise.allSettled([fetchOverview(), fetchLeaderboard(), fetchCommissions()])}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Active Referrers', value: overview?.active_referrers ?? '—', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: `Total Paid (${topCurrency})`, value: fmtNum(totalPaid), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: `Pending (${topCurrency})`, value: fmtNum(totalPending), icon: Gift, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Total Referred', value: overview?.total_referred ?? '—', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.bg, card.color)}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900">{card.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm w-fit">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={cn("px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                                    activeTab === tab ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                )}>{tab}</button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'Overview' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Tier split */}
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Commission Tier Split</h3>
                                        {tierPie.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={200}>
                                                <PieChart>
                                                    <Pie data={tierPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                        {tierPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-48 flex items-center justify-center text-slate-300 text-sm font-bold">No data yet</div>
                                        )}
                                        <div className="flex gap-4 justify-center mt-4">
                                            {tierPie.map((t, i) => (
                                                <div key={t.name} className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                                    <span className="text-xs font-black text-slate-600">{t.name}: {t.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Top 5 leaderboard preview */}
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Top 5 Referrers</h3>
                                        <div className="space-y-3">
                                            {leaderboard.slice(0, 5).map((r: any, i: number) => (
                                                <div key={r.referrer_id} className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-400 w-5">{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-slate-900 truncate">{r.safetag}</p>
                                                        <p className="text-[9px] text-slate-400">T1: {r.tier1} · T2: {r.tier2}</p>
                                                    </div>
                                                    <span className="text-sm font-black text-emerald-600">{fmtNum(r.total)}</span>
                                                </div>
                                            ))}
                                            {leaderboard.length === 0 && (
                                                <p className="text-slate-400 text-sm font-bold text-center py-8">No referrals yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Leaderboard' && (
                                <div className="space-y-4">
                                    <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
                                        {[{ label: 'All Time', value: 'all' }, { label: 'This Month', value: 'monthly' }].map(p => (
                                            <button key={p.value} onClick={() => setPeriod(p.value)}
                                                className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                    period === p.value ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                                )}>{p.label}</button>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[600px]">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        {['Rank', 'Referrer', 'Tier 1', 'Tier 2', 'Total Earned'].map(h => (
                                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {leaderboard.map((r: any, i: number) => (
                                                        <tr key={r.referrer_id} className="hover:bg-slate-50/50">
                                                            <td className="px-8 py-4">
                                                                <span className={cn("text-sm font-black",
                                                                    i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300'
                                                                )}>#{i + 1}</span>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm font-black text-slate-900">{r.safetag}</td>
                                                            <td className="px-8 py-4">
                                                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-xl">{r.tier1} refs</span>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <span className="px-2 py-1 bg-purple-50 text-purple-600 text-[9px] font-black rounded-xl">{r.tier2} refs</span>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm font-black text-emerald-600">{fmtNum(r.total)}</td>
                                                        </tr>
                                                    ))}
                                                    {leaderboard.length === 0 && (
                                                        <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm font-bold">No referral data</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Commissions' && (
                                <div className="space-y-4">
                                    {/* Filters */}
                                    <div className="flex gap-3 flex-wrap">
                                        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                                            {CURRENCIES.map(c => (
                                                <button key={c} onClick={() => setCommCurrency(c)}
                                                    className={cn("px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                        commCurrency === c ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-700"
                                                    )}>{c}</button>
                                            ))}
                                        </div>
                                        <select value={commStatus} onChange={e => setCommStatus(e.target.value)}
                                            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none">
                                            <option value="">All Statuses</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                        <select value={commTier} onChange={e => setCommTier(e.target.value)}
                                            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none">
                                            <option value="">All Tiers</option>
                                            <option value="1">Tier 1</option>
                                            <option value="2">Tier 2</option>
                                        </select>
                                    </div>

                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[700px]">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        {['Referrer', 'Referred', 'Amount', 'Tier', 'Status', 'Date', 'Action'].map(h => (
                                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {commissions.map((c: any) => (
                                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                                            <td className="px-8 py-4 text-sm font-black text-slate-900">{c.referrer?.safetag}</td>
                                                            <td className="px-8 py-4 text-sm text-slate-600">{c.referred?.safetag}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-slate-900">{fmtNum(c.amount, c.currency)}</td>
                                                            <td className="px-8 py-4">
                                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black",
                                                                    c.tier === 1 ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                                                )}>T{c.tier}</span>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black",
                                                                    c.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                                )}>{c.status}</span>
                                                            </td>
                                                            <td className="px-8 py-4 text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                                                            <td className="px-8 py-4">
                                                                {c.status === 'PENDING' && (
                                                                    <button onClick={() => awardCommission(c.id)}
                                                                        className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase hover:bg-emerald-100 flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3" /> Award
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {commissions.length === 0 && (
                                                        <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-400 text-sm font-bold">No commissions found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
