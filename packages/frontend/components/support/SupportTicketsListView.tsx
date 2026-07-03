'use client';

import { useState, useEffect } from 'react';
import { LifeBuoy, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';

interface TicketItem {
  id: string;
  status: 'OPEN' | 'RESOLVED' | 'HANDLED_EXTERNALLY';
  trigger_phrase: string | null;
  origin_platform: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  assigned_admin: { id: string; name: string } | null;
  metadata?: { assigned_admin?: { id: string; name: string } };
}

type FilterType = 'all' | 'open' | 'resolved';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'open',     label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
];

function statusOf(t: TicketItem): 'open' | 'resolved' {
  return t.status === 'OPEN' ? 'open' : 'resolved';
}

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: '#fffbeb', color: '#d97706', label: 'Open' },
  resolved: { bg: '#f1f5f9', color: '#475569', label: 'Resolved' },
};

function StatusPill({ ticket }: { ticket: TicketItem }) {
  const st = statusOf(ticket);
  const meta = STATUS_META[st];
  return (
    <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>
      {st === 'open' && (
        <span className="relative flex h-[7px] w-[7px]">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d97706] opacity-75" />
          <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#d97706]" />
        </span>
      )}
      {ticket.status === 'HANDLED_EXTERNALLY' ? 'Resolved (Live Chat)' : meta.label}
    </span>
  );
}

export function SupportTicketsListView({
  safetag,
  onSelectTicket,
}: {
  safetag: string;
  onSelectTicket: (ticket: TicketItem) => void;
}) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    api.get('/support/my-tickets')
      .then(res => setTickets(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [safetag]);

  const filtered = tickets.filter(t => {
    const st = statusOf(t);
    if (filter === 'open')     return st === 'open';
    if (filter === 'resolved') return st === 'resolved';
    return true;
  });

  const openCount = tickets.filter(t => statusOf(t) === 'open').length;
  const resolvedCount = tickets.filter(t => statusOf(t) === 'resolved').length;
  const counts: Record<FilterType, number> = { all: tickets.length, open: openCount, resolved: resolvedCount };

  const StatCard = ({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: React.ReactNode }) => (
    <div className="rounded-2xl p-[16px_18px] flex items-center gap-[11px] bg-white border border-[#e9eaec]">
      <div className={`w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-[10.5px] font-medium mb-[3px] text-[#94a3b8]">{label}</p>
        <p className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#0f172a] tracking-[-.02em] leading-none">{value}</p>
      </div>
    </div>
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
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Clock size={14} style={{ color: '#d97706' }} />} iconBg="bg-[#fffbeb]" label="Open" value={openCount} />
          <StatCard icon={<LifeBuoy size={14} style={{ color: '#16a34a' }} />} iconBg="bg-[#f0fdf4]" label="Resolved" value={resolvedCount} />
        </div>

        <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
          <div className="p-[14px_20px] border-b border-[#f3f4f6] flex items-center gap-2">
            <FilterPills />
          </div>

          <div className="grid grid-cols-[1.6fr_1fr_100px_100px_40px] gap-3 px-6 py-[10px] bg-[#fafafa] border-b border-[#f3f4f6]">
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Ticket</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Platform</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Status</p>
            <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Opened</p>
            <p />
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 px-6 text-center flex flex-col items-center gap-2.5">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[#f8f9fa] flex items-center justify-center">
                <LifeBuoy size={22} className="text-[#94a3b8]" />
              </div>
              <p className="text-[15px] font-bold text-[#0f172a]">{filter === 'all' ? 'No support tickets' : `No ${filter} tickets`}</p>
              <p className="text-[12.5px] text-[#94a3b8]">Type "i need support" in any bot to reach a human agent.</p>
            </div>
          ) : (
            filtered.map(ticket => {
              const supCode = `SUP-${ticket.id.slice(0, 4).toUpperCase()}`;
              const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
              return (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="grid grid-cols-[1.6fr_1fr_100px_100px_40px] gap-3 px-6 py-[14px] border-b border-[#f3f4f6] last:border-b-0 cursor-pointer hover:bg-[#fafbfc] transition-colors items-center"
                >
                  <div className="min-w-0">
                    <code className="text-[10.5px] font-bold text-[#475569] bg-[#f1f5f9] px-[7px] py-[2px] rounded-[5px]">{supCode}</code>
                    <p className="text-[13px] font-bold text-[#0f172a] truncate mt-[3px]">{ticket.trigger_phrase || 'Support request'}</p>
                  </div>
                  <p className="text-[12px] font-medium text-[#64748b] capitalize">{ticket.origin_platform}</p>
                  <div><StatusPill ticket={ticket} /></div>
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
        <div className="grid grid-cols-2 gap-[10px]">
          <StatCard icon={<Clock size={14} style={{ color: '#d97706' }} />} iconBg="bg-[#fffbeb]" label="Open" value={openCount} />
          <StatCard icon={<LifeBuoy size={14} style={{ color: '#16a34a' }} />} iconBg="bg-[#f0fdf4]" label="Resolved" value={resolvedCount} />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <FilterPills mobile />
        </div>

        <div className="flex flex-col gap-[10px]">
          {filtered.length === 0 ? (
            <div className="py-12 px-5 bg-white rounded-[18px] border border-[#e9eaec] text-center">
              <p className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] mb-1.5">{filter === 'all' ? 'No support tickets' : `No ${filter} tickets`}</p>
              <p className="text-[12.5px] text-[#94a3b8]">Type "i need support" in any bot to reach a human agent.</p>
            </div>
          ) : (
            filtered.map(ticket => {
              const supCode = `SUP-${ticket.id.slice(0, 4).toUpperCase()}`;
              const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
              return (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="bg-white border border-[#e9eaec] rounded-[18px] p-[16px_18px] cursor-pointer flex items-start gap-[14px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[7px] mb-[7px] flex-wrap">
                      <code className="text-[10.5px] font-bold text-[#475569] bg-[#f1f5f9] px-[7px] py-[2px] rounded-[5px]">{supCode}</code>
                      <StatusPill ticket={ticket} />
                    </div>
                    <p className="font-['Inter_Tight',sans-serif] text-[14.5px] font-extrabold text-[#0f172a] mb-1 truncate">{ticket.trigger_phrase || 'Support request'}</p>
                    <p className="text-[11px] text-[#94a3b8]">{ticket.origin_platform} · {timeAgo}</p>
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
