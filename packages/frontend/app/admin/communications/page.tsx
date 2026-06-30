"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Bell, RefreshCw, MailOpen, Mail } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const TABS = ['Notification Log', 'Delivery Stats'] as const;
type Tab = typeof TABS[number];

const TYPE_CHIP: Record<string, { color: string; bg: string }> = {
  PAYMENT:     { color: '#059669', bg: '#f0fdf4' },
  DISPUTE:     { color: '#e11d48', bg: '#fff1f2' },
  TRANSACTION: { color: '#2563eb', bg: '#eff6ff' },
  SYSTEM:      { color: '#475569', bg: '#f1f5f9' },
  REFERRAL:    { color: '#9333ea', bg: '#fdf4ff' },
  REVIEW:      { color: '#d97706', bg: '#fffbeb' },
};

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Notification Log');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
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
    <AdminShell title="Communications" subtitle="Notification delivery log and engagement metrics">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Sent (${days}d)`, value: totalSent, icon: Mail, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Read', value: totalRead, icon: MailOpen, color: '#059669', bg: '#f0fdf4' },
          { label: 'Read Rate', value: `${readRate}%`, icon: Bell, color: '#d97706', bg: '#fffbeb' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="font-tight text-2xl font-bold text-[#0f172a]">{card.value}</p>
                <p className="adm-section-label mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs + controls */}
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
        {activeTab === 'Delivery Stats' && (
          <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
            {[7, 14, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={days === d ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
                {d}d
              </button>
            ))}
          </div>
        )}
        <button onClick={() => { fetchNotifications(); fetchStats(); }}
          className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]"
          style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" /></div>
      ) : (
        <>
          {activeTab === 'Notification Log' && (
            <div className="space-y-4">
              <div className="flex gap-1 flex-wrap bg-white rounded-xl border border-[#e9eaec] p-1 w-fit">
                {['', 'PAYMENT', 'DISPUTE', 'TRANSACTION', 'SYSTEM', 'REFERRAL'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={typeFilter === t ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
                    {t || 'All'}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                      {['User', 'Type', 'Title', 'Content', 'Read', 'Date'].map(h => <th key={h} className="px-5 py-3 adm-section-label">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {notifications.length === 0 ? (
                        <tr><td colSpan={6} className="py-16 text-center">
                          <Bell className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
                          <p className="text-[12px] font-bold text-[#94a3b8]">No notifications found</p>
                        </td></tr>
                      ) : notifications.map((n: any) => {
                        const chip = TYPE_CHIP[n.type] || { color: '#475569', bg: '#f1f5f9' };
                        return (
                          <tr key={n.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                            <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{n.profile?.safetag}</td>
                            <td className="px-5 py-3.5">
                              <span className="adm-chip text-[9px] font-bold" style={{ color: chip.color, background: chip.bg }}>{n.type}</span>
                            </td>
                            <td className="px-5 py-3.5 text-[11px] font-bold text-[#64748b] max-w-[140px] truncate">{n.title}</td>
                            <td className="px-5 py-3.5 text-[11px] text-[#94a3b8] max-w-[200px] truncate">{n.content}</td>
                            <td className="px-5 py-3.5">{n.is_read ? <MailOpen className="w-4 h-4 text-[#059669]" /> : <Mail className="w-4 h-4 text-[#cbd5e1]" />}</td>
                            <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{new Date(n.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Delivery Stats' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-4">Daily Notifications — Sent vs Read</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 700 }} />
                    <Bar dataKey="sent" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Sent" />
                    <Bar dataKey="read" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Read" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-4">Volume by Type</p>
                <div className="space-y-3">
                  {typeEntries.map(([type, count]) => {
                    const pct = totalSent > 0 ? Math.round(((count as number) / totalSent) * 100) : 0;
                    const chip = TYPE_CHIP[type] || { color: '#475569', bg: '#f1f5f9' };
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="adm-chip text-[9px] font-bold w-24 text-center" style={{ color: chip.color, background: chip.bg }}>{type}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3b82f6' }} />
                        </div>
                        <span className="text-[11px] font-bold text-[#0f172a] w-8 text-right">{count as number}</span>
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
