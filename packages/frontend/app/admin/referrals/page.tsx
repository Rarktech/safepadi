"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Users, DollarSign, TrendingUp, Gift, RefreshCw, CheckCircle2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const TABS = ['Overview', 'Leaderboard', 'Commissions'] as const;
type Tab = typeof TABS[number];
const PIE_COLORS = ['#3b82f6', '#8b5cf6'];
const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];

const fmtNum = (n: number, currency?: string) => {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
  return `${currency ? `${currency} ` : ''}${s}`;
};

const ttStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 };

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchOverview = useCallback(() => axios.get(`${API_URL}/admin/referrals/overview`, { headers: H }).then(r => setOverview(r.data)).catch(() => {}), []);
  const fetchLeaderboard = useCallback(() => axios.get(`${API_URL}/admin/referrals/leaderboard`, { headers: H, params: { period } }).then(r => setLeaderboard(r.data)).catch(() => {}), [period]);
  const fetchCommissions = useCallback(() =>
    axios.get(`${API_URL}/admin/referrals/commissions`, { headers: H, params: { currency: commCurrency || undefined, status: commStatus || undefined, tier: commTier || undefined } })
      .then(r => setCommissions(r.data)).catch(() => {}), [commCurrency, commStatus, commTier]);

  useEffect(() => { setLoading(true); Promise.allSettled([fetchOverview(), fetchLeaderboard(), fetchCommissions()]).finally(() => setLoading(false)); }, []);
  useEffect(() => { fetchLeaderboard(); }, [period]);
  useEffect(() => { fetchCommissions(); }, [commCurrency, commStatus, commTier]);

  const awardCommission = async (id: string) => {
    try {
      await axios.post(`${API_URL}/admin/referrals/commissions/${id}/award`, {}, { headers: H });
      showToast('Commission marked as paid');
      setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'COMPLETED' } : c));
    } catch { showToast('Failed to award commission', 'error'); }
  };

  const topCurrency = overview?.total_paid ? Object.keys(overview.total_paid)[0] : 'NGN';
  const totalPaid = overview?.total_paid?.[topCurrency] || 0;
  const totalPending = overview?.pending_liability?.[topCurrency] || 0;
  const tier1Count = commissions.filter(c => c.tier === 1).length;
  const tier2Count = commissions.filter(c => c.tier === 2).length;
  const tierPie = [{ name: 'Tier 1', value: tier1Count }, { name: 'Tier 2', value: tier2Count }].filter(d => d.value > 0);

  return (
    <AdminShell title="Referral Program" subtitle="Leaderboards, commission management, and tier analytics">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>
          {toast.msg}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Referrers', value: overview?.active_referrers ?? '—', icon: Users, color: '#2563eb', bg: '#eff6ff' },
          { label: `Total Paid (${topCurrency})`, value: fmtNum(totalPaid), icon: DollarSign, color: '#059669', bg: '#f0fdf4' },
          { label: `Pending (${topCurrency})`, value: fmtNum(totalPending), icon: Gift, color: '#d97706', bg: '#fffbeb' },
          { label: 'Total Referred', value: overview?.total_referred ?? '—', icon: TrendingUp, color: '#6366f1', bg: '#f5f3ff' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="font-tight text-xl font-bold text-[#0f172a]">{card.value}</p>
                <p className="adm-section-label mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={activeTab === tab ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
              {tab}
            </button>
          ))}
        </div>
        <button onClick={() => Promise.allSettled([fetchOverview(), fetchLeaderboard(), fetchCommissions()])}
          className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]"
          style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-5">Commission Tier Split</p>
                {tierPie.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={tierPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {tierPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={ttStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-5 justify-center mt-3">
                      {tierPie.map((t, i) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-[11px] font-bold text-[#64748b]">{t.name}: {t.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="h-48 flex items-center justify-center text-[12px] font-bold text-[#94a3b8]">No data yet</div>}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-5">Top 5 Referrers</p>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((r: any, i: number) => (
                    <div key={r.referrer_id} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#94a3b8] w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#0f172a] truncate">{r.safetag}</p>
                        <p className="text-[10px] text-[#94a3b8]">T1: {r.tier1} · T2: {r.tier2}</p>
                      </div>
                      <span className="text-[12px] font-black text-[#059669]">{fmtNum(r.total)}</span>
                    </div>
                  ))}
                  {leaderboard.length === 0 && <p className="text-center text-[12px] font-bold text-[#94a3b8] py-8">No referrals yet</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Leaderboard' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1 w-fit">
                {[{ label: 'All Time', value: 'all' }, { label: 'This Month', value: 'monthly' }].map(p => (
                  <button key={p.value} onClick={() => setPeriod(p.value)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={period === p.value ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                      {['Rank', 'Referrer', 'Tier 1', 'Tier 2', 'Total Earned'].map(h => (
                        <th key={h} className="px-5 py-3 adm-section-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r: any, i: number) => (
                      <tr key={r.referrer_id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-black" style={{ color: i === 0 ? '#d97706' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#cbd5e1' }}>#{i+1}</span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{r.safetag}</td>
                        <td className="px-5 py-3.5"><span className="adm-chip chip-blue">{r.tier1} refs</span></td>
                        <td className="px-5 py-3.5"><span className="adm-chip chip-purple">{r.tier2} refs</span></td>
                        <td className="px-5 py-3.5 font-tight text-[13px] font-bold text-[#059669]">{fmtNum(r.total)}</td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-[12px] font-bold text-[#94a3b8]">No referral data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Commissions' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
                  {CURRENCIES.map(c => (
                    <button key={c} onClick={() => setCommCurrency(c)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={commCurrency === c ? { background: '#059669', color: '#fff' } : { color: '#64748b' }}>
                      {c}
                    </button>
                  ))}
                </div>
                <select value={commStatus} onChange={e => setCommStatus(e.target.value)} className="h-9 px-3 rounded-xl text-[12px] font-semibold outline-none" style={{ border: '1px solid #e9eaec', color: '#64748b', background: '#fff' }}>
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <select value={commTier} onChange={e => setCommTier(e.target.value)} className="h-9 px-3 rounded-xl text-[12px] font-semibold outline-none" style={{ border: '1px solid #e9eaec', color: '#64748b', background: '#fff' }}>
                  <option value="">All Tiers</option>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                </select>
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                      {['Referrer', 'Referred', 'Amount', 'Tier', 'Status', 'Date', ''].map((h, i) => (
                        <th key={i} className="px-5 py-3 adm-section-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c: any) => (
                      <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{c.referrer?.safetag}</td>
                        <td className="px-5 py-3.5 text-[12px] text-[#64748b]">{c.referred?.safetag}</td>
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{fmtNum(c.amount, c.currency)}</td>
                        <td className="px-5 py-3.5"><span className={`adm-chip ${c.tier === 1 ? 'chip-blue' : 'chip-purple'}`}>T{c.tier}</span></td>
                        <td className="px-5 py-3.5"><span className={`adm-chip ${c.status === 'COMPLETED' ? 'chip-green' : 'chip-amber'}`}>{c.status}</span></td>
                        <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5">
                          {c.status === 'PENDING' && (
                            <button onClick={() => awardCommission(c.id)}
                              className="h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors hover:bg-[#d1fae5]"
                              style={{ background: '#f0fdf4', color: '#059669' }}>
                              <CheckCircle2 className="w-3 h-3" /> Award
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {commissions.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-[12px] font-bold text-[#94a3b8]">No commissions found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
