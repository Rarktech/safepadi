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

  return (
    <AdminShell title="Active Disputes" subtitle="Resolution center">
      {/* Unassigned alert */}
      {unassignedCount > 0 && filter !== 'UNASSIGNED' && (
        <div
          onClick={() => setFilter('UNASSIGNED')}
          className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#d97706' }} />
          <p className="text-[13px] font-bold" style={{ color: '#92400e' }}>
            {unassignedCount} escalated dispute{unassignedCount !== 1 ? 's' : ''} need{unassignedCount === 1 ? 's' : ''} a specialist assigned
          </p>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-black uppercase" style={{ color: '#d97706', letterSpacing: '0.08em' }}>
            View Now <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Cases', value: openCount, chip: 'chip-red', dotColor: '#e11d48' },
          { label: 'Unassigned', value: unassignedCount, chip: 'chip-amber', dotColor: '#d97706' },
          { label: 'Resolved', value: resolvedCount, chip: 'chip-green', dotColor: '#10b981' },
          { label: 'Locked Value', value: `$${lockedValue.toLocaleString()}`, chip: 'chip-blue', dotColor: '#2563eb' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <p className="adm-section-label mb-2">{s.label}</p>
            <p className="font-tight text-2xl font-bold text-[#0f172a]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1 overflow-x-auto">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="relative px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap"
              style={filter === key
                ? { background: (key === 'ESCALATED' || key === 'UNASSIGNED') ? '#e11d48' : '#0f172a', color: '#fff' }
                : { color: '#64748b' }
              }
            >
              {label}
              {key === 'UNASSIGNED' && unassignedCount > 0 && filter !== 'UNASSIGNED' && (
                <span className="absolute -top-1 -right-1 bg-[#d97706] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {unassignedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases, buyers, sellers…"
            className="pl-9 pr-4 h-9 rounded-xl text-[12px] font-medium outline-none"
            style={{ width: 240, background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* Dispute list */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#e11d48] rounded-full animate-spin mb-3" />
            <p className="adm-section-label">Loading disputes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle className="w-10 h-10 mb-3 opacity-20" style={{ color: '#10b981' }} />
            <p className="font-tight text-[15px] font-bold text-[#0f172a] mb-1">
              {filter === 'UNASSIGNED' ? 'All Clear' : 'Clean Slate'}
            </p>
            <p className="text-[12px] text-[#94a3b8]">
              {filter === 'UNASSIGNED'
                ? 'All escalated disputes have been assigned.'
                : 'No disputes require attention right now.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {filtered.map(dispute => {
              const tierChip = TIER_CHIP[dispute.pipeline_tier] ?? 'chip-slate';
              const typeLabel = DISPUTE_TYPE_LABELS[dispute.dispute_type] || dispute.dispute_type?.replace(/_/g, ' ') || 'General';
              const isUnassigned = dispute.is_ai_paused && !dispute.assigned_admin_id;
              const specialistName = dispute.metadata?.assigned_specialist?.name || dispute.assigned_specialist?.name;

              return (
                <div
                  key={dispute.id}
                  onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                  className="flex items-center gap-5 p-5 hover:bg-[#fafafa] cursor-pointer transition-colors"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
                    style={{
                      background: isUnassigned ? '#fffbeb' : dispute.status === 'OPEN' ? '#fff1f2' : '#f1f5f9',
                      color: isUnassigned ? '#d97706' : dispute.status === 'OPEN' ? '#e11d48' : '#94a3b8',
                    }}>
                    <ShieldAlert className="w-4.5 h-4.5" />
                    {(dispute.status === 'OPEN' || isUnassigned) && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ background: isUnassigned ? '#d97706' : '#e11d48' }} />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="adm-section-label">#{dispute.id?.slice(0, 8)}</span>
                      {dispute.pipeline_tier && (
                        <span className={`adm-chip ${tierChip}`}>{dispute.pipeline_tier}</span>
                      )}
                      {isUnassigned ? (
                        <span className="adm-chip chip-amber">Unassigned</span>
                      ) : dispute.is_ai_paused ? (
                        <span className="adm-chip chip-red">Escalated</span>
                      ) : (
                        <span className={`adm-chip ${dispute.status === 'OPEN' ? 'chip-amber' : 'chip-green'}`}>{dispute.status}</span>
                      )}
                      {dispute.age_hours !== undefined && (
                        <span className="text-[11px] text-[#94a3b8]">{dispute.age_hours}h old</span>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold text-[#0f172a] truncate">
                      {dispute.transaction?.product_name || 'Goods/Services Dispute'}
                    </p>
                    <p className="text-[11px] text-[#64748b] mb-1">{typeLabel}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#94a3b8]" />
                        <span className="text-[11px] text-[#64748b]">Buyer: <span className="font-semibold text-[#0f172a]">@{dispute.transaction?.buyer?.safetag}</span></span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#cbd5e1]" />
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#94a3b8]" />
                        <span className="text-[11px] text-[#64748b]">Seller: <span className="font-semibold text-[#0f172a]">@{dispute.transaction?.seller?.safetag}</span></span>
                      </div>
                      {specialistName && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-[#2563eb]" />
                          <span className="text-[11px] font-semibold text-[#2563eb]">{specialistName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="font-tight text-[15px] font-bold text-[#0f172a]">
                      {dispute.transaction?.total_amount || dispute.transaction?.amount} {dispute.transaction?.currency}
                    </p>
                    <p className="adm-section-label">Escrow</p>
                  </div>

                  <ChevronRight className="shrink-0 w-4 h-4 text-[#cbd5e1]" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
