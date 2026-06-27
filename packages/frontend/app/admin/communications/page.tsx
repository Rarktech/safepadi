"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Bell, RefreshCw, Search, MailOpen, Mail } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const TABS = ['Notification Log', 'Delivery Stats'] as const;
type Tab = typeof TABS[number];

const TYPE_COLORS: Record<string, string> = {
    PAYMENT: 'bg-emerald-50 text-emerald-600',
    DISPUTE: 'bg-rose-50 text-rose-600',
    TRANSACTION: 'bg-blue-50 text-blue-600',
    SYSTEM: 'bg-slate-50 text-slate-500',
    REFERRAL: 'bg-purple-50 text-purple-600',
    REVIEW: 'bg-amber-50 text-amber-600',
};

export default function CommunicationsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Notification Log');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [days, setDays] = useState(30);

    const fetchNotifications = useCallback(() =>
        axios.get(`${API_URL}/admin/communications/notifications`, { headers: H, params: { type: typeFilter || undefined } })
            .then(r => setNotifications(r.data)).catch(() => {}), [typeFilter]);

    const fetchStats = useCallback(() =>
        axios.get(`${API_URL}/admin/communications/delivery-stats`, { headers: H, params: { days } })
            .then(r => setStats(r.data)).catch(() => {}), [days]);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([fetchNotifications(), fetchStats()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchNotifications(); }, [typeFilter]);
    useEffect(() => { fetchStats(); }, [days]);

    const totalSent = stats?.trend?.reduce((s: number, d: any) => s + d.sent, 0) || 0;
    const totalRead = stats?.trend?.reduce((s: number, d: any) => s + d.read, 0) || 0;
    const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

    const typeEntries = Object.entries(stats?.by_type || {}).sort(([, a], [, b]) => (b as number) - (a as number));

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Communications</h1>
                            <p className="text-xs font-bold text-slate-400">Notification delivery log and engagement metrics</p>
                        </div>
                        <button onClick={() => { fetchNotifications(); fetchStats(); }}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* KPI Row */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {[
                            { label: `Sent (${days}d)`, value: totalSent, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Read', value: totalRead, icon: MailOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Read Rate', value: `${readRate}%`, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'Notification Log' && (
                                <div className="space-y-4">
                                    <div className="flex gap-3 flex-wrap">
                                        <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm flex-wrap">
                                            {['', 'PAYMENT', 'DISPUTE', 'TRANSACTION', 'SYSTEM', 'REFERRAL'].map(t => (
                                                <button key={t} onClick={() => setTypeFilter(t)}
                                                    className={cn("px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-wider",
                                                        typeFilter === t ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                                    )}>{t || 'All'}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[700px]">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        {['User', 'Type', 'Title', 'Content', 'Read', 'Date'].map(h => (
                                                            <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {notifications.length === 0 ? (
                                                        <tr><td colSpan={6} className="py-16 text-center">
                                                            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                            <p className="text-slate-400 text-sm font-bold">No notifications found</p>
                                                        </td></tr>
                                                    ) : notifications.map((n: any) => (
                                                        <tr key={n.id} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-4 text-sm font-black text-slate-900">{n.profile?.safetag}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black", TYPE_COLORS[n.type] || 'bg-slate-50 text-slate-500')}>
                                                                    {n.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-700 max-w-[140px] truncate">{n.title}</td>
                                                            <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px] truncate">{n.content}</td>
                                                            <td className="px-6 py-4">
                                                                {n.is_read ? (
                                                                    <MailOpen className="w-4 h-4 text-emerald-500" />
                                                                ) : (
                                                                    <Mail className="w-4 h-4 text-slate-300" />
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Delivery Stats' && (
                                <div className="space-y-6">
                                    <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
                                        {[7, 14, 30, 90].map(d => (
                                            <button key={d} onClick={() => setDays(d)}
                                                className={cn("px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider",
                                                    days === d ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                                                )}>{d}d</button>
                                        ))}
                                    </div>

                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Daily Notifications Sent vs Read</h3>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={stats?.trend || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} />
                                                <Bar dataKey="sent" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Sent" />
                                                <Bar dataKey="read" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Read" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight mb-6">Volume by Notification Type</h3>
                                        <div className="space-y-3">
                                            {typeEntries.map(([type, count]) => {
                                                const pct = totalSent > 0 ? Math.round(((count as number) / totalSent) * 100) : 0;
                                                return (
                                                    <div key={type} className="flex items-center gap-4">
                                                        <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black w-28 text-center", TYPE_COLORS[type] || 'bg-slate-50 text-slate-500')}>
                                                            {type}
                                                        </span>
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 w-10 text-right">{count as number}</span>
                                                    </div>
                                                );
                                            })}
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
