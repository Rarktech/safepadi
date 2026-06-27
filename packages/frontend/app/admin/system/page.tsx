"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    RefreshCw,
    Shield,
    FileCheck,
    CreditCard,
    Server,
    Zap,
    AlertTriangle
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function SystemHealthPage() {
    const router = useRouter();
    const [health, setHealth] = useState<any>(null);
    const [crons, setCrons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const headers = { 'ngrok-skip-browser-warning': 'true' };

    const fetchAll = async () => {
        try {
            const [healthRes, cronsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/system/health`, { headers }),
                axios.get(`${API_URL}/admin/system/crons`, { headers }),
            ]);
            setHealth(healthRes.data);
            setCrons(cronsRes.data || []);
        } catch {}
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const triggerCron = async (name: string) => {
        setTriggering(name);
        try {
            await axios.post(`${API_URL}/admin/system/crons/${name}/trigger`, {}, { headers });
            showToast(`${name.replace(/_/g, ' ')} triggered successfully`);
            setTimeout(fetchAll, 3000);
        } catch {
            showToast('Failed to trigger job', 'error');
        } finally {
            setTriggering(null);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#f8fafc] min-h-screen">
                <AdminSidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />

            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300",
                    toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                )}>
                    {toast.type === "success" ? "✅" : "❌"} {toast.msg}
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-2">System Health</h1>
                            <p className="text-xs font-bold text-slate-400">Monitor API status, cron jobs, and platform operations</p>
                        </div>
                        <button
                            onClick={fetchAll}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* API Health Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            {
                                label: 'API Latency',
                                value: `${health?.api_latency_ms ?? '—'}ms`,
                                icon: Zap,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50',
                            },
                            {
                                label: 'Uptime',
                                value: health?.uptime_seconds
                                    ? `${Math.floor(health.uptime_seconds / 3600)}h ${Math.floor((health.uptime_seconds % 3600) / 60)}m`
                                    : '—',
                                icon: Server,
                                color: 'text-blue-600',
                                bg: 'bg-blue-50',
                            },
                            {
                                label: 'Escalated Disputes',
                                value: health?.open_disputes_count ?? '—',
                                icon: Shield,
                                color: 'text-rose-600',
                                bg: 'bg-rose-50',
                                href: '/admin/disputes',
                            },
                            {
                                label: 'Pending Payouts',
                                value: health?.pending_payouts_count ?? '—',
                                icon: CreditCard,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50',
                                href: '/admin/payouts',
                            },
                        ].map(card => (
                            <div
                                key={card.label}
                                onClick={() => card.href && router.push(card.href)}
                                className={cn(
                                    "bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm flex items-center gap-4",
                                    card.href && "cursor-pointer hover:shadow-md transition-shadow"
                                )}
                            >
                                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.bg, card.color)}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900">{card.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cron Jobs Table */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-[#020617] tracking-tight">Scheduled Jobs</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">{crons.length} jobs — last run times from production</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Job</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Last Run</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {crons.map((cron: any) => {
                                        const lastRun = cron.last_run;
                                        const isSuccess = lastRun?.status === 'SUCCESS';
                                        const isError = lastRun?.status === 'ERROR';
                                        const isRunning = triggering === cron.name;

                                        return (
                                            <tr key={cron.name} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full shrink-0",
                                                            !lastRun ? "bg-slate-300" : isError ? "bg-rose-400" : "bg-emerald-400"
                                                        )} />
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{cron.label}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 font-mono">{cron.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-[10px] font-bold text-slate-500">{cron.humanSchedule}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    {lastRun ? (
                                                        <div>
                                                            <p className="text-[11px] font-bold text-slate-700">
                                                                {new Date(lastRun.started_at).toLocaleString()}
                                                            </p>
                                                            {lastRun.completed_at && (
                                                                <p className="text-[9px] font-bold text-slate-400">
                                                                    {Math.round((new Date(lastRun.completed_at).getTime() - new Date(lastRun.started_at).getTime()) / 1000)}s duration
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-300">Never ran</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5">
                                                    {!lastRun ? (
                                                        <span className="px-3 py-1 rounded-xl text-[9px] font-black bg-slate-100 text-slate-500 uppercase">Pending</span>
                                                    ) : isError ? (
                                                        <div>
                                                            <span className="px-3 py-1 rounded-xl text-[9px] font-black bg-rose-50 text-rose-600 uppercase border border-rose-100">Error</span>
                                                            {lastRun.error_message && (
                                                                <p className="text-[9px] text-rose-400 mt-1 max-w-[180px] truncate">{lastRun.error_message}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-xl text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase border border-emerald-100">OK</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => triggerCron(cron.name)}
                                                        disabled={isRunning}
                                                        className="h-9 px-4 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 ml-auto"
                                                    >
                                                        {isRunning ? (
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Play className="w-3 h-3 fill-current" />
                                                        )}
                                                        Run Now
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Node Info */}
                    {health?.node_version && (
                        <div className="mt-6 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                                <Server className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-[11px] font-bold text-slate-500">
                                Node.js <span className="text-slate-900 font-black">{health.node_version}</span>
                                {' · '}
                                Uptime <span className="text-slate-900 font-black">{Math.floor((health.uptime_seconds || 0) / 3600)}h {Math.floor(((health.uptime_seconds || 0) % 3600) / 60)}m</span>
                                {' · '}
                                Environment <span className="text-emerald-600 font-black">Production</span>
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
