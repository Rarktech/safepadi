'use client';

import { useState, useEffect } from 'react';
import { Scale, Clock, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';

interface DisputeItem {
  id: string;
  status: string;
  verdict_action: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  is_ai_paused: boolean;
  latest_ai_snippet?: string | null;
  transaction: {
    id: string;
    product_name: string;
    amount: number;
    currency: string;
    txn_code: string;
    buyer_id: string;
    seller_id: string;
    buyer: { safetag: string; first_name: string; last_name: string };
    seller: { safetag: string; first_name: string; last_name: string };
  };
  adjudication: {
    final_action: string;
    resolution_source: string;
    split_pct_buyer: number | null;
  } | null;
}

type FilterType = 'all' | 'open' | 'escalated' | 'resolved';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'open',      label: 'Open' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved',  label: 'Resolved' },
];

function statusOf(d: DisputeItem): 'open' | 'escalated' | 'resolved' | 'verdict' {
  if (d.is_ai_paused) return 'escalated';
  if (d.status === 'RESOLVED') return 'resolved';
  if (d.verdict_action && d.status === 'OPEN') return 'verdict';
  return 'open';
}

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: '#fffbeb', color: '#d97706', label: 'Open' },
  escalated: { bg: '#fff1f2', color: '#e11d48', label: 'Escalated' },
  resolved:  { bg: '#f1f5f9', color: '#475569', label: 'Resolved' },
  verdict:   { bg: '#eff6ff', color: '#2563eb', label: 'Verdict ready' },
};

function StatusPill({ dispute }: { dispute: DisputeItem }) {
  const st = statusOf(dispute);
  const meta = STATUS_META[st];
  return (
    <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>
      {st === 'open' && (
        <span className="relative flex h-[7px] w-[7px]">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d97706] opacity-75" />
          <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#d97706]" />
        </span>
      )}
      {st === 'escalated' && <AlertCircle size={11} />}
      {meta.label}
    </span>
  );
}

export function DisputesListView({
  safetag,
  onSelectDispute,
}: {
  safetag: string;
  onSelectDispute: (dispute: DisputeItem) => void;
}) {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    api.get(`/disputes/my-disputes?safetag=${encodeURIComponent(safetag)}`)
      .then(res => setDisputes(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [safetag]);

  const filtered = disputes.filter(d => {
    const st = statusOf(d);
    if (filter === 'open')      return st === 'open' || st === 'verdict';
    if (filter === 'escalated') return st === 'escalated';
    if (filter === 'resolved')  return st === 'resolved';
    return true;
  });

  const openCount = disputes.filter(d => { const st = statusOf(d); return st === 'open' || st === 'verdict'; }).length;
  const escalatedCount = disputes.filter(d => statusOf(d) === 'escalated').length;
  const resolvedCount = disputes.filter(d => statusOf(d) === 'resolved').length;
  const counts: Record<FilterType, number> = { all: disputes.length, open: openCount, escalated: escalatedCount, resolved: resolvedCount };

  const StatCard = ({ icon, iconBg, label, value, dark }: { icon: React.ReactNode; iconBg: string; label: string; value: React.ReactNode; dark?: boolean }) => (
    <div className={`rounded-2xl p-[16px_18px] flex items-center gap-[11px] ${dark ? 'bg-[#0f172a]' : 'bg-white border border-[#e9eaec]'}`}>
      <div className={`w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className={`text-[10.5px] font-medium mb-[3px] ${dark ? 'text-white/40' : 'text-[#94a3b8]'}`}>{label}</p>
        {typeof value === 'string' ? (
          <p className={`font-['Inter_Tight',sans-serif] text-[13px] font-bold leading-[1.2] ${dark ? 'text-[#10b981]' : 'text-[#0f172a]'}`}>{value}</p>
        ) : (
          <p className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#0f172a] tracking-[-.02em] leading-none">{value}</p>
        )}
      </div>
    </div>
  );

  const statCards = (
    <>
      <StatCard icon={<Clock size={14} style={{ color: '#d97706' }} />} iconBg="bg-[#fffbeb]" label="Open" value={openCount} />
      <StatCard icon={<AlertCircle size={14} style={{ color: '#e11d48' }} />} iconBg="bg-[#fff1f2]" label="Escalated" value={escalatedCount} />
      <StatCard icon={<Scale size={14} style={{ color: '#16a34a' }} />} iconBg="bg-[#f0fdf4]" label="Resolved" value={resolvedCount} />
      <StatCard icon={<Scale size={14} style={{ color: '#10b981' }} />} iconBg="bg-[#10b981]/[.15]" label="SafeAI" value={<>AI Mediator<br />Active</>} dark />
    </>
  );

  const FilterPills = ({ mobile }: { mobile?: boolean }) => (
    <>
      {FILTER_TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => setFilter(tab.key)}
          className={`flex items-center gap-[5px] px-[14px] py-[7px] rounded-full text-[12px] font-semibold whitespace-nowrap border transition-all ${mobile ? 'shrink-0' : ''} ${
            filter === tab.key ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-[#64748b] border-[#e9eaec]'
          }`}
        >
          {tab.label} <span className="opacity-60 font-medium">{counts[tab.key]}</span>
        </button>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="text-[#10b981] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#f1f5f9' }}>
      {/* Desktop */}
      <div className="hidden md:flex flex-col p-6 gap-[18px]">
        <div className="grid grid-cols-4 gap-3">{statCards}</div>

        <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
          <div className="p-[14px_20px] border-b border-[#f3f4f6] flex items-center gap-2">
            <FilterPills />
          </div>

          <div className="grid grid-cols-[1.4fr_1fr_1.2fr_100px_100px_40px] gap-3 px-6 py-[10px] bg-[#fafafa] border-b border-[#f3f4f6]">
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Case / Product</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Parties</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Amount</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Status</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Opened</p>
            <p />
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 px-6 text-center flex flex-col items-center gap-2.5">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[#f8f9fa] flex items-center justify-center">
                <Scale size={22} className="text-[#94a3b8]" />
              </div>
              <p className="text-[15px] font-bold text-[#0f172a]">{filter === 'all' ? 'No disputes' : `No ${filter} disputes`}</p>
              <p className="text-[12.5px] text-[#94a3b8]">SafeAI automatically mediates all cases.</p>
            </div>
          ) : (
            filtered.map(dispute => {
              const txn = dispute.transaction;
              const dspCode = `DSP-${dispute.id.slice(0, 4).toUpperCase()}`;
              const timeAgo = formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true });
              const snippet = dispute.latest_ai_snippet?.replace(/\*\*/g, '').replace(/\[ADMIN_[^\]]*\]/g, '').trim();
              return (
                <div
                  key={dispute.id}
                  onClick={() => onSelectDispute(dispute)}
                  className="grid grid-cols-[1.4fr_1fr_1.2fr_100px_100px_40px] gap-3 px-6 py-[14px] border-b border-[#f3f4f6] last:border-b-0 cursor-pointer hover:bg-[#fafbfc] transition-colors items-center"
                >
                  <div className="min-w-0">
                    <code className="text-[10.5px] font-bold text-[#475569] bg-[#f1f5f9] px-[7px] py-[2px] rounded-[5px]">{dspCode}</code>
                    <p className="text-[13px] font-bold text-[#0f172a] truncate mt-[3px]">{txn?.product_name || 'Dispute'}</p>
                    {snippet && <p className="text-[11px] text-[#64748b] mt-[3px] truncate max-w-[260px]">{snippet}</p>}
                  </div>
                  <div>
                    <div className="flex items-center gap-[5px] mb-0.5">
                      <div className="w-5 h-5 rounded-full bg-[#dcfce7] flex items-center justify-center text-[9px] font-extrabold text-[#16a34a] shrink-0">
                        {(txn?.buyer?.first_name || 'B').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-semibold text-[#10b981]">@{txn?.buyer?.safetag}</span>
                    </div>
                    <div className="flex items-center gap-[5px]">
                      <div className="w-5 h-5 rounded-full bg-[#fed7aa] flex items-center justify-center text-[9px] font-extrabold text-[#ea580c] shrink-0">
                        {(txn?.seller?.first_name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-semibold text-[#f97316]">@{txn?.seller?.safetag}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#0f172a]">
                      {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10.5px] text-[#94a3b8] font-medium">{txn?.currency} in escrow</p>
                  </div>
                  <div><StatusPill dispute={dispute} /></div>
                  <p className="text-[11.5px] text-[#94a3b8] font-medium">{timeAgo}</p>
                  <div className="flex items-center justify-center">
                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col p-4 pb-28 gap-[14px]">
        <div className="grid grid-cols-2 gap-[10px]">{statCards}</div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <FilterPills mobile />
        </div>

        <div className="flex flex-col gap-[10px]">
          {filtered.length === 0 ? (
            <div className="py-12 px-5 bg-white rounded-[18px] border border-[#e9eaec] text-center">
              <p className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] mb-1.5">{filter === 'all' ? 'No disputes' : `No ${filter} disputes`}</p>
              <p className="text-[12.5px] text-[#94a3b8]">SafeAI automatically mediates all your cases.</p>
            </div>
          ) : (
            filtered.map(dispute => {
              const txn = dispute.transaction;
              const dspCode = `DSP-${dispute.id.slice(0, 4).toUpperCase()}`;
              const timeAgo = formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true });
              const snippet = dispute.latest_ai_snippet?.replace(/\*\*/g, '').replace(/\[ADMIN_[^\]]*\]/g, '').trim();
              return (
                <div
                  key={dispute.id}
                  onClick={() => onSelectDispute(dispute)}
                  className="bg-white border border-[#e9eaec] rounded-[18px] p-[16px_18px] cursor-pointer flex items-start gap-[14px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[7px] mb-[7px] flex-wrap">
                      <code className="text-[10.5px] font-bold text-[#475569] bg-[#f1f5f9] px-[7px] py-[2px] rounded-[5px]">{dspCode}</code>
                      <StatusPill dispute={dispute} />
                    </div>
                    <p className="font-['Inter_Tight',sans-serif] text-[14.5px] font-extrabold text-[#0f172a] mb-1 truncate">{txn?.product_name}</p>
                    <p className="text-[12px] font-medium text-[#94a3b8] mb-[7px]">
                      <span className="text-[#10b981] font-bold">@{txn?.buyer?.safetag}</span>
                      <span className="mx-[5px] text-[#cbd5e1]">vs</span>
                      <span className="text-[#f97316] font-bold">@{txn?.seller?.safetag}</span>
                    </p>
                    <div className="flex items-center gap-[10px]">
                      <p className="font-['Inter_Tight',sans-serif] text-[13.5px] font-bold text-[#0f172a]">
                        {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[11px] text-[#94a3b8]">{txn?.currency} · {timeAgo}</span>
                    </div>
                    {snippet && (
                      <div className="mt-[10px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] p-[9px_12px] flex items-start gap-2">
                        <div className="w-[18px] h-[18px] rounded-full bg-[#0f172a] flex items-center justify-center shrink-0 mt-px">
                          <Scale size={8} style={{ color: '#10b981' }} />
                        </div>
                        <p className="text-[11.5px] text-[#166534] font-medium leading-[1.5] flex-1">{snippet}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[#cbd5e1] shrink-0 mt-0.5" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
