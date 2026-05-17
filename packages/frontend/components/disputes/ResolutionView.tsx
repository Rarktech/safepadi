'use client';

import { CheckCircle2, Download, Star } from 'lucide-react';
import { format } from 'date-fns';

interface ResolutionViewProps {
  dispute: any;
  messages: any[];
}

const TIMELINE_EVENTS = [
  { key: 'created_at', label: 'Dispute opened' },
  { key: 'verdict_at', label: 'SafeAI verdict issued' },
  { key: 'resolved_at', label: 'Case resolved' },
];

export function ResolutionView({ dispute, messages }: ResolutionViewProps) {
  const txn = dispute.transaction;
  const adj = dispute.adjudication;
  const judgePayload = dispute.last_judge_payload || {};
  const resolvedAt = dispute.resolved_at ? new Date(dispute.resolved_at) : null;

  const splitPct = adj?.split_pct_buyer ?? judgePayload.split_pct_buyer ?? 0;
  const buyerAmount = txn ? ((txn.amount * splitPct) / 100) : 0;
  const sellerAmount = txn ? (txn.amount - buyerAmount) : 0;

  const isBuyerWin = dispute.verdict_action === 'REFUND_BUYER' || dispute.verdict_action === 'REFUND_AFTER_RETURN';
  const isSellerWin = dispute.verdict_action === 'PAY_SELLER';
  const isSplit = dispute.verdict_action === 'SPLIT';

  const buyerPayout = isBuyerWin ? txn?.amount : isSplit ? buyerAmount : 0;
  const sellerPayout = isSellerWin ? txn?.amount : isSplit ? sellerAmount : 0;

  const formatMoney = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d: string | null | undefined) => d ? format(new Date(d), 'MMM d · HH:mm') : '—';

  return (
    <div className="flex flex-col items-center gap-6 p-4 md:p-8 overflow-y-auto max-w-2xl mx-auto w-full">
      {/* Success icon */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Resolved · Funds released
          </span>
          <h1 className="text-3xl md:text-4xl font-sans font-bold text-stone-900">This case is settled.</h1>
          {resolvedAt && (
            <p className="text-sm text-stone-500 mt-2">
              Both parties accepted the verdict at{' '}
              <span className="font-semibold">{format(resolvedAt, 'HH:mm')} UTC</span>. Funds are moving on-chain.
            </p>
          )}
        </div>
      </div>

      {/* Payout summary */}
      <div className="w-full bg-white border border-stone-200 rounded-2xl p-5">
        <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Payout</p>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Buyer */}
          <div className="flex-1 flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center">
              {txn?.buyer?.first_name?.charAt(0) || 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-700 truncate">{txn?.buyer?.safetag || 'Buyer'}</p>
              <p className="text-[10px] text-stone-400">Refund</p>
            </div>
            <p className="text-base font-bold text-stone-900 flex items-center gap-1">
              🔵 {formatMoney(buyerPayout)}
            </p>
          </div>
          {/* Seller */}
          <div className="flex-1 flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold text-sm flex items-center justify-center">
              {txn?.seller?.first_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-700 truncate">{txn?.seller?.safetag || 'Seller'}</p>
              <p className="text-[10px] text-stone-400">Release</p>
            </div>
            <p className="text-base font-bold text-stone-900 flex items-center gap-1">
              🔵 {formatMoney(sellerPayout)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="w-full bg-white border border-stone-200 rounded-2xl p-5">
        <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Timeline</p>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Dispute opened', time: dispute.created_at },
            { label: 'SafeAI verdict issued', time: dispute.resolved_at },
            { label: 'Case resolved', time: dispute.resolved_at },
          ].map((event, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-emerald-500' : 'bg-emerald-300'}`} />
                <span className="text-stone-700">{event.label}</span>
              </div>
              <span className="text-stone-400 text-xs">{formatDate(event.time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SafeAI post-mortem */}
      {judgePayload.verdict_summary && (
        <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <img src="/logo-main.svg" alt="SafeAI" className="h-5 w-5 object-contain" />
            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">SafeAI · Post-mortem</p>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">{judgePayload.verdict_summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-3 w-full pb-6">
        <button className="flex-1 flex items-center justify-center gap-2 border border-stone-200 bg-white text-stone-700 font-semibold py-3.5 rounded-2xl hover:bg-stone-50 transition-colors">
          <Download size={16} />
          Download case PDF
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 border border-stone-200 bg-white text-stone-700 font-semibold py-3.5 rounded-2xl hover:bg-stone-50 transition-colors">
          <Star size={16} />
          Leave feedback for SafeAI
        </button>
      </div>
    </div>
  );
}
