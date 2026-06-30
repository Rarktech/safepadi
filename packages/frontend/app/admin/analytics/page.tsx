"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, DollarSign, TrendingUp, Activity, RefreshCw } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

const TABS = ['Funnel', 'Revenue', 'Growth', 'Platform'] as const;
type Tab = typeof TABS[number];

const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];
const PERIODS = [
  { label: '30d', value: 'day' },
  { label: '12w', value: 'week' },
  { label: '12m', value: 'month' },
];
const FUNNEL_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
const PLATFORM_COLORS: Record<string, string> = {
  telegram: '#2481cc', discord: '#5865f2', whatsapp: '#25d366',
  instagram: '#e1306c', apple_business: '#555', messenger: '#0084ff',
};
const PLATFORM_NAMES: Record<string, string> = {
  telegram: 'Telegram', discord: 'Discord', whatsapp: 'WhatsApp',
  instagram: 'Instagram', apple_business: 'Apple Business', messenger: 'Messenger',
};

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const color = PLATFORM_COLORS[platform] || '#94a3b8';
  if (platform === 'telegram') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M21.8 1.8L1 9.6l6.4 2.3 2.3 7.3 3.1-3.1 4.4 3.7 4.6-18zm-13.4 10.6l9.1-5.7-6.5 6.5-.4 2.8-2.2-3.6z"/>
    </svg>
  );
  if (platform === 'discord') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.3 4.4A18.4 18.4 0 0 0 16 3c-.2.3-.4.8-.6 1.1a17 17 0 0 0-6.8 0A12 12 0 0 0 8 3 18.5 18.5 0 0 0 3.7 4.4 19.7 19.7 0 0 0 .9 19.4a18.6 18.6 0 0 0 5.7 2.9 14 14 0 0 0 1.2-2 12 12 0 0 1-1.9-.9l.5-.3a13.3 13.3 0 0 0 11.4 0l.5.3c-.6.3-1.2.7-1.9.9a14 14 0 0 0 1.2 2 18.5 18.5 0 0 0 5.7-2.9 19.7 19.7 0 0 0-2.7-15zm-12 12.2c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5c1.3 0 2.3 1.1 2.2 2.5 0 1.4-1 2.5-2.2 2.5zm8 0c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5c1.3 0 2.3 1.1 2.2 2.5 0 1.4-1 2.5-2.2 2.5z"/>
    </svg>
  );
  if (platform === 'whatsapp') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.3.2-.6.1a7.9 7.9 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.6-.2-.5-.7-1.7-.9-2.3-.2-.6-.4-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.9 1.2 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.4 5.3L2 22l4.8-1.3C8.3 21.5 10.1 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.3c-1.8 0-3.5-.5-5-1.4l-.3-.2-3.3.9.9-3.2-.2-.3A8.3 8.3 0 1 1 12 20.3z"/>
    </svg>
  );
  if (platform === 'messenger') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C6.5 2 2 6.2 2 11.4c0 3 1.5 5.6 3.9 7.4v3.6l3.3-1.8c.9.2 1.8.4 2.8.4 5.5 0 10-4.2 10-9.4S17.5 2 12 2zm1.1 12.6l-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 5-2.7-5.5 5.8z"/>
    </svg>
  );
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill={color}/></svg>;
}

function DisputeGauge({ rate }: { rate: number }) {
  const pct = Math.min(rate / 20, 1);
  const angle = pct * 180;
  const rad = ((angle - 180) * Math.PI) / 180;
  const r = 38;
  const ex = 55 + r * Math.cos(rad);
  const ey = 55 + r * Math.sin(rad);
  const large = angle > 90 ? 1 : 0;
  const color = rate < 5 ? '#10b981' : rate < 10 ? '#f59e0b' : '#e11d48';
  return (
    <svg viewBox="0 0 110 70" width="110" height="70">
      <path d="M 17 55 A 38 38 0 0 1 93 55" fill="none" stroke="#f1f5f9" strokeWidth="9" strokeLinecap="round"/>
      {pct > 0 && (
        <path d={`M 17 55 A 38 38 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"/>
      )}
      <text x="55" y="51" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a"
        style={{ fontFamily: "'Inter Tight',sans-serif" }}>{rate}%</text>
      <text x="55" y="63" textAnchor="middle" fontSize="8" fill="#94a3b8">of all txns</text>
    </svg>
  );
}

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

  // Derived metrics
  const totalRevenue = revenueData.data.reduce((s, r) => s + (r.fees || 0), 0);
  const totalVolume = revenueData.data.reduce((s, r) => s + (r.volume || 0), 0);
  const totalUsers = platformData.reduce((s, p) => s + (p.users || 0), 0);
  const conversionRate = funnelData.length >= 2 && funnelData[0]?.count > 0
    ? Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100) : 0;

  const mid = Math.floor(growthData.length / 2);
  const firstHalf = growthData.slice(0, mid).reduce((s, r) => s + (r.count || 0), 0);
  const secondHalf = growthData.slice(mid).reduce((s, r) => s + (r.count || 0), 0);
  const growthUserPct = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

  const totalTxns = platformData.reduce((s, p) => s + (p.transactions || 0), 0);
  const disputeRate = totalTxns > 0
    ? Math.round(platformData.reduce((s, p) => s + (p.dispute_rate || 0) * (p.transactions || 0), 0) / totalTxns * 10) / 10
    : 0;

  const mid2 = Math.floor(revenueData.data.length / 2);
  const revFirst = revenueData.data.slice(0, mid2).reduce((s, r) => s + (r.fees || 0), 0);
  const revSecond = revenueData.data.slice(mid2).reduce((s, r) => s + (r.fees || 0), 0);
  const revChange = revFirst > 0 ? Math.round(((revSecond - revFirst) / revFirst) * 100) : 0;
  const volFirst = revenueData.data.slice(0, mid2).reduce((s, r) => s + (r.volume || 0), 0);
  const volSecond = revenueData.data.slice(mid2).reduce((s, r) => s + (r.volume || 0), 0);
  const volChange = volFirst > 0 ? Math.round(((volSecond - volFirst) / volFirst) * 100) : 0;
  const peakFees = revenueData.data.length > 0 ? Math.max(...revenueData.data.map(r => r.fees || 0)) : 0;
  const avgFees = revenueData.data.length > 0 ? totalRevenue / revenueData.data.length : 0;

  const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(Math.round(n));

  const fmtMoney = (n: number) => `${revenueData.currency} ${fmtNum(n)}`;

  const changeChip = (pct: number) => ({
    style: {
      display: 'inline-flex', padding: '2px 8px', borderRadius: '999px',
      fontSize: '10.5px', fontWeight: '600',
      background: pct >= 0 ? '#f0fdf4' : '#fff1f2',
      color: pct >= 0 ? '#16a34a' : '#e11d48',
    } as React.CSSProperties,
    label: `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`,
  });

  const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 };

  return (
    <AdminShell title="Analytics" subtitle="Platform intelligence">

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Platform Intelligence</p>
          <h1 style={{ ...IT, fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '-.03em', lineHeight: '1.1' }}>Analytics</h1>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '5px' }}>Growth, revenue and engagement — all in one place</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '999px', padding: '3px' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s',
                  ...(period === p.value ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(15,23,42,.1)' } : { background: 'none', color: '#64748b' }) }}>
                {p.label}
              </button>
            ))}
          </div>
          {activeTab === 'Revenue' && (
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '999px', padding: '3px' }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  style={{ minWidth: '40px', padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s',
                    ...(currency === c ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(15,23,42,.1)' } : { background: 'none', color: '#64748b' }) }}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => Promise.allSettled([fetchFunnel(), fetchRevenue(), fetchGrowth(), fetchPlatform()])}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid #e9eaec', background: '#fff', color: '#64748b' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Platform Users', value: fmtNum(totalUsers), sub: 'across all channels', icon: <Users size={18} color="#0f172a"/>, bg: '#f1f5f9' },
          { label: `Revenue (${revenueData.currency})`, value: fmtNum(totalRevenue), sub: 'platform fees earned', icon: <DollarSign size={18} color="#10b981"/>, bg: '#f0fdf4' },
          { label: `Volume (${revenueData.currency})`, value: fmtNum(totalVolume), sub: 'gross escrow volume', icon: <TrendingUp size={18} color="#2563eb"/>, bg: '#eff6ff' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, sub: 'registered → completed', icon: <Activity size={18} color="#9333ea"/>, bg: '#fdf4ff' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{card.label}</p>
              <p style={{ ...IT, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.03em', lineHeight: '1' }}>{card.value}</p>
              <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px' }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', borderRadius: '14px', padding: '4px', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s',
              ...(activeTab === tab ? { background: '#0f172a', color: '#fff' } : { background: 'none', color: '#64748b' }) }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #e9eaec', borderTopColor: '#10b981' }} />
        </div>
      ) : (
        <>
          {/* ══ FUNNEL ══ */}
          {activeTab === 'Funnel' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '18px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '28px 32px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>User journey</p>
                <h2 style={{ ...IT, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.02em', marginBottom: '24px' }}>Conversion Funnel</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {funnelData.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8', padding: '32px 0' }}>No funnel data available</p>
                  ) : funnelData.map((step, i) => {
                    const pct = funnelData[0]?.count > 0 ? Math.round((step.count / funnelData[0].count) * 100) : 100;
                    const width = `${Math.max(44, pct)}%`;
                    const dropoff = i < funnelData.length - 1
                      ? Math.round(((step.count - funnelData[i + 1].count) / Math.max(step.count, 1)) * 100) : null;
                    return (
                      <div key={step.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                        <div style={{ width, height: '62px', borderRadius: '10px', background: FUNNEL_COLORS[i] || '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box', transition: 'width .6s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{step.step}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ ...IT, fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-.02em', lineHeight: '1' }}>{fmtNum(step.count)}</p>
                            <p style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,.6)', marginTop: '1px' }}>{pct}% of total</p>
                          </div>
                        </div>
                        {dropoff !== null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', width: '100%' }}>
                            <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#e11d48', background: '#fff1f2', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                              −{dropoff}% lost
                            </span>
                            <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: insights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '24px', textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Overall Conversion</p>
                  <p style={{ ...IT, fontSize: '52px', fontWeight: '900', color: '#10b981', letterSpacing: '-.05em', lineHeight: '1' }}>{conversionRate}%</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Registered → First Trade</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginTop: '14px' }}>
                    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '999px', flex: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${conversionRate}%`, background: '#10b981', borderRadius: '999px', transition: 'width .6s' }} />
                    </div>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px' }}>
                  <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg. Time to First Trade</p>
                  <p style={{ ...IT, fontSize: '28px', fontWeight: '800', color: '#2563eb', letterSpacing: '-.03em' }}>4.2 days</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>From registration to first completed trade</p>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px' }}>
                  <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>KYC Completion Rate</p>
                  <p style={{ ...IT, fontSize: '28px', fontWeight: '800', color: '#9333ea', letterSpacing: '-.03em' }}>68%</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Of registered users completed KYC</p>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '68%', background: '#9333ea', borderRadius: '999px' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ REVENUE ══ */}
          {activeTab === 'Revenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                {[
                  { label: 'Total Revenue', value: fmtMoney(totalRevenue), ch: changeChip(revChange) },
                  { label: 'Gross Volume', value: fmtMoney(totalVolume), ch: changeChip(volChange) },
                  { label: 'Avg Period Revenue', value: fmtMoney(avgFees), ch: changeChip(revChange) },
                  { label: 'Peak Period', value: fmtMoney(peakFees), ch: changeChip(0) },
                ].map(rc => (
                  <div key={rc.label} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{rc.label}</p>
                      <span style={rc.ch.style}>{rc.ch.label}</span>
                    </div>
                    <p style={{ ...IT, fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.03em' }}>{rc.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '28px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ ...IT, fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.02em' }}>Revenue vs Volume</h2>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>Platform fees (line) vs gross escrow volume (bars) · {revenueData.currency}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#e2e8f0' }} />
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Volume</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '16px', height: '3px', background: '#10b981', borderRadius: '999px' }} />
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Fees</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={revenueData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [fmtNum(v), name === 'fees' ? 'Platform Fees' : 'Volume']}/>
                    <Bar yAxisId="right" dataKey="volume" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="volume"/>
                    <Line yAxisId="left" type="monotone" dataKey="fees" stroke="#10b981" strokeWidth={3} dot={false} name="fees"/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══ GROWTH ══ */}
          {activeTab === 'Growth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>User Growth</p>
                    <p style={{ ...IT, fontSize: '26px', fontWeight: '800', color: '#9333ea', letterSpacing: '-.03em' }}>+{Math.abs(growthUserPct)}%</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>vs previous period</p>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Txn Growth</p>
                    <p style={{ ...IT, fontSize: '26px', fontWeight: '800', color: '#2563eb', letterSpacing: '-.03em' }}>+{Math.abs(growthUserPct)}%</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>vs previous period</p>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2">
                      <path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Dispute Rate</p>
                    <p style={{ ...IT, fontSize: '26px', fontWeight: '800', color: '#e11d48', letterSpacing: '-.03em' }}>{disputeRate}%</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>of all transactions</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '24px 26px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#9333ea', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>User signups</p>
                  <h3 style={{ ...IT, fontSize: '15px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.01em', marginBottom: '16px' }}>New Users Over Time</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }}/>
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={28}/>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'New Users']}/>
                      <Area type="monotone" dataKey="count" fill="url(#userGrad)" stroke="#9333ea" strokeWidth={2.5} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '24px 26px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Transaction volume</p>
                  <h3 style={{ ...IT, fontSize: '15px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.01em', marginBottom: '16px' }}>Transactions Over Time</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="txnGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }}/>
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={28}/>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Transactions']}/>
                      <Area type="monotone" dataKey="txns" fill="url(#txnGrad)" stroke="#2563eb" strokeWidth={2.5} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                <DisputeGauge rate={disputeRate}/>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>Platform health</p>
                  <h3 style={{ ...IT, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.02em', marginBottom: '6px' }}>{disputeRate}% Dispute Rate</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', maxWidth: '420px' }}>
                    A dispute rate below 5% is considered healthy. Safeeely is currently tracking at{' '}
                    <strong style={{ color: disputeRate < 5 ? '#10b981' : '#e11d48' }}>{disputeRate}%</strong>
                    {' '}— {disputeRate < 5 ? 'within healthy range' : 'above target'}. Monitor for spikes after high-volume periods.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══ PLATFORM ══ */}
          {activeTab === 'Platform' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                {platformData.map(p => {
                  const pct = totalUsers > 0 ? Math.round((p.users / totalUsers) * 100) : 0;
                  return (
                    <div key={p.platform} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', padding: '22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${PLATFORM_COLORS[p.platform] || '#94a3b8'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PlatformIcon platform={p.platform} size={16}/>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{PLATFORM_NAMES[p.platform] || p.platform}</span>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: '#f0fdf4', color: '#16a34a' }}>{pct}%</span>
                      </div>
                      <p style={{ ...IT, fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.03em', marginBottom: '3px' }}>{fmtNum(p.users)}</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>total users</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '9px', padding: '8px 10px' }}>
                          <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', marginBottom: '2px' }}>Transactions</p>
                          <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{fmtNum(p.transactions)}</p>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: '9px', padding: '8px 10px' }}>
                          <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', marginBottom: '2px' }}>Dispute %</p>
                          <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{p.dispute_rate}%</p>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>Share of users</span>
                        <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '5px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: PLATFORM_COLORS[p.platform] || '#94a3b8', borderRadius: '999px' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dark distribution card */}
              <div style={{ background: '#0f172a', borderRadius: '16px', padding: '28px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ ...IT, fontSize: '17px', fontWeight: '800', color: '#fff', letterSpacing: '-.02em' }}>User Distribution by Channel</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', marginTop: '3px' }}>Where your users are coming from</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {platformData.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', textAlign: 'center', padding: '16px 0' }}>No platform data available</p>
                  ) : platformData.map(p => {
                    const pct = totalUsers > 0 ? Math.round((p.users / totalUsers) * 100) : 0;
                    return (
                      <div key={p.platform}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PLATFORM_COLORS[p.platform] || '#94a3b8', flexShrink: 0 }} />
                            <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'rgba(255,255,255,.7)' }}>{PLATFORM_NAMES[p.platform] || p.platform}</span>
                          </div>
                          <span style={{ ...IT, fontSize: '14px', fontWeight: '700', color: '#fff' }}>{pct}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,.07)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: PLATFORM_COLORS[p.platform] || '#94a3b8', borderRadius: '999px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
