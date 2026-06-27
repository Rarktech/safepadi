"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Shield, AlertTriangle, UserX, Star, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const TABS = ['Fraud Queue', 'Leaderboard'] as const;
type Tab = typeof TABS[number];

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export default function TrustReputationPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Fraud Queue');
    const [overview, setOverview] = useState<any>(null);
    const [flagged, setFlagged] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [overrideModal, setOverrideModal] = useState<{ profileId: string; safetag: string } | null>(null);
    const [overrideScore, setOverrideScore] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideLoading, setOverrideLoading] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        await Promise.allSettled([
            axios.get(`${API_URL}/admin/trust/overview`, { headers: H }).then(r => setOverview(r.data)),
            axios.get(`${API_URL}/admin/trust/flagged`, { headers: H }).then(r => setFlagged(r.data)),
            axios.get(`${API_URL}/admin/trust/leaderboard`, { headers: H }).then(r => setLeaderboard(r.data)),
        ]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, []);

    const clearFlag = async (profileId: string) => {
        try {
            await axios.patch(`${API_URL}/admin/trust/${profileId}/clear-flag`, { reason: 'Cleared by admin' }, { headers: H });
            showToast('Flag cleared successfully');
            setFlagged(prev => prev.filter(p => p.id !== profileId));
            setOverview((prev: any) => prev ? { ...prev, flagged_count: Math.max(0, (prev.flagged_count || 1) - 1) } : prev);
        } catch {
            showToast('Failed to clear flag', 'error');
        }
    };

    const applyOverride = async () => {
        if (!overrideModal || !overrideScore || !overrideReason) return;
        setOverrideLoading(true);
        try {
            await axios.patch(`${API_URL}/admin/trust/${overrideModal.profileId}/score`,
                { new_score: parseFloat(overrideScore), reason: overrideReason }, { headers: H });
            showToast('Trust score updated');
            setOverrideModal(null);
            setOverrideScore('');
            setOverrideReason('');
            fetchAll();
        } catch {
            showToast('Failed to update score', 'error');
        } finally {
            setOverrideLoading(false);
        }
    };

    const trustBucket = (score: number) => {
        if (score >= 4.5) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (score >= 3.5) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
        if (score >= 2.5) return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Poor', color: 'text-rose-600', bg: 'bg-rose-50' };
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

            {overrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-sm mx-4">
                        <h3 className="text-xl font-black text-slate-900 mb-1">Override Trust Score</h3>
                        <p className="text-xs font-bold text-slate-400 mb-6">{overrideModal.safetag}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">New Score (1.0 – 5.0)</label>
                                <input type="number" min="1" max="5" step="0.1" value={overrideScore} onChange={e => setOverrideScore(e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason</label>
                                <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none resize-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setOverrideModal(null)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 font-black text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={applyOverride} disabled={overrideLoading}
                                className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {overrideLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                Apply Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">Trust & Reputation</h1>
                            <p className="text-xs font-bold text-slate-400">Fraud review queue, trust scores, and manual overrides</p>
                        </div>
                        <button onClick={fetchAll}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {[
                            { label: 'Flagged Users', value: overview?.flagged_count ?? '—', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Blocked Users', value: overview?.blocked_count ?? '—', icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
                            { label: 'Avg Trust Score', value: overview?.avg_trust_score ? `${overview.avg_trust_score}/5` : '—', icon: Star, color: 'text-blue-600', bg: 'bg-blue-50' },
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
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'Fraud Queue' && (
                                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Flagged Accounts</h3>
                                            <p className="text-xs font-bold text-slate-400 mt-1">{flagged.length} users awaiting review</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[700px]">
                                            <thead className="bg-slate-50/50">
                                                <tr>
                                                    {['User', 'Trust Score', 'Disputes Lost', 'Fraud Flags', 'Actions'].map(h => (
                                                        <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {flagged.map((u: any) => {
                                                    const rep = Array.isArray(u.reputation) ? u.reputation[0] : u.reputation;
                                                    const score = rep?.trust_score ?? 0;
                                                    const bucket = trustBucket(score);
                                                    return (
                                                        <tr key={u.id} className="hover:bg-slate-50/50">
                                                            <td className="px-8 py-4">
                                                                <p className="text-sm font-black text-slate-900">{u.safetag}</p>
                                                                <p className="text-[10px] text-slate-400">{u.email}</p>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black", bucket.bg, bucket.color)}>
                                                                    {score.toFixed(1)} — {bucket.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm font-bold text-rose-500">{rep?.disputes_lost ?? 0}</td>
                                                            <td className="px-8 py-4">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {(rep?.fraud_flags || []).map((f: string) => (
                                                                        <span key={f} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded-xl">{f}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => clearFlag(u.id)}
                                                                        className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase hover:bg-emerald-100 flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3" /> Clear
                                                                    </button>
                                                                    <button onClick={() => setOverrideModal({ profileId: u.id, safetag: u.safetag })}
                                                                        className="h-8 px-3 rounded-xl bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase hover:bg-indigo-100">
                                                                        Score
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {flagged.length === 0 && (
                                                    <tr><td colSpan={5} className="px-8 py-16 text-center">
                                                        <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                        <p className="text-slate-400 text-sm font-bold">No flagged accounts</p>
                                                    </td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Leaderboard' && (
                                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-50">
                                        <h3 className="text-xl font-black text-[#020617] tracking-tight">Top Trust Scores</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1">Top 50 users by platform trust score</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead className="bg-slate-50/50">
                                                <tr>
                                                    {['#', 'User', 'Trust Score', 'Disputes Won', 'Disputes Lost', 'Actions'].map(h => (
                                                        <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {leaderboard.map((u: any, i: number) => {
                                                    const score = Number(u.trust_score);
                                                    const bucket = trustBucket(score);
                                                    const profile = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="px-8 py-4 text-sm font-black text-slate-400">{i + 1}</td>
                                                            <td className="px-8 py-4">
                                                                <p className="text-sm font-black text-slate-900">{profile?.safetag}</p>
                                                                <p className="text-[10px] text-slate-400">{profile?.email}</p>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black", bucket.bg, bucket.color)}>
                                                                    {score.toFixed(1)}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm font-bold text-emerald-600">{u.disputes_won ?? 0}</td>
                                                            <td className="px-8 py-4 text-sm font-bold text-rose-400">{u.disputes_lost ?? 0}</td>
                                                            <td className="px-8 py-4">
                                                                <button onClick={() => setOverrideModal({ profileId: u.profile_id, safetag: profile?.safetag })}
                                                                    className="h-8 px-3 rounded-xl bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase hover:bg-indigo-100">
                                                                    Override
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
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
