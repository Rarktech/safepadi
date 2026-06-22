'use client';

import { CheckCircle2, Download, Star } from 'lucide-react';
import { format } from 'date-fns';

interface ResolutionViewProps {
  dispute: any;
  messages: any[];
}

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
    <div className="flex-1 overflow-y-auto p-5 md:p-8 flex flex-col items-center gap-4 max-w-2xl mx-auto w-full">
      {/* Success icon */}
      <div className="flex flex-col items-center gap-[10px] pt-2">
        <div className="w-[72px] h-[72px] rounded-full bg-[#f0fdf4] border-[3px] border-[#bbf7d0] flex items-center justify-center">
          <CheckCircle2 size={32} className="text-[#16a34a]" />
        </div>
        <div className="text-center">
          <span className="inline-flex items-center gap-[5px] text-[11.5px] font-bold text-[#16a34a] bg-[#f0fdf4] px-3 py-[3px] rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            Resolved · Funds released
          </span>
          <h1 className="font-['Inter_Tight',sans-serif] text-[28px] md:text-[32px] font-black text-[#0f172a] tracking-[-.03em]">This case is settled.</h1>
          {resolvedAt ? (
            <p className="text-[13px] text-[#94a3b8] mt-2">
              Both parties accepted the verdict at{' '}
              <span className="font-semibold">{format(resolvedAt, 'HH:mm')} UTC</span>. Funds are moving on-chain.
            </p>
          ) : (
            <p className="text-[13px] text-[#94a3b8] mt-2">Both parties accepted the verdict. Funds are moving.</p>
          )}
        </div>
      </div>

      {/* Payout summary */}
      <div className="w-full bg-white border border-[#e9eaec] rounded-2xl p-[18px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-3">PAYOUT</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
          {/* Buyer */}
          <div className="flex items-center gap-[10px] p-[13px_14px] bg-[#f7f8f9] rounded-xl">
            <div className="w-9 h-9 rounded-full bg-[#dcfce7] text-[#16a34a] font-['Inter_Tight',sans-serif] font-extrabold text-[13px] flex items-center justify-center shrink-0">
              {txn?.buyer?.first_name?.charAt(0) || 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-bold text-[#0f172a] truncate">{txn?.buyer?.safetag || 'Buyer'}</p>
              <p className="text-[10px] text-[#94a3b8]">Refund</p>
            </div>
            <p className="font-['Inter_Tight',sans-serif] text-[13px] font-extrabold text-[#0f172a] shrink-0">{formatMoney(buyerPayout)}</p>
          </div>
          {/* Seller */}
          <div className="flex items-center gap-[10px] p-[13px_14px] bg-[#f7f8f9] rounded-xl">
            <div className="w-9 h-9 rounded-full bg-[#fed7aa] text-[#ea580c] font-['Inter_Tight',sans-serif] font-extrabold text-[13px] flex items-center justify-center shrink-0">
              {txn?.seller?.first_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-bold text-[#0f172a] truncate">{txn?.seller?.safetag || 'Seller'}</p>
              <p className="text-[10px] text-[#94a3b8]">Release</p>
            </div>
            <p className="font-['Inter_Tight',sans-serif] text-[13px] font-extrabold text-[#0f172a] shrink-0">{formatMoney(sellerPayout)}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="w-full bg-white border border-[#e9eaec] rounded-2xl p-[18px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-3">TIMELINE</p>
        <div className="flex flex-col gap-[10px]">
          {[
            { label: 'Dispute opened', time: dispute.created_at },
            { label: 'SafeAI verdict issued', time: dispute.resolved_at },
            { label: 'Case resolved', time: dispute.resolved_at },
          ].map((event, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-[10px]">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#0f172a] font-medium">{event.label}</span>
              </div>
              <span className="text-[11.5px] text-[#94a3b8]">{formatDate(event.time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SafeAI post-mortem */}
      {judgePayload.verdict_summary && (
        <div className="w-full bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-[18px]">
          <div className="flex items-center gap-2 mb-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
            <p className="text-[10px] font-bold text-[#15803d] tracking-[.07em]">SAFEAI · POST-MORTEM</p>
          </div>
          <p className="text-sm text-[#475569] leading-relaxed">{judgePayload.verdict_summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-[10px] w-full pb-6">
        <button className="flex-1 flex items-center justify-center gap-2 border border-[#e9eaec] bg-white text-[#475569] font-semibold py-[14px] rounded-full hover:bg-[#f7f8f9] transition-colors">
          <Download size={16} />
          Download case PDF
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 border border-[#e9eaec] bg-white text-[#475569] font-semibold py-[14px] rounded-full hover:bg-[#f7f8f9] transition-colors">
          <Star size={16} />
          Leave feedback for SafeAI
        </button>
      </div>
    </div>
  );
}
