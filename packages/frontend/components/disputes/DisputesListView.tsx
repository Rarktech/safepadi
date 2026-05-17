'use client';

import { useState, useEffect } from 'react';
import { Scale, Clock, CheckCircle2, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
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

function StatusPill({ dispute }: { dispute: DisputeItem }) {
  if (dispute.is_ai_paused) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <AlertCircle size={11} />
        Escalated
      </span>
    );
  }
  if (dispute.status === 'RESOLVED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
        <CheckCircle2 size={11} />
        Resolved
      </span>
    );
  }
  if (dispute.verdict_action && dispute.status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        Verdict ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      Open
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
    if (filter === 'open')      return d.status === 'OPEN' && !d.is_ai_paused;
    if (filter === 'escalated') return d.is_ai_paused;
    if (filter === 'resolved')  return d.status === 'RESOLVED';
    return true;
  });

  const openCount = disputes.filter(d => d.status === 'OPEN' && !d.is_ai_paused).length;

  return (
    <div className="p-4 md:p-6 pb-28 md:pb-6 min-h-full bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale size={20} className="text-emerald-600" />
            <h1 className="text-xl font-bold text-stone-900">Disputes</h1>
            {openCount > 0 && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{openCount}</span>
            )}
          </div>
          <p className="text-sm text-stone-500">
            {disputes.length === 0 ? 'No disputes on your account' : `${disputes.length} case${disputes.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'all' ? disputes.length
            : tab.key === 'open' ? disputes.filter(d => d.status === 'OPEN' && !d.is_ai_paused).length
            : tab.key === 'escalated' ? disputes.filter(d => d.is_ai_paused).length
            : disputes.filter(d => d.status === 'RESOLVED').length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold ${filter === tab.key ? 'opacity-70' : 'opacity-60'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="text-emerald-600 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Scale size={28} className="text-stone-400" />
          </div>
          <h3 className="font-semibold text-stone-700 mb-1">
            {filter === 'all' ? 'No disputes' : `No ${filter} disputes`}
          </h3>
          <p className="text-sm text-stone-400 max-w-xs">
            {filter === 'all'
              ? 'Any disputes you raise or are party to will appear here. SafeAI mediates all cases automatically.'
              : `You have no ${filter} disputes right now.`}
          </p>
        </div>
      )}

      {/* Dispute cards */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map(dispute => {
            const txn = dispute.transaction;
            const dspCode = `DSP-${dispute.id.slice(0, 4).toUpperCase()}`;
            const timeAgo = formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true });

            return (
              <button
                key={dispute.id}
                onClick={() => onSelectDispute(dispute)}
                className="w-full text-left bg-white border border-stone-200 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Case ID + status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-stone-400">{dspCode}</span>
                      <StatusPill dispute={dispute} />
                    </div>

                    {/* Product name */}
                    <p className="font-semibold text-stone-900 text-sm truncate mb-1">{txn?.product_name || 'Dispute'}</p>

                    {/* Parties */}
                    <p className="text-xs text-stone-500 mb-2">
                      <span className="text-emerald-700 font-medium">{txn?.buyer?.safetag}</span>
                      <span className="mx-1 text-stone-300">vs</span>
                      <span className="text-orange-600 font-medium">{txn?.seller?.safetag}</span>
                    </p>

                    {/* Amount + time */}
                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      <span className="font-semibold text-stone-600">
                        {txn?.currency} {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className="font-normal text-stone-400 ml-1">in escrow</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo}
                      </span>
                    </div>

                    {/* AI snippet */}
                    {dispute.latest_ai_snippet && (
                      <div className="mt-2 flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                        <img src="/logo-main.svg" alt="" className="h-4 w-4 mt-0.5 shrink-0 object-contain" />
                        <p className="text-xs text-indigo-700 line-clamp-2">
                          {dispute.latest_ai_snippet.replace(/\*\*/g, '').replace(/\[ADMIN_[^\]]*\]/g, '').trim()}
                        </p>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-stone-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
