"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, Users, DollarSign, Globe, RefreshCw, Activity } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

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
  telegram: '#2481cc', discord: '#5865f2', whatsapp: '#25d366',
  instagram: '#e1306c', apple_business: '#555', messenger: '#0084ff',
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
    axios.get(`${API_URL}/admin/analytics/funnel`, { headers: H }).then(r => setFunnelData(r.data)).catch(() => {}), []);
  const fetchRevenue = useCallback(() =>
    axios.get(`${API_URL}/admin/analytics/revenue`, { headers: H, params: { period, currency } }).then(r => setRevenueData(r.data)).catch(() => {}), [period, currency]);
  const fetchGrowth = useCallback(() =>
    axios.get(`${API_URL}/admin/analytics/growth`, { headers: H, params: { period } }).then(r => setGrowthData(r.data)).catch(() => {}), [period]);
  const fetchPlatform = useCallback(() =>
    axios.get(`${API_URL}/admin/analytics/platform`, { headers: H }).then(r => setPlatformData(r.data)).catch(() => {}), []);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchFunnel(), fetchRevenue(), fetchGrowth(), fetchPlatform()]).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetchRevenue(); }, [period, currency]);
  useEffect(() => { fetchGrowth(); }, [period]);

  const totalRevenue = revenueData.data.reduce((s, r) => s + (r.fees || 0), 0);
  const totalVolume = revenueData.data.reduce((s, r) => s + (r.volume || 0), 0);
  const totalUsers = platformData.reduce((s, p) => s + p.users, 0);
  const conversionRate = funnelData.length >= 3 && funnelData[0]?.count > 0
    ? Math.round((funnelData[2].count / funnelData[0].count) * 100) : 0;

  const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

  const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 };

  const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

  return (
    <AdminShell title="Analytics" subtitle="Platform intelligence">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Platform Intelligence
          </p>
          <h1 style={{ ...IT, fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '-.03em', lineHeight: '1.1' }}>Analytics</h1>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '5px' }}>Growth, revenue and engagement — all in one place</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period toggle */}
          {(activeTab === 'Revenue' || activeTab === 'Growth') && (
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '999px', padding: '3px' }}>
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s', whiteSpace: 'nowrap',
                    ...(period === p.value ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(15,23,42,.1)' } : { background: 'none', color: '#64748b' }) }}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {/* Currency toggle (Revenue only) */}
          {activeTab === 'Revenue' && (
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '999px', padding: '3px' }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  style={{ minWidth: '40px', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s',
                    ...(currency === c ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(15,23,42,.1)' } : { background: 'none', color: '#64748b' }) }}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => Promise.allSettled([fetchFunnel(), fetchRevenue(), fetchGrowth(), fetchPlatform()])}
            className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:bg-[#f1f5f9]"
            style={{ border: '1px solid #e9eaec', color: '#64748b', padding: '6px 14px', borderRadius: '999px', background: '#fff' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Platform Users', value: fmtNum(totalUsers), sub: 'across all channels', color: '#0f172a' },
          { label: `Revenue (${revenueData.currency})`, value: fmtNum(totalRevenue), sub: 'platform fees earned', color: '#10b981' },
          { label: `Volume (${revenueData.currency})`, value: fmtNum(totalVolume), sub: 'gross escrow volume', color: '#2563eb' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, sub: 'registered → completed', color: '#9333ea' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '10px' }}>{card.label}</p>
            <p style={{ ...IT, fontSize: '24px', fontWeight: '800', color: card.color, letterSpacing: '-.03em' }}>{card.value}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1" style={{ background: '#f1f5f9', borderRadius: '999px', padding: '3px', alignSelf: 'flex-start', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 18px', borderRadius: '999px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s',
              ...(activeTab === tab ? { background: '#0f172a', color: '#fff' } : { background: 'none', color: '#64748b' }) }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* FUNNEL */}
          {activeTab === 'Funnel' && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
              <p className="font-tight text-[15px] font-bold text-[#0f172a] mb-1">User Conversion Funnel</p>
              <p className="text-[12px] text-[#94a3b8] mb-6">Registration → Trading → Withdrawal lifecycle</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {funnelData.map((step, i) => {
                  const pct = funnelData[0]?.count > 0 ? Math.round((step.count / funnelData[0].count) * 100) : 100;
                  return (
                    <div key={step.step} className="text-center">
                      <div className="relative h-28 bg-[#f1f5f9] rounded-xl flex items-end justify-center pb-3 mb-3 overflow-hidden">
                        <div className="w-full absolute bottom-0 rounded-t-lg transition-all"
                          style={{ height: `${pct}%`, backgroundColor: FUNNEL_COLORS[i], opacity: 0.85 }} />
                        <span className="relative z-10 font-tight text-xl font-bold text-white drop-shadow">{fmtNum(step.count)}</span>
                      </div>
                      <p className="text-[12px] font-semibold text-[#0f172a]">{step.step}</p>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">{pct}% of registered</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-[#f3f4f6] pt-5">
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Drop-off Analysis</p>
                <div className="space-y-3">
                  {funnelData.slice(1).map((step, i) => {
                    const prev = funnelData[i];
                    const dropoff = prev.count > 0 ? Math.round(((prev.count - step.count) / prev.count) * 100) : 0;
                    return (
                      <div key={step.step} className="flex items-center gap-3">
                        <span className="text-[11px] text-[#94a3b8] w-28 shrink-0">{prev.step} →</span>
                        <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full bg-[#e11d48] rounded-full" style={{ width: `${dropoff}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-[#e11d48] w-14 text-right">{dropoff}% lost</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* REVENUE */}
          {activeTab === 'Revenue' && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
              <p className="font-tight text-[15px] font-bold text-[#0f172a] mb-1">Revenue & Volume</p>
              <p className="text-[12px] text-[#94a3b8] mb-6">Platform fee revenue vs. gross escrow volume ({revenueData.currency})</p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={revenueData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [fmtNum(v), name === 'fees' ? 'Platform Fees' : 'Volume']} />
                  <Bar yAxisId="right" dataKey="volume" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="volume" />
                  <Line yAxisId="left" type="monotone" dataKey="fees" stroke="#10b981" strokeWidth={3} dot={false} name="fees" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* GROWTH */}
          {activeTab === 'Growth' && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
              <p className="font-tight text-[15px] font-bold text-[#0f172a] mb-1">User Growth</p>
              <p className="text-[12px] text-[#94a3b8] mb-6">New registrations over time</p>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={growthData}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'New Users']} />
                  <Area type="monotone" dataKey="count" fill="url(#growthGrad)" stroke="#10b981" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* PLATFORM */}
          {activeTab === 'Platform' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {platformData.map(p => (
                  <div key={p.platform} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${PLATFORM_COLORS[p.platform]}18` }}>
                        <Globe className="w-4 h-4" style={{ color: PLATFORM_COLORS[p.platform] || '#94a3b8' }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0f172a] capitalize">{p.platform.replace('_', ' ')}</p>
                        <p className="text-[11px] text-[#94a3b8]">{fmtNum(p.users)} users</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      {[
                        { label: 'Transactions', value: fmtNum(p.transactions) },
                        { label: 'Volume', value: fmtNum(p.volume) },
                        { label: 'Dispute %', value: `${p.dispute_rate}%` },
                      ].map(stat => (
                        <div key={stat.label} className="rounded-xl p-2.5" style={{ background: '#f7f8f9' }}>
                          <p className="font-tight text-[13px] font-bold text-[#0f172a]">{stat.value}</p>
                          <p className="text-[9px] text-[#94a3b8] mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1">
                        <span>Dispute Rate</span>
                        <span className={p.dispute_rate > 10 ? 'text-[#e11d48]' : p.dispute_rate > 5 ? 'text-[#d97706]' : 'text-[#059669]'}>
                          {p.dispute_rate}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: `${Math.min(p.dispute_rate * 5, 100)}%`,
                            background: p.dispute_rate > 10 ? '#e11d48' : p.dispute_rate > 5 ? '#d97706' : '#10b981',
                          }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {platformData.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                  <p className="font-tight text-[15px] font-bold text-[#0f172a] mb-5">Users by Platform</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={platformData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis type="category" dataKey="platform" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} width={90} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtNum(v), 'Users']} />
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
    </AdminShell>
  );
}
