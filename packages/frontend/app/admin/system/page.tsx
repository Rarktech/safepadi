"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Activity, CheckCircle2, XCircle, Clock, Play, RefreshCw, Shield, FileCheck, CreditCard, Server, Zap } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

export default function SystemHealthPage() {
  const router = useRouter();
  const [health, setHealth] = useState<any>(null);
  const [crons, setCrons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchAll = async () => {
    try {
      const [healthRes, cronsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/system/health`, { headers: H }),
        axios.get(`${API_URL}/admin/system/crons`, { headers: H }),
      ]);
      setHealth(healthRes.data); setCrons(cronsRes.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  };

  const triggerCron = async (name: string) => {
    setTriggering(name);
    try {
      await axios.post(`${API_URL}/admin/system/crons/${name}/trigger`, {}, { headers: H });
      showToast(`${name.replace(/_/g, ' ')} triggered`);
      setTimeout(fetchAll, 3000);
    } catch { showToast('Failed to trigger job', 'error'); }
    finally { setTriggering(null); }
  };

  return (
    <AdminShell title="System Health" subtitle="Monitor API status, cron jobs, and platform operations">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-end">
        <button onClick={fetchAll}
          className="h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]"
          style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-[#e9eaec] h-28 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'API Latency', value: `${health?.api_latency_ms ?? '—'}ms`, icon: Zap, color: '#059669', bg: '#f0fdf4' },
            { label: 'Uptime', value: health?.uptime_seconds ? `${Math.floor(health.uptime_seconds / 3600)}h ${Math.floor((health.uptime_seconds % 3600) / 60)}m` : '—', icon: Server, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Escalated Disputes', value: health?.open_disputes_count ?? '—', icon: Shield, color: '#e11d48', bg: '#fff1f2', href: '/admin/disputes' },
            { label: 'Pending Payouts', value: health?.pending_payouts_count ?? '—', icon: CreditCard, color: '#d97706', bg: '#fffbeb', href: '/admin/payouts' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} onClick={() => (card as any).href && router.push((card as any).href)}
                className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4"
                style={(card as any).href ? { cursor: 'pointer' } : {}}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div>
                  <p className="font-tight text-xl font-bold text-[#0f172a]">{card.value}</p>
                  <p className="adm-section-label mt-0.5">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cron Jobs Table */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
          <div>
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Scheduled Jobs</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">{crons.length} jobs — last run times from production</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                {['Job', 'Schedule', 'Last Run', 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 adm-section-label ${h === '' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crons.map((cron: any) => {
                const lastRun = cron.last_run;
                const isError = lastRun?.status === 'ERROR';
                const isRunning = triggering === cron.name;
                return (
                  <tr key={cron.name} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: !lastRun ? '#cbd5e1' : isError ? '#e11d48' : '#10b981' }} />
                        <div>
                          <p className="text-[12px] font-bold text-[#0f172a]">{cron.label}</p>
                          <p className="text-[10px] font-mono text-[#94a3b8]">{cron.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[11px] font-semibold text-[#64748b]">{cron.humanSchedule}</td>
                    <td className="px-5 py-4">
                      {lastRun ? (
                        <div>
                          <p className="text-[11px] font-bold text-[#0f172a]">{new Date(lastRun.started_at).toLocaleString()}</p>
                          {lastRun.completed_at && (
                            <p className="text-[10px] text-[#94a3b8]">
                              {Math.round((new Date(lastRun.completed_at).getTime() - new Date(lastRun.started_at).getTime()) / 1000)}s
                            </p>
                          )}
                        </div>
                      ) : <span className="text-[11px] text-[#cbd5e1] font-semibold">Never ran</span>}
                    </td>
                    <td className="px-5 py-4">
                      {!lastRun ? (
                        <span className="adm-chip chip-slate">Pending</span>
                      ) : isError ? (
                        <div>
                          <span className="adm-chip chip-red">Error</span>
                          {lastRun.error_message && <p className="text-[10px] text-[#e11d48] mt-1 max-w-[180px] truncate">{lastRun.error_message}</p>}
                        </div>
                      ) : (
                        <span className="adm-chip chip-green">OK</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => triggerCron(cron.name)} disabled={isRunning}
                        className="h-8 px-3 rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 ml-auto disabled:opacity-50 transition-colors"
                        style={{ background: '#0f172a' }}>
                        {isRunning ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        Run Now
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Node info */}
      {health?.node_version && (
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-[#0f172a] flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-[#10b981]" />
          </div>
          <p className="text-[11px] font-semibold text-[#64748b]">
            Node.js <span className="text-[#0f172a] font-bold">{health.node_version}</span>
            {' · '}Uptime <span className="text-[#0f172a] font-bold">{Math.floor((health.uptime_seconds || 0) / 3600)}h {Math.floor(((health.uptime_seconds || 0) % 3600) / 60)}m</span>
            {' · '}Environment <span className="font-bold" style={{ color: '#059669' }}>Production</span>
          </p>
        </div>
      )}
    </AdminShell>
  );
}
