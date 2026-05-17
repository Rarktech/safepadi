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

const VERDICT_LABELS: Record<string, string> = {
  REFUND_BUYER: 'Refunded',
  PAY_SELLER: 'Paid to seller',
  SPLIT: 'Split',
  REFUND_AFTER_RETURN: 'Return required',
};

const VERDICT_COLORS: Record<string, string> = {
  REFUND_BUYER: 'bg-emerald-100 text-emerald-700',
  PAY_SELLER: 'bg-orange-100 text-orange-700',
  SPLIT: 'bg-blue-100 text-blue-700',
  REFUND_AFTER_RETURN: 'bg-amber-100 text-amber-700',
};

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
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      Active
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

  useEffect(() => {
    api.get(`/disputes/my-disputes?safetag=${encodeURIComponent(safetag)}`)
      .then(res => setDisputes(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [safetag]);

  const openCount = disputes.filter(d => d.status === 'OPEN' && !d.is_ai_paused).length;

  return (
    <div className="p-4 md:p-6 pb-28 md:pb-6 min-h-full bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="text-emerald-600 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && disputes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Scale size={28} className="text-stone-400" />
          </div>
          <h3 className="font-semibold text-stone-700 mb-1">No disputes</h3>
          <p className="text-sm text-stone-400 max-w-xs">
            Any disputes you raise or are party to will appear here. SafeAI mediates all cases automatically.
          </p>
        </div>
      )}

      {/* Dispute cards */}
      {!loading && disputes.length > 0 && (
        <div className="flex flex-col gap-3">
          {disputes.map(dispute => {
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
                      {dispute.verdict_action && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VERDICT_COLORS[dispute.verdict_action] || 'bg-stone-100 text-stone-600'}`}>
                          {VERDICT_LABELS[dispute.verdict_action] || dispute.verdict_action}
                        </span>
                      )}
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
