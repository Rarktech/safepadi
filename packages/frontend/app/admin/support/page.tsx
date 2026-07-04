'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LifeBuoy, Search, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const FILTER_TABS = [
  { key: 'ALL', label: 'Everything' },
  { key: 'OPEN', label: 'Open' },
  { key: 'UNASSIGNED', label: 'Unassigned' },
  { key: 'MY_CASES', label: 'My Cases' },
  { key: 'RESOLVED', label: 'Resolved' },
];

const STATUS_CHIP: Record<string, string> = {
  OPEN: 'chip-amber', RESOLVED: 'chip-green', HANDLED_EXTERNALLY: 'chip-blue',
};

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [search, setSearch] = useState('');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/admin/support`;
      if (filter === 'UNASSIGNED') url = `${API_URL}/admin/support/unassigned`;
      else if (filter === 'MY_CASES') url = `${API_URL}/admin/support/my-cases`;
      else if (filter !== 'ALL') url = `${API_URL}/admin/support?status=${filter}`;
      const res = await axios.get(url, { withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' } });
      const data = res.data.tickets || res.data;
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchUnassignedCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/support/unassigned`, {
        withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setUnassignedCount(res.data.count || 0);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchUnassignedCount(); }, [fetchUnassignedCount]);

  const filtered = search
    ? tickets.filter(t =>
        t.id?.toLowerCase().includes(search.toLowerCase()) ||
        t.safetag?.toLowerCase().includes(search.toLowerCase()) ||
        t.profile?.safetag?.toLowerCase().includes(search.toLowerCase()) ||
        t.trigger_phrase?.toLowerCase().includes(search.toLowerCase())
      )
    : tickets;

  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'HANDLED_EXTERNALLY').length;

  const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

  return (
    <AdminShell title="Support" subtitle="Human support inbox">

      {/* ── Page header ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Support Inbox</p>
        <h1 style={{ ...IT, fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-.03em' }}>Support Tickets</h1>
        <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '5px' }}>Users requesting a human agent across all bots</p>
      </div>

      {/* ── Unassigned alert ── */}
      {unassignedCount > 0 && filter !== 'UNASSIGNED' && (
        <div onClick={() => setFilter('UNASSIGNED')} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#d97706' }} />
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
            {unassignedCount} ticket{unassignedCount !== 1 ? 's' : ''} need agent assignment
          </p>
          <span className="ml-auto flex items-center gap-1" style={{ fontSize: '11px', fontWeight: '700', color: '#d97706' }}>
            View Now <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* ── 3 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Open Tickets', value: openCount, iconBg: '#fff1f2', iconColor: '#e11d48', statColor: '#e11d48' },
          { label: 'Unassigned', value: unassignedCount, iconBg: '#fffbeb', iconColor: '#d97706', statColor: '#d97706' },
          { label: 'Resolved', value: resolvedCount, iconBg: '#f0fdf4', iconColor: '#10b981', statColor: '#0f172a' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#e9eaec] flex items-center gap-3" style={{ padding: '16px 20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LifeBuoy className="w-[15px] h-[15px]" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', marginBottom: '3px' }}>{s.label}</p>
              <p style={{ ...IT, fontSize: '22px', fontWeight: '800', color: s.statColor, letterSpacing: '-.03em' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter chips + Search ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div style={{ position: 'relative', maxWidth: '280px' }}>
          <Search style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets, safetags…"
            style={{ width: '100%', height: '40px', paddingLeft: '38px', paddingRight: '14px', background: '#f7f8f9', border: '1.5px solid #edeff3', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: '#0f172a', outline: 'none' }}
            className="focus:border-[#10b981] focus:bg-white"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1.5px solid', whiteSpace: 'nowrap', transition: 'all .14s', position: 'relative',
                ...(filter === key ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a' } : { background: '#fff', color: '#64748b', borderColor: '#e9eaec' }) }}>
              {label}
              {key === 'UNASSIGNED' && unassignedCount > 0 && filter !== 'UNASSIGNED' && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#d97706', color: '#fff', fontSize: '8px', fontWeight: '800', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unassignedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Ticket list table ── */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1.5fr 110px 140px 100px', gap: '10px', padding: '11px 24px', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
          {["Ticket ID", "User", "Trigger Phrase", "Status", "Assigned Admin", "Date"].map(h => (
            <p key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</p>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-[2.5px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading tickets…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="w-10 h-10 mb-3 opacity-20" style={{ color: '#10b981' }} />
            <p style={{ ...IT, fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              {filter === 'UNASSIGNED' ? 'All Clear' : 'Clean Slate'}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>No support tickets match this filter.</p>
          </div>
        ) : (
          <div style={{ padding: '0 24px' }}>
            {filtered.map(ticket => {
              const statusChip = STATUS_CHIP[ticket.status] || 'chip-slate';
              const statusLabel = ticket.status === 'HANDLED_EXTERNALLY' ? 'Resolved (Live Chat)' : ticket.status;
              const adminName = ticket.metadata?.assigned_admin?.name || ticket.assigned_admin?.name;
              const date = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
              const userTag = ticket.profile?.safetag || ticket.safetag || '—';
              const ticketCode = `SUP-${ticket.id?.slice(0, 4).toUpperCase()}`;

              return (
                <div key={ticket.id} onClick={() => router.push(`/admin/support/${ticket.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1.5fr 110px 140px 100px', gap: '10px', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  className="hover:bg-[#fafafa] transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ticket.status === 'OPEN' ? '#e11d48' : '#10b981', flexShrink: 0 }} />
                    <code style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>{ticketCode}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#059669', flexShrink: 0 }}>
                      {userTag.replace('@', '').slice(0, 2).toUpperCase()}
                    </div>
                    <p style={{ fontSize: '12.5px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userTag}</p>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.trigger_phrase || '—'}</p>
                  <div><span className={`adm-chip ${statusChip}`}>{statusLabel}</span></div>
                  <p style={{ fontSize: '11.5px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminName || '—'}</p>
                  <p style={{ fontSize: '11.5px', color: '#64748b' }}>{date}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
