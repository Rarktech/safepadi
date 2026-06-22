'use client';

import { useEffect, useState } from 'react';
import { Headphones, CheckSquare, Square, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EscalationViewProps {
  dispute: any;
  messages: any[];
}

function EtaDisplay({ escalatedAt }: { escalatedAt: string | null }) {
  const [label, setLabel] = useState('~2h');

  useEffect(() => {
    if (!escalatedAt) return;
    const update = () => {
      const elapsed = Date.now() - new Date(escalatedAt).getTime();
      const window = 2 * 60 * 60 * 1000;
      const remaining = Math.max(0, window - elapsed);
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      setLabel(remaining === 0 ? 'Soon' : `~${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [escalatedAt]);

  return <p className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#e11d48]">{label}</p>;
}

export function EscalationView({ dispute, messages }: EscalationViewProps) {
  const lastMessages = messages.slice(-3);
  const confidence = dispute.adjudication?.low_confidence ? 52 : 86;

  // Specialist: prefer DB join, fall back to metadata snapshot
  const specialist: any = dispute.assigned_specialist || dispute.metadata?.assigned_specialist || null;
  const specialistName = specialist?.name || 'a Safeeely specialist';
  const specialistFirstName = specialistName.split(' ')[0];
  const specialistInitial = specialistName.charAt(0).toUpperCase();
  const specialistTitle = specialist?.specialist_title || 'Senior Dispute Specialist';
  const specialistBio = specialist?.specialist_bio || "I'll review the brief, contract, and message history before making a call. Expect a written rationale, not just a number.";
  const specialistTags: string[] = specialist?.specialties?.slice(0, 2) || [];
  const casesResolved = specialist?.cases_resolved || 0;

  // Detect if admin has already joined
  const adminJoined = messages.some(
    (m: any) =>
      (typeof m.content === 'string' && m.content.includes('[ADMIN_JOINED')) ||
      m.sender_type === 'ADMIN'
  );

  // Find when escalation happened — use dispute.created_at as fallback
  const escalatedAt = dispute.metadata?.escalated_at || dispute.created_at || null;

  const checklist = [
    { label: `SafeAI's draft verdict (${confidence}% confidence)`, done: true },
    { label: `All ${messages.length} case messages`, done: true },
    { label: 'Contract & attachments', done: true },
    { label: 'Similar resolved cases', done: true },
    { label: 'Your stated reason for escalation', done: true },
    { label: 'Reach out to either party if needed', done: false },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col gap-[14px]">
      {/* Red banner */}
      <div className="bg-[#fff1f2] border-[1.5px] border-[#fecdd3] rounded-[18px] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[11px] bg-[#fee2e2] flex items-center justify-center shrink-0">
            <Headphones size={20} className="text-[#e11d48]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold text-[#e11d48] bg-[#fee2e2] px-2 py-0.5 rounded-full">
                {adminJoined ? '● Specialist joined' : '● Escalated · awaiting human'}
              </span>
            </div>
            <h2 className="font-['Inter_Tight',sans-serif] text-lg md:text-xl font-extrabold text-[#0f172a] mb-1">
              {adminJoined
                ? `${specialistFirstName} has joined your case thread`
                : 'This case is now with a senior specialist'}
            </h2>
            <p className="text-sm text-[#64748b] leading-[1.6]">
              {adminJoined
                ? `${specialistName} is reviewing the full case file. You can continue to send messages — they will respond directly in the thread.`
                : `${specialistName} is reviewing the full case file along with SafeAI's draft. You can continue to send messages — ${specialistFirstName} will respond directly in the thread.`}
            </p>
          </div>
          {/* ETA — desktop only */}
          <div className="text-right shrink-0 hidden md:block">
            <p className="text-xs text-[#94a3b8] uppercase tracking-[.07em] font-bold mb-0.5">ETA</p>
            <EtaDisplay escalatedAt={escalatedAt} />
          </div>
        </div>

        {/* ETA — mobile inline */}
        <div className="mt-3 bg-white/60 rounded-xl p-3 flex items-center justify-between md:hidden">
          <span className="text-xs font-bold text-[#64748b] uppercase tracking-[.07em]">ETA</span>
          <EtaDisplay escalatedAt={escalatedAt} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-[14px]">
        {/* Specialist card */}
        <div className="flex-1 bg-white border border-[#e9eaec] rounded-2xl p-[18px]">
          <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-[14px]">YOUR SPECIALIST</p>
          <div className="flex items-center gap-[10px] mb-3">
            <div className="w-11 h-11 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#92400e] font-['Inter_Tight',sans-serif] font-extrabold text-lg shrink-0">
              {specialistInitial}
            </div>
            <div>
              <p className="font-['Inter_Tight',sans-serif] text-[13.5px] font-extrabold text-[#0f172a]">{specialistName}</p>
              <p className="text-[11px] text-[#94a3b8]">{specialistTitle}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {specialistTags.map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] border border-[#e9eaec] rounded-full px-2 py-0.5 text-[#94a3b8] capitalize">
                    {tag.replace(/_/g, ' ')} specialist
                  </span>
                ))}
                {casesResolved > 0 && (
                  <span className="text-[10px] border border-[#e9eaec] rounded-full px-2 py-0.5 text-[#94a3b8]">
                    {casesResolved}+ resolved
                  </span>
                )}
              </div>
            </div>
          </div>
          <blockquote className="text-[12px] italic text-[#64748b] bg-[#f7f8f9] rounded-xl p-3 border border-[#e9eaec] leading-[1.6]">
            "{specialistBio}"
          </blockquote>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 flex items-center justify-center gap-[6px] border border-[#e9eaec] rounded-xl py-[10px] text-sm font-semibold text-[#475569] hover:bg-[#f7f8f9] transition-colors">
              <MessageSquare size={14} />
              Message
            </button>
            <button className="flex-1 flex items-center justify-center gap-[6px] border border-[#e9eaec] rounded-xl py-[10px] text-sm font-semibold text-[#475569] hover:bg-[#f7f8f9] transition-colors">
              <User size={14} />
              View profile
            </button>
          </div>
        </div>

        {/* Checklist card */}
        <div className="flex-1 bg-white border border-[#e9eaec] rounded-2xl p-[18px]">
          <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-3">
            WHAT {specialistFirstName.toUpperCase()} WILL LOOK AT
          </p>
          <div className="flex flex-col">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-[9px] py-[9px] border-b border-[#f3f4f6] last:border-0">
                {item.done
                  ? <CheckSquare size={14} className="text-[#10b981] shrink-0" />
                  : <Square size={14} className="text-[#e9eaec] shrink-0" />
                }
                <span className="text-[12.5px] text-[#475569]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest in thread */}
      {lastMessages.length > 0 && (
        <div className="bg-white border border-[#e9eaec] rounded-2xl p-[18px]">
          <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-[14px]">LATEST IN THE CASE THREAD</p>
          <div className="flex flex-col gap-3">
            {lastMessages.map((msg: any, i: number) => {
              const isAI = msg.sender_type === 'AI';
              const isAdmin = msg.sender_type === 'ADMIN';
              const senderLabel = isAI
                ? 'SafeAI'
                : isAdmin
                ? (msg.metadata?.identity || specialistFirstName)
                : 'Party';
              const timeStr = msg.created_at
                ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
                : '';
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isAI ? 'bg-[#f0fdf4]' : isAdmin ? 'bg-[#fef3c7]' : 'bg-[#f1f5f9]'}`}>
                    {isAI
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                      : <span className={isAdmin ? 'text-[#92400e]' : 'text-[#475569]'}>{senderLabel.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-[#475569]">{senderLabel}</span>
                      <span className="text-xs text-[#94a3b8]">{timeStr}</span>
                    </div>
                    <p className="text-sm text-[#64748b] line-clamp-2">
                      {(msg.content || '').replace(/\*\*/g, '').replace(/\[ADMIN_JOINED[^\]]*\]/g, '')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
