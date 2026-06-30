"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ComposedChart, Bar, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { DollarSign, Shield, ArrowDownRight, RefreshCw, AlertTriangle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const TABS = ['Waterfall', 'Commission Liability', 'Escrow Exposure', 'Refund Credits', 'Withdrawals'] as const;
type Tab = typeof TABS[number];
const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];
const PERIODS = [{ label: 'This Month', value: 'month' }, { label: 'This Quarter', value: 'quarter' }, { label: 'This Year', value: 'year' }];
const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const WF_COLORS: Record<string, string> = { total: '#94a3b8', positive: '#10b981', negative: '#ef4444', net: '#3b82f6' };
const ttStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 };

const fmtNum = (n: number, currency?: string) => {
  const abs = Math.abs(n);
  const fmt = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)}K` : abs.toFixed(0);
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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchWaterfall = useCallback(() => axios.get(`${API_URL}/admin/finance/waterfall`, { headers: H, params: { period, currency } }).then(r => setWaterfall(r.data)).catch(() => {}), [period, currency]);
  const fetchCommissions = useCallback(() => axios.get(`${API_URL}/admin/finance/commission-liability`, { headers: H, params: { currency } }).then(r => { setCommissions(r.data.commissions || []); setCommissionTotals(r.data.totals_by_currency || {}); }).catch(() => {}), [currency]);
  const fetchEscrow = useCallback(() => axios.get(`${API_URL}/admin/finance/escrow-exposure`, { headers: H }).then(r => setEscrow(r.data)).catch(() => {}), []);
  const fetchCredits = useCallback(() => axios.get(`${API_URL}/admin/finance/refund-credits`, { headers: H }).then(r => { setCredits(r.data.credits || []); setCreditTotals({ pending: r.data.pending_by_currency, paid: r.data.paid_by_currency }); }).catch(() => {}), []);
  const fetchWithdrawals = useCallback(() => axios.get(`${API_URL}/admin/finance/withdrawal-trends`, { headers: H, params: { period: wdPeriod } }).then(r => setWithdrawals(r.data)).catch(() => {}), [wdPeriod]);
  const refreshAll = () => { setLoading(true); Promise.allSettled([fetchWaterfall(), fetchCommissions(), fetchEscrow(), fetchCredits(), fetchWithdrawals()]).finally(() => setLoading(false)); };

  useEffect(() => { refreshAll(); }, []);
  useEffect(() => { fetchWaterfall(); }, [period, currency]);
  useEffect(() => { fetchCommissions(); }, [currency]);
  useEffect(() => { fetchWithdrawals(); }, [wdPeriod]);

  const TabPill = ({ value, active, onClick }: { value: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all" style={active ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>{value}</button>
  );

  const CurrencyToggle = ({ active, onChange }: { active: string, onChange: (c: string) => void }) => (
    <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
      {CURRENCIES.map(c => <TabPill key={c} value={c} active={active === c} onClick={() => onChange(c)} />)}
    </div>
  );

  return (
    <AdminShell title="Financial Deep-Dive" subtitle="Revenue waterfall, escrow exposure, and liability management">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1 overflow-x-auto">
          {TABS.map(tab => <TabPill key={tab} value={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />)}
        </div>
        <button onClick={refreshAll} className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]" style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* WATERFALL */}
          {activeTab === 'Waterfall' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
                  {PERIODS.map(p => <TabPill key={p.value} value={p.label} active={period === p.value} onClick={() => setPeriod(p.value)} />)}
                </div>
                <CurrencyToggle active={currency} onChange={setCurrency} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {waterfall.map((w: any) => (
                  <div key={w.name} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
                    <p className="font-tight text-2xl font-bold mb-1" style={{ color: w.value < 0 ? '#e11d48' : '#0f172a' }}>{fmtNum(w.value, currency)}</p>
                    <p className="adm-section-label">{w.name}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-5">Revenue Waterfall</p>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={waterfall}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={ttStyle} formatter={(v: any) => [fmtNum(v, currency), '']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {waterfall.map((w: any) => <Cell key={w.name} fill={WF_COLORS[w.type] || '#94a3b8'} />)}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* COMMISSION LIABILITY */}
          {activeTab === 'Commission Liability' && (
            <div className="space-y-4">
              <CurrencyToggle active={currency} onChange={setCurrency} />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(commissionTotals).map(([cur, amt]) => (
                  <div key={cur} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#fffbeb] flex items-center justify-center shrink-0"><DollarSign className="w-4.5 h-4.5 text-[#d97706]" /></div>
                    <div><p className="font-tight text-xl font-bold text-[#0f172a]">{fmtNum(amt as number, cur)}</p><p className="adm-section-label mt-0.5">Pending ({cur})</p></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f3f4f6]"><p className="font-tight text-[14px] font-bold text-[#0f172a]">Pending Referral Commissions</p></div>
                <table className="w-full text-left">
                  <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    {['Referrer', 'Referred', 'Amount', 'Tier', 'Created'].map(h => <th key={h} className="px-5 py-3 adm-section-label">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {commissions.map((c: any) => (
                      <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{c.referrer?.safetag}</td>
                        <td className="px-5 py-3.5 text-[12px] text-[#64748b]">{c.referred?.safetag}</td>
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{fmtNum(c.amount, c.currency)}</td>
                        <td className="px-5 py-3.5"><span className={`adm-chip ${c.tier === 1 ? 'chip-blue' : 'chip-purple'}`}>Tier {c.tier}</span></td>
                        <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {commissions.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-[12px] font-bold text-[#94a3b8]">No pending commissions</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ESCROW EXPOSURE */}
          {activeTab === 'Escrow Exposure' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {(escrow?.by_currency || []).map((e: any) => (
                  <div key={e.currency} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[#f5f3ff] flex items-center justify-center shrink-0"><Shield className="w-4 h-4 text-[#6366f1]" /></div>
                      <span className="text-[12px] font-bold text-[#64748b]">{e.currency}</span>
                    </div>
                    <p className="font-tight text-xl font-bold text-[#0f172a] mb-0.5">{fmtNum(e.amount)}</p>
                    <p className="text-[10px] text-[#94a3b8]">{e.count} active transactions</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-[#fde68a] p-5 flex items-center gap-4" style={{ background: '#fffbeb' }}>
                  <AlertTriangle className="w-7 h-7 text-[#d97706] shrink-0" />
                  <div>
                    <p className="font-tight text-xl font-bold text-[#d97706]">{escrow?.total_active_count ?? 0}</p>
                    <p className="adm-section-label mt-0.5">Total Active Txns in Escrow</p>
                  </div>
                </div>
              </div>
              {escrow?.by_status && (
                <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                  <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-5">Status Breakdown</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={Object.entries(escrow.by_status).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {Object.keys(escrow.by_status).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={ttStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* REFUND CREDITS */}
          {activeTab === 'Refund Credits' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(creditTotals.pending || {}).map(([cur, amt]) => (
                  <div key={cur} className="rounded-2xl border border-[#fecdd3] p-5 flex items-center gap-4" style={{ background: '#fff1f2' }}>
                    <div className="w-9 h-9 rounded-xl bg-[#fecdd3] flex items-center justify-center shrink-0"><ArrowDownRight className="w-4 h-4 text-[#e11d48]" /></div>
                    <div>
                      <p className="font-tight text-xl font-bold text-[#e11d48]">{fmtNum(amt as number, cur)}</p>
                      <p className="adm-section-label mt-0.5">Pending Refunds ({cur})</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f3f4f6]"><p className="font-tight text-[14px] font-bold text-[#0f172a]">Buyer Refund Credits</p></div>
                <table className="w-full text-left">
                  <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    {['Buyer', 'Amount', 'Type', 'Status', 'Created'].map(h => <th key={h} className="px-5 py-3 adm-section-label">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {credits.map((c: any) => (
                      <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{c.profile?.safetag}</td>
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{fmtNum(c.amount, c.currency)}</td>
                        <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{c.refund_type}</td>
                        <td className="px-5 py-3.5"><span className={`adm-chip ${c.status === 'PENDING' ? 'chip-amber' : c.status === 'APPLIED' ? 'chip-green' : 'chip-slate'}`}>{c.status}</span></td>
                        <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {credits.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-[12px] font-bold text-[#94a3b8]">No refund credits</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WITHDRAWALS */}
          {activeTab === 'Withdrawals' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1 w-fit">
                {[{ label: 'Daily', value: 'day' }, { label: 'Monthly', value: 'month' }].map(p => <TabPill key={p.value} value={p.label} active={wdPeriod === p.value} onClick={() => setWdPeriod(p.value)} />)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(withdrawals?.status_distribution || {}).map(([status, count], i) => (
                  <div key={status} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
                    <div className="w-2.5 h-10 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div><p className="font-tight text-xl font-bold text-[#0f172a]">{count as number}</p><p className="adm-section-label mt-0.5">{status}</p></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-5">Withdrawal Volume Trend</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={withdrawals?.trend || []}>
                    <defs>
                      <linearGradient id="wdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={ttStyle} />
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
    </AdminShell>
  );
}
