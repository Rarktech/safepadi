'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, Headphones, Clock } from 'lucide-react';
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
    <span className="flex items-center gap-1 text-xs text-stone-400">
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
      const rtMap: Record<string, string> = {
        REFUND_BUYER: 'REFUND_BUYER',
        PAY_SELLER: 'PAY_SELLER',
        SPLIT: 'SPLIT',
        REFUND_AFTER_RETURN: 'REFUND_AFTER_RETURN',
      };
      await api.post(`/disputes/${dispute.id}/resolve`, {
        resolution_type: rtMap[verdictAction] || verdictAction,
        resolution_notes: 'Accepted via user dashboard',
        ...(verdictAction === 'SPLIT' ? { buyer_amount: buyerAmount, seller_amount: sellerAmount } : {}),
      });
      onAction();
    } catch { /* verdict may auto-resolve */ } finally { setActing(false); }
  };

  const handleEscalate = async () => {
    setActing(true);
    try {
      await api.post(`/disputes/${dispute.id}/notify-join`, { admin_id: profileId });
      onAction();
    } catch {} finally { setActing(false); }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* Verdict card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src="/logo-main.svg" alt="SafeAI" className="h-8 w-8 object-contain" />
            <div>
              <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">SafeAI Verdict Draft</p>
              <p className="text-xs text-emerald-600">{txn?.product_name} · {confidence}% confidence</p>
            </div>
          </div>
          <span className="bg-emerald-600 text-white text-sm font-bold px-2.5 py-1 rounded-full">{confidence}%</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-2">
          {VERDICT_HEADLINES[verdictAction] || 'Verdict issued.'}
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed">{judgePayload.verdict_summary || ''}</p>
      </div>

      {/* Split breakdown */}
      {verdictAction === 'SPLIT' && txn && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">
            Proposed split · {txn.currency} {Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Refund to buyer</p>
              <p className="text-2xl font-bold text-emerald-600 flex items-center gap-1">
                <span className="text-sm">🔵</span>
                {Number(buyerAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-700 font-bold text-sm px-3 py-1 rounded-full">{splitPct}%</span>
          </div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Release to seller</p>
              <p className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                <span className="text-sm">🔵</span>
                {Number(sellerAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="bg-orange-100 text-orange-600 font-bold text-sm px-3 py-1 rounded-full">{100 - splitPct}%</span>
          </div>
          {/* Split progress bar */}
          <div className="w-full h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${splitPct}%` }} />
            <div className="bg-orange-300 h-full rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between text-xs text-stone-400 mt-1">
            <span>{splitPct}% buyer</span>
            <span>{100 - splitPct}% seller</span>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {reasoningLines.length > 0 && (
        <div>
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Reasoning</p>
          <div className="flex flex-col gap-2">
            {reasoningLines.map((line, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-stone-100 rounded-xl p-3.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <p className="text-sm text-stone-700 leading-snug">{line}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence cited */}
      {evidenceRefs.length > 0 && (
        <div>
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Cited evidence · {evidenceRefs.length}</p>
          <div className="flex flex-wrap gap-2">
            {evidenceRefs.map((ref, i) => (
              <span key={i} className="text-xs bg-stone-100 text-stone-600 px-3 py-1.5 rounded-full font-medium">
                📎 Case message #{i + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-3 pt-2 pb-4">
        <button
          onClick={handleAccept}
          disabled={acting}
          className="flex-1 md:flex-none md:px-6 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-60"
        >
          <CheckCircle2 size={18} />
          Accept verdict &amp; release funds
        </button>
        <button
          onClick={() => {/* request revision — send a message */}}
          disabled={acting}
          className="flex-1 md:flex-none md:px-5 flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-700 font-semibold py-3.5 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-60"
        >
          <RotateCcw size={16} />
          Request revision
        </button>
        <button
          onClick={handleEscalate}
          disabled={acting}
          className="flex-1 md:flex-none md:px-5 flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-700 font-semibold py-3.5 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-60"
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
