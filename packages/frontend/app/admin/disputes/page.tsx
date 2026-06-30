'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ShieldAlert, Search, ChevronRight, Clock, CheckCircle, AlertTriangle, User, ArrowRight, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  INSTAGRAM_ACCOUNT: 'Instagram Account', DISCORD_ACCOUNT: 'Discord Account',
  TELEGRAM_ACCOUNT: 'Telegram Account', GMAIL_ACCOUNT: 'Gmail Account',
  TWITTER_ACCOUNT: 'Twitter/X Account', TIKTOK_ACCOUNT: 'TikTok Account',
  YOUTUBE_CHANNEL: 'YouTube Channel', FACEBOOK_ACCOUNT: 'Facebook Account',
  GAMING_ACCOUNT: 'Gaming Account', FREELANCE_CODE: 'Freelance — Code',
  FREELANCE_DESIGN: 'Freelance — Design', FREELANCE_WRITING: 'Freelance — Writing',
  FREELANCE_VIDEO: 'Freelance — Video', FREELANCE_MUSIC: 'Freelance — Music',
  FREELANCE_CONSULTING: 'Freelance — Consulting', DIGITAL_DOWNLOAD: 'Digital Download',
  DOMAIN_WEBSITE: 'Domain / Website', ELECTRONICS_GADGET: 'Electronics & Gadgets',
  VEHICLE_SALE: 'Vehicle Sale', LUXURY_GOODS: 'Luxury Goods',
  FASHION_GOODS: 'Fashion & Clothing', PHYSICAL_GOODS: 'Physical Goods',
  SOCIAL_SERVICE: 'Social Media Service', INFLUENCER_DEAL: 'Influencer Deal',
  EVENT_BOOKING: 'Event Booking', TICKET_RESERVATION: 'Ticket / Reservation',
  DISPATCH_DELIVERY: 'Dispatch & Delivery', EDUCATION_SERVICE: 'Education Service',
  REAL_ESTATE: 'Real Estate', CONSTRUCTION_SERVICE: 'Construction',
  CRYPTO_TO_GOODS: 'Crypto Transaction', GENERIC: 'General Dispute',
};

const TIER_CHIP: Record<string, string> = {
  LITE: 'chip-green', STANDARD: 'chip-blue', CONSTITUTIONAL: 'chip-red',
};

const FILTER_TABS = [
  { key: 'ALL', label: 'Everything' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'UNASSIGNED', label: 'Unassigned' },
  { key: 'MY_CASES', label: 'My Cases' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export default function AdminDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [search, setSearch] = useState('');

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/admin/disputes`;
      if (filter === 'UNASSIGNED') url = `${API_URL}/admin/disputes/unassigned`;
      else if (filter === 'MY_CASES') url = `${API_URL}/admin/disputes/my-cases`;
      else if (filter !== 'ALL') url = `${API_URL}/admin/disputes?status=${filter}`;
      const res = await axios.get(url, { withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' } });
      const data = res.data.disputes || res.data;
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchUnassignedCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/disputes/unassigned`, {
        withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setUnassignedCount(res.data.count || 0);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
  useEffect(() => { fetchUnassignedCount(); }, [fetchUnassignedCount]);

  const filtered = search
    ? disputes.filter(d =>
        d.id?.toLowerCase().includes(search.toLowerCase()) ||
        d.transaction?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.transaction?.buyer?.safetag?.toLowerCase().includes(search.toLowerCase()) ||
        d.transaction?.seller?.safetag?.toLowerCase().includes(search.toLowerCase())
      )
    : disputes;

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;
  const lockedValue = disputes.filter(d => d.status === 'OPEN')
    .reduce((sum, d) => sum + Number(d.transaction?.total_amount || d.transaction?.amount || 0), 0);

  const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

  return (
    <AdminShell title="Disputes" subtitle="Case management">

      {/* ── Page header ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Case Management</p>
        <h1 style={{ ...IT, fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-.03em' }}>Disputes</h1>
        <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '5px' }}>Manage and resolve platform disputes</p>
      </div>

      {/* ── Unassigned alert ── */}
      {unassignedCount > 0 && filter !== 'UNASSIGNED' && (
        <div onClick={() => setFilter('UNASSIGNED')} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#d97706' }} />
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
            {unassignedCount} escalated dispute{unassignedCount !== 1 ? 's' : ''} need specialist assignment
          </p>
          <span className="ml-auto flex items-center gap-1" style={{ fontSize: '11px', fontWeight: '700', color: '#d97706' }}>
            View Now <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open Cases', value: openCount, iconBg: '#fff1f2', iconColor: '#e11d48', statColor: '#e11d48', chipBg: '#fff1f2', chipColor: '#e11d48', chipLabel: 'Active' },
          { label: 'Unassigned', value: unassignedCount, iconBg: '#fffbeb', iconColor: '#d97706', statColor: '#d97706', chipBg: '#fffbeb', chipColor: '#d97706', chipLabel: 'Escalated' },
          { label: 'Resolved', value: resolvedCount, iconBg: '#f0fdf4', iconColor: '#10b981', statColor: '#0f172a', chipBg: '#f0fdf4', chipColor: '#16a34a', chipLabel: 'Closed' },
          { label: 'Locked Value', value: `$${lockedValue.toLocaleString()}`, iconBg: '#eff6ff', iconColor: '#2563eb', statColor: '#0f172a', chipBg: '#eff6ff', chipColor: '#2563eb', chipLabel: 'In escrow' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#e9eaec] flex items-center gap-3" style={{ padding: '16px 20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert className="w-[15px] h-[15px]" strokeWidth={2.2} />
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
            placeholder="Search cases, safetags…"
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

      {/* ── Dispute list table ── */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 140px 110px 100px 110px', gap: '10px', padding: '11px 24px', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
          {["Case ID", "Buyer", "Seller", "Amount", "Status", "Specialist", "Date"].map(h => (
            <p key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</p>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-[2.5px] border-[#e9eaec] border-t-[#e11d48] rounded-full animate-spin" />
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading disputes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="w-10 h-10 mb-3 opacity-20" style={{ color: '#10b981' }} />
            <p style={{ ...IT, fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              {filter === 'UNASSIGNED' ? 'All Clear' : 'Clean Slate'}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>No disputes match this filter.</p>
          </div>
        ) : (
          <div style={{ padding: '0 24px' }}>
            {filtered.map(dispute => {
              const tierChip = TIER_CHIP[dispute.pipeline_tier] ?? 'chip-slate';
              const isUnassigned = dispute.is_ai_paused && !dispute.assigned_admin_id;
              const specialistName = dispute.metadata?.assigned_specialist?.name || dispute.assigned_specialist?.name;
              const statusChip = isUnassigned ? 'chip-amber' : dispute.is_ai_paused ? 'chip-red' : dispute.status === 'OPEN' ? 'chip-amber' : 'chip-green';
              const statusLabel = isUnassigned ? 'Unassigned' : dispute.is_ai_paused ? 'Escalated' : dispute.status;
              const date = dispute.created_at ? new Date(dispute.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
              const amount = dispute.transaction?.total_amount || dispute.transaction?.amount || '—';
              const currency = dispute.transaction?.currency || '';

              return (
                <div key={dispute.id} onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 140px 110px 100px 110px', gap: '10px', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  className="hover:bg-[#fafafa] transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dispute.status === 'OPEN' ? '#e11d48' : '#10b981', flexShrink: 0 }} />
                    <code style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>#{dispute.id?.slice(0, 7)}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#059669', flexShrink: 0 }}>
                      {(dispute.transaction?.buyer?.safetag || '?').replace('@', '').slice(0, 2).toUpperCase()}
                    </div>
                    <p style={{ fontSize: '12.5px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dispute.transaction?.buyer?.safetag || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#2563eb', flexShrink: 0 }}>
                      {(dispute.transaction?.seller?.safetag || '?').replace('@', '').slice(0, 2).toUpperCase()}
                    </div>
                    <p style={{ fontSize: '12.5px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dispute.transaction?.seller?.safetag || '—'}</p>
                  </div>
                  <div>
                    <p style={{ ...IT, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{amount} {currency}</p>
                  </div>
                  <div><span className={`adm-chip ${statusChip}`}>{statusLabel}</span></div>
                  <p style={{ fontSize: '11.5px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{specialistName || '—'}</p>
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
