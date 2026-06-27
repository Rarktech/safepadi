"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    BarChart, Bar, LineChart, Line, ComposedChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, FunnelChart, Funnel, LabelList
} from "recharts";
import {
    TrendingUp, Users, DollarSign, Globe, RefreshCw,
    ArrowUpRight, Activity, BarChart3
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const TABS = ['Funnel', 'Revenue', 'Growth', 'Platform'] as const;
type Tab = typeof TABS[number];

const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];
const PERIODS = [
    { label: 'Daily (30d)', value: 'day' },
    { label: 'Weekly (12w)', value: 'week' },
    { label: 'Monthly (12m)', value: 'month' },
];

const PLATFORM_COLORS: Record<string, string> = {
    telegram: '#2481cc',
    discord: '#5865f2',
    whatsapp: '#25d366',
    instagram: '#e1306c',
    apple_business: '#555',
    messenger: '#0084ff',
};

const FUNNEL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function AnalyticsHubPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Funnel');
    const [period, setPeriod] = useState('month');
    const [currency, setCurrency] = useState('NGN');
    const [loading, setLoading] = useState(true);

    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<{ data: any[]; currency: string }>({ data: [], currency: 'NGN' });
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [platformData, setPlatformData] = useState<any[]>([]);

    const fetchFunnel = useCallback(() =>
        axios.get(`${API_URL}/admin/analytics/funnel`, { headers: H })
            .then(r => setFunnelData(r.data))
            .catch(() => {}), []);

    const fetchRevenue = useCallback(() =>
        axios.get(`${API_URL}/admin/analytics/revenue`, { headers: H, params: { period, currency } })
            .then(r => setRevenueData(r.data))
            .catch(() => {}), [period, currency]);

    const fetchGrowth = useCallback(() =>
        axios.get(`${API_URL}/admin/analytics/growth`, { headers: H, params: { period } })
            .then(r => setGrowthData(r.data))
            .catch(() => {}), [period]);

    const fetchPlatform = useCallback(() =>
        axios.get(`${API_URL}/admin/analytics/platform`, { headers: H })
            .then(r => setPlatformData(r.data))
            .catch(() => {}), []);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([fetchFunnel(), fetchRevenue(), fetchGrowth(), fetchPlatform()])
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchRevenue(); }, [period, currency]);
    useEffect(() => { fetchGrowth(); }, [period]);

    const totalRevenue = revenueData.data.reduce((s, r) => s + (r.fees || 0), 0);
    const totalVolume = revenueData.data.reduce((s, r) => s + (r.volume || 0), 0);
    const totalUsers = platformData.reduce((s, p) => s + p.users, 0);
    const conversionRate = funnelData.length >= 3 && funnelData[0].count > 0
        ? Math.round((funnelData[2].count / funnelData[0].count) * 100)
        : 0;

    const fmtNum = (n: number) =>
        n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
        : String(n);

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />
            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Analytics Hub</h1>
                            <p className="text-xs font-bold text-slate-400">Platform-wide growth, revenue, and engagement metrics</p>
                        </div>
                        <button
                            onClick={() => Promise.allSettled([fetchFunnel(), fetchRevenue(), fetchGrowth(), fetchPlatform()])}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Users', value: fmtNum(totalUsers), sub: 'across all platforms', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: `Revenue (${revenueData.currency})`, value: fmtNum(totalRevenue), sub: 'platform fees earned', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: `Volume (${revenueData.currency})`, value: fmtNum(totalVolume), sub: 'gross escrow volume', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Conversion Rate', value: `${conversionRate}%`, sub: 'registered → completed', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.bg, card.color)}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900">{card.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                    <p className="text-[9px] text-slate-300 mt-0.5">{card.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm w-fit">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                                    activeTab === tab
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-700"
                                )}
                            >{tab}</button>
                        ))}
                    </div>

                    {/* Period + Currency Controls */}
                    {(activeTab === 'Revenue' || activeTab === 'Growth') && (
                        <div className="flex gap-3 mb-6 flex-wrap">
                            <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                                {PERIODS.map(p => (
                                    <button key={p.value} onClick={() => setPeriod(p.value)}
                                        className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all",
                                            period === p.value ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                        )}>{p.label}</button>
                                ))}
                            </div>
                            {activeTab === 'Revenue' && (
                                <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                                    {CURRENCIES.map(c => (
                                        <button key={c} onClick={() => setCurrency(c)}
                                            className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all",
                                                currency === c ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-700"
                                            )}>{c}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Content */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* FUNNEL */}
                            {activeTab === 'Funnel' && (
                                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                    <h3 className="text-xl font-black text-[#020617] tracking-tight mb-2">User Conversion Funnel</h3>
                                    <p className="text-xs font-bold text-slate-400 mb-8">Registration → Trading → Withdrawal lifecycle</p>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                                        {funnelData.map((step, i) => {
                                            const pct = funnelData[0]?.count > 0
                                                ? Math.round((step.count / funnelData[0].count) * 100)
                                                : 100;
                                            return (
                                                <div key={step.step} className="text-center">
                                                    <div className="relative h-32 bg-slate-50 rounded-2xl flex items-end justify-center pb-4 mb-3 overflow-hidden">
                                                        <div
                                                            className="w-full absolute bottom-0 rounded-t-xl transition-all"
                                                            style={{
                                                                height: `${pct}%`,
                                                                backgroundColor: FUNNEL_COLORS[i],
                                                                opacity: 0.85,
                                                            }}
                                                        />
                                                        <span className="relative z-10 text-2xl font-black text-white drop-shadow">
                                                            {fmtNum(step.count)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-black text-slate-700">{step.step}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{pct}% of registered</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Drop-off analysis */}
                                    <div className="border-t border-slate-50 pt-6">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Drop-off Analysis</p>
                                        <div className="space-y-3">
                                            {funnelData.slice(1).map((step, i) => {
                                                const prev = funnelData[i];
                                                const dropoff = prev.count > 0
                                                    ? Math.round(((prev.count - step.count) / prev.count) * 100)
                                                    : 0;
                                                return (
                                                    <div key={step.step} className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-400 w-32 shrink-0">{prev.step} →</span>
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-rose-400 rounded-full"
                                                                style={{ width: `${dropoff}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-rose-500 w-14 text-right">{dropoff}% lost</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* REVENUE */}
                            {activeTab === 'Revenue' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-1">Revenue & Volume</h3>
                                        <p className="text-xs font-bold text-slate-400 mb-8">Platform fee revenue vs. gross escrow volume ({revenueData.currency})</p>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <ComposedChart data={revenueData.data}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                                                    formatter={(v: any, name: string) => [fmtNum(v), name === 'fees' ? 'Platform Fees' : 'Volume']}
                                                />
                                                <Bar yAxisId="right" dataKey="volume" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="volume" />
                                                <Line yAxisId="left" type="monotone" dataKey="fees" stroke="#10b981" strokeWidth={3} dot={false} name="fees" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* GROWTH */}
                            {activeTab === 'Growth' && (
                                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                    <h3 className="text-xl font-black text-[#020617] tracking-tight mb-1">User Growth</h3>
                                    <p className="text-xs font-bold text-slate-400 mb-8">New registrations over time</p>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <ComposedChart data={growthData}>
                                            <defs>
                                                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                            <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                                                formatter={(v: any) => [v, 'New Users']}
                                            />
                                            <Area type="monotone" dataKey="count" fill="url(#growthGrad)" stroke="#10b981" strokeWidth={3} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* PLATFORM */}
                            {activeTab === 'Platform' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {platformData.map(p => (
                                            <div key={p.platform} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div
                                                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: `${PLATFORM_COLORS[p.platform]}18` }}
                                                    >
                                                        <Globe className="w-5 h-5" style={{ color: PLATFORM_COLORS[p.platform] }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 capitalize">{p.platform.replace('_', ' ')}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{fmtNum(p.users)} users</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    {[
                                                        { label: 'Transactions', value: fmtNum(p.transactions) },
                                                        { label: 'Volume', value: fmtNum(p.volume) },
                                                        { label: 'Dispute %', value: `${p.dispute_rate}%` },
                                                    ].map(stat => (
                                                        <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                                                            <p className="text-sm font-black text-slate-900">{stat.value}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{stat.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Mini bar: dispute rate */}
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                                        <span>Dispute Rate</span>
                                                        <span className={cn(p.dispute_rate > 10 ? 'text-rose-500' : p.dispute_rate > 5 ? 'text-amber-500' : 'text-emerald-500')}>
                                                            {p.dispute_rate}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full", p.dispute_rate > 10 ? 'bg-rose-400' : p.dispute_rate > 5 ? 'bg-amber-400' : 'bg-emerald-400')}
                                                            style={{ width: `${Math.min(p.dispute_rate * 5, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Comparison bar chart */}
                                    {platformData.length > 0 && (
                                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                            <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Users by Platform</h3>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={platformData} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                                    <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                    <YAxis type="category" dataKey="platform" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} width={90} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }}
                                                        formatter={(v: any) => [fmtNum(v), 'Users']}
                                                    />
                                                    <Bar dataKey="users" radius={[0, 8, 8, 0]}>
                                                        {platformData.map((entry: any) => (
                                                            <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] || '#94a3b8'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
