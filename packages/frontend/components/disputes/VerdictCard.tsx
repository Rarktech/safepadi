'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Headphones, Clock } from 'lucide-react';
import api from '@/lib/api';

const VERDICT_HEADLINES: Record<string, string> = {
  REFUND_BUYER: 'Full refund recommended.',
  PAY_SELLER: 'Payment to seller recommended.',
  SPLIT: 'Partial refund recommended.',
  REFUND_AFTER_RETURN: 'Return of goods required.',
};

function Countdown({ deadline }: { deadline: string | null }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!deadline) return;
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Finalizing...'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [deadline]);

  if (!deadline || !remaining) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
      <Clock size={11} />
      Auto-finalizes in {remaining} if no response
    </span>
  );
}

interface VerdictCardProps {
  dispute: any;
  safetag: string;
  profileId: string;
  onAction: () => void;
}

export function VerdictCard({ dispute, safetag, profileId, onAction }: VerdictCardProps) {
  const [acting, setActing] = useState(false);
  const judgePayload = dispute.last_judge_payload || {};
  const adjudication = dispute.adjudication;
  const txn = dispute.transaction;
  const verdictAction = dispute.verdict_action;

  const confidence = adjudication?.low_confidence ? 52 : 86;
  const splitPct = adjudication?.split_pct_buyer ?? judgePayload.split_pct_buyer ?? 50;
  const buyerAmount = txn ? ((txn.amount * splitPct) / 100) : 0;
  const sellerAmount = txn ? (txn.amount - buyerAmount) : 0;

  const reasoningText: string = judgePayload.reasoning || judgePayload.verdict_summary || '';
  const reasoningLines = reasoningText
    .split(/\n/)
    .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l: string) => l.length > 20)
    .slice(0, 4);

  const evidenceRefs: string[] = judgePayload.utility_evidence_refs || [];

  const handleAccept = async () => {
    setActing(true);
    try {
      await api.post(`/disputes/${dispute.id}/accept-verdict`);
      onAction();
    } catch { /* verdict may auto-resolve */ } finally { setActing(false); }
  };

  const handleEscalate = async () => {
    setActing(true);
    try {
      await api.post(`/disputes/${dispute.id}/escalate`);
      onAction();
    } catch {} finally { setActing(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-6">
      {/* Verdict banner */}
      <div className="bg-[#f0fdf4] border-[1.5px] border-[#bbf7d0] rounded-[18px] p-[22px] mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-[10px]">
            <div className="w-9 h-9 rounded-full bg-[#0f172a] flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#16a34a] tracking-[.07em]">SAFEAI VERDICT DRAFT</p>
              <p className="text-[11.5px] text-[#15803d]">{txn?.product_name} · {confidence}% confidence</p>
            </div>
          </div>
          <div className="bg-[#16a34a] text-white font-['Inter_Tight',sans-serif] text-[15px] font-extrabold px-3 py-[5px] rounded-full shrink-0">{confidence}%</div>
        </div>
        <h2 className="font-['Inter_Tight',sans-serif] text-2xl md:text-[26px] font-black text-[#0f172a] tracking-[-.02em] mb-2">
          {VERDICT_HEADLINES[verdictAction] || 'Verdict issued.'}
        </h2>
        <p className="text-[13px] text-[#475569] leading-[1.65]">{judgePayload.verdict_summary || ''}</p>
      </div>

      {/* Split breakdown */}
      {verdictAction === 'SPLIT' && txn && (
        <div className="bg-white border border-[#e9eaec] rounded-2xl p-5 mb-4">
          <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-[14px]">
            PROPOSED SPLIT · {txn.currency} {Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex justify-between mb-[6px]">
            <div>
              <p className="text-[10.5px] text-[#94a3b8] mb-1">Buyer refund</p>
              <p className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#16a34a]">
                {Number(buyerAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="bg-[#f0fdf4] text-[#16a34a] font-extrabold text-[13px] px-3 py-1 rounded-full self-center">{splitPct}%</span>
          </div>
          <div className="flex justify-between mb-[14px]">
            <div>
              <p className="text-[10.5px] text-[#94a3b8] mb-1">Seller release</p>
              <p className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#f97316]">
                {Number(sellerAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="bg-[#fff7ed] text-[#f97316] font-extrabold text-[13px] px-3 py-1 rounded-full self-center">{100 - splitPct}%</span>
          </div>
          <div className="h-[10px] rounded-full overflow-hidden flex">
            <div className="h-full" style={{ background: '#10b981', borderRadius: '999px 0 0 999px', width: `${splitPct}%` }} />
            <div className="h-full flex-1" style={{ background: '#fed7aa', borderRadius: '0 999px 999px 0' }} />
          </div>
        </div>
      )}

      {/* Reasoning */}
      {reasoningLines.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#94a3b8] tracking-[.07em] mb-3">REASONING</p>
          <div className="flex flex-col gap-2">
            {reasoningLines.map((line, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-[#e9eaec] rounded-xl p-3.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#f0fdf4] text-[#16a34a] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <p className="text-sm text-[#475569] leading-snug">{line}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence cited */}
      {evidenceRefs.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-[#94a3b8] tracking-[.07em] mb-2">CITED EVIDENCE · {evidenceRefs.length}</p>
          <div className="flex flex-wrap gap-2">
            {evidenceRefs.map((ref, i) => (
              <span key={i} className="text-xs bg-[#f1f5f9] text-[#475569] px-3 py-1.5 rounded-full font-medium">
                📎 Case message #{i + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-[10px] mb-4">
        <button
          onClick={handleAccept}
          disabled={acting}
          className="flex-[2] min-w-[160px] h-12 rounded-full border-none bg-[#10b981] text-white font-bold text-sm flex items-center justify-center gap-[7px] disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,.28)]"
        >
          <CheckCircle2 size={18} />
          Accept verdict &amp; release funds
        </button>
        <button
          onClick={() => {/* request revision — send a message */}}
          disabled={acting}
          className="flex-1 min-w-[120px] h-12 rounded-full border border-[#e9eaec] bg-white text-[#64748b] font-semibold text-[13.5px] disabled:opacity-60"
        >
          Request revision
        </button>
        <button
          onClick={handleEscalate}
          disabled={acting}
          className="flex-1 min-w-[120px] h-12 rounded-full border border-[#e9eaec] bg-white text-[#64748b] font-semibold text-[13.5px] flex items-center justify-center gap-[6px] disabled:opacity-60"
        >
          <Headphones size={16} />
          Escalate to human
        </button>
      </div>

      <div className="flex justify-center pb-2">
        <Countdown deadline={dispute.evidence_deadline} />
      </div>
    </div>
  );
}
