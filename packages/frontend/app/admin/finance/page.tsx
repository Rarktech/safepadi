"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import {
    DollarSign, TrendingDown, Shield, CreditCard, ArrowDownRight,
    RefreshCw, Wallet, AlertTriangle
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const TABS = ['Waterfall', 'Commission Liability', 'Escrow Exposure', 'Refund Credits', 'Withdrawals'] as const;
type Tab = typeof TABS[number];

const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];
const PERIODS = [
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
];

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const fmtNum = (n: number, currency?: string) => {
    const abs = Math.abs(n);
    const fmt = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M`
        : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K`
        : abs.toFixed(0);
    return `${n < 0 ? '-' : ''}${currency ? `${currency} ` : ''}${fmt}`;
};

export default function FinancePage() {
    const [activeTab, setActiveTab] = useState<Tab>('Waterfall');
    const [period, setPeriod] = useState('month');
    const [currency, setCurrency] = useState('NGN');
    const [wdPeriod, setWdPeriod] = useState('month');
    const [loading, setLoading] = useState(false);

    const [waterfall, setWaterfall] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [commissionTotals, setCommissionTotals] = useState<Record<string, number>>({});
    const [escrow, setEscrow] = useState<any>(null);
    const [credits, setCredits] = useState<any[]>([]);
    const [creditTotals, setCreditTotals] = useState<any>({});
    const [withdrawals, setWithdrawals] = useState<any>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchWaterfall = useCallback(() =>
        axios.get(`${API_URL}/admin/finance/waterfall`, { headers: H, params: { period, currency } })
            .then(r => setWaterfall(r.data)).catch(() => {}), [period, currency]);

    const fetchCommissions = useCallback(() =>
        axios.get(`${API_URL}/admin/finance/commission-liability`, { headers: H, params: { currency } })
            .then(r => { setCommissions(r.data.commissions || []); setCommissionTotals(r.data.totals_by_currency || {}); })
            .catch(() => {}), [currency]);

    const fetchEscrow = useCallback(() =>
        axios.get(`${API_URL}/admin/finance/escrow-exposure`, { headers: H })
            .then(r => setEscrow(r.data)).catch(() => {}), []);

    const fetchCredits = useCallback(() =>
        axios.get(`${API_URL}/admin/finance/refund-credits`, { headers: H })
            .then(r => { setCredits(r.data.credits || []); setCreditTotals({ pending: r.data.pending_by_currency, paid: r.data.paid_by_currency }); })
            .catch(() => {}), []);

    const fetchWithdrawals = useCallback(() =>
        axios.get(`${API_URL}/admin/finance/withdrawal-trends`, { headers: H, params: { period: wdPeriod } })
            .then(r => setWithdrawals(r.data)).catch(() => {}), [wdPeriod]);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([fetchWaterfall(), fetchCommissions(), fetchEscrow(), fetchCredits(), fetchWithdrawals()])
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchWaterfall(); }, [period, currency]);
    useEffect(() => { fetchCommissions(); }, [currency]);
    useEffect(() => { fetchWithdrawals(); }, [wdPeriod]);

    const wfColors: Record<string, string> = { total: '#94a3b8', positive: '#10b981', negative: '#ef4444', net: '#3b82f6' };

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
                <div className="max-w-7xl mx-auto">

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Financial Deep-Dive</h1>
                            <p className="text-xs font-bold text-slate-400">Revenue waterfall, escrow exposure, and liability management</p>
                        </div>
                        <button onClick={() => Promise.allSettled([fetchWaterfall(), fetchCommissions(), fetchEscrow(), fetchCredits(), fetchWithdrawals()])}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm overflow-x-auto">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={cn("px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all",
                                    activeTab === tab ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-700"
                                )}>{tab}</button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* WATERFALL */}
                            {activeTab === 'Waterfall' && (
                                <div className="space-y-6">
                                    <div className="flex gap-3 flex-wrap">
                                        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                                            {PERIODS.map(p => (
                                                <button key={p.value} onClick={() => setPeriod(p.value)}
                                                    className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                        period === p.value ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                                    )}>{p.label}</button>
                                            ))}
                                        </div>
                                        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                                            {CURRENCIES.map(c => (
                                                <button key={c} onClick={() => setCurrency(c)}
                                                    className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                        currency === c ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-700"
                                                    )}>{c}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {waterfall.map((w, i) => (
                                            <div key={w.name} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                                                <p className={cn("text-2xl font-black mb-1", w.value < 0 ? 'text-rose-600' : 'text-slate-900')}>
                                                    {fmtNum(w.value, currency)}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{w.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Revenue Waterfall</h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <ComposedChart data={waterfall}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                                                    formatter={(v: any) => [fmtNum(v, currency), '']}
                                                />
                                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                    {waterfall.map((w) => (
                                                        <Cell key={w.name} fill={wfColors[w.type] || '#94a3b8'} />
                                                    ))}
                                                </Bar>
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* COMMISSION LIABILITY */}
                            {activeTab === 'Commission Liability' && (
                                <div className="space-y-6">
                                    <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
                                        {CURRENCIES.map(c => (
                                            <button key={c} onClick={() => setCurrency(c)}
                                                className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                    currency === c ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-700"
                                                )}>{c}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(commissionTotals).map(([cur, amt]) => (
                                            <div key={cur} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                                    <DollarSign className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-slate-900">{fmtNum(amt as number, cur)}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Pending ({cur})</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-slate-50">
                                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Pending Referral Commissions</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[600px]">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        {['Referrer', 'Referred', 'Amount', 'Tier', 'Created'].map(h => (
                                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {commissions.map((c: any) => (
                                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                                            <td className="px-8 py-4 text-sm font-bold text-slate-900">{c.referrer?.safetag}</td>
                                                            <td className="px-8 py-4 text-sm text-slate-600">{c.referred?.safetag}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-slate-900">{fmtNum(c.amount, c.currency)}</td>
                                                            <td className="px-8 py-4">
                                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black uppercase",
                                                                    c.tier === 1 ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                                                )}>Tier {c.tier}</span>
                                                            </td>
                                                            <td className="px-8 py-4 text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))}
                                                    {commissions.length === 0 && (
                                                        <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm font-bold">No pending commissions</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ESCROW EXPOSURE */}
                            {activeTab === 'Escrow Exposure' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(escrow?.by_currency || []).map((e: any) => (
                                            <div key={e.currency} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                        <Shield className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <span className="font-black text-slate-900">{e.currency}</span>
                                                </div>
                                                <p className="text-2xl font-black text-slate-900 mb-1">{fmtNum(e.amount)}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{e.count} active transactions</p>
                                            </div>
                                        ))}
                                        <div className="bg-amber-50 rounded-[28px] border border-amber-100 shadow-sm p-6 flex items-center gap-4">
                                            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                                            <div>
                                                <p className="text-xl font-black text-amber-700">{escrow?.total_active_count ?? 0}</p>
                                                <p className="text-[10px] font-black text-amber-500 uppercase">Total Active Txns in Escrow</p>
                                            </div>
                                        </div>
                                    </div>
                                    {escrow?.by_status && (
                                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                            <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Status Breakdown</h3>
                                            <ResponsiveContainer width="100%" height={240}>
                                                <PieChart>
                                                    <Pie data={Object.entries(escrow.by_status).map(([name, value]) => ({ name, value }))}
                                                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                                                        {Object.keys(escrow.by_status).map((_, i) => (
                                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* REFUND CREDITS */}
                            {activeTab === 'Refund Credits' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(creditTotals.pending || {}).map(([cur, amt]) => (
                                            <div key={cur} className="bg-rose-50 rounded-[28px] border border-rose-100 shadow-sm p-6 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                                                    <ArrowDownRight className="w-5 h-5 text-rose-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-rose-700">{fmtNum(amt as number, cur)}</p>
                                                    <p className="text-[10px] font-black text-rose-400 uppercase">Pending Refunds ({cur})</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-slate-50">
                                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Buyer Refund Credits</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[600px]">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        {['Buyer', 'Amount', 'Type', 'Status', 'Created'].map(h => (
                                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {credits.map((c: any) => (
                                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                                            <td className="px-8 py-4 text-sm font-bold text-slate-900">{c.profile?.safetag}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-slate-900">{fmtNum(c.amount, c.currency)}</td>
                                                            <td className="px-8 py-4 text-xs text-slate-500">{c.refund_type}</td>
                                                            <td className="px-8 py-4">
                                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black uppercase",
                                                                    c.status === 'PENDING' ? "bg-amber-50 text-amber-600" :
                                                                    c.status === 'APPLIED' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                                                                )}>{c.status}</span>
                                                            </td>
                                                            <td className="px-8 py-4 text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))}
                                                    {credits.length === 0 && (
                                                        <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm font-bold">No refund credits</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WITHDRAWALS */}
                            {activeTab === 'Withdrawals' && (
                                <div className="space-y-6">
                                    <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
                                        {[{ label: 'Daily', value: 'day' }, { label: 'Monthly', value: 'month' }].map(p => (
                                            <button key={p.value} onClick={() => setWdPeriod(p.value)}
                                                className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                    wdPeriod === p.value ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                                )}>{p.label}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(withdrawals?.status_distribution || {}).map(([status, count], i) => (
                                            <div key={status} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                                                <div className="w-2.5 h-10 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <div>
                                                    <p className="text-xl font-black text-slate-900">{count as number}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">{status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Withdrawal Volume Trend</h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <AreaChart data={withdrawals?.trend || []}>
                                                <defs>
                                                    <linearGradient id="wdGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} />
                                                <Area type="monotone" dataKey="total" fill="url(#wdGrad)" stroke="#3b82f6" strokeWidth={3} dot={false} name="Total" />
                                                <Area type="monotone" dataKey="paid" fill="none" stroke="#10b981" strokeWidth={2} dot={false} name="Paid" />
                                                <Area type="monotone" dataKey="rejected" fill="none" stroke="#ef4444" strokeWidth={2} dot={false} name="Rejected" />
                                            </AreaChart>
                                        </ResponsiveContainer>
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
