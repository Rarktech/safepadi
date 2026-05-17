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

  return <p className="text-2xl font-bold text-red-500">{label}</p>;
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
    <div className="flex flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* Red banner */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Headphones size={20} className="text-red-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                {adminJoined ? '● Specialist joined' : '● Escalated · awaiting human'}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-1">
              {adminJoined
                ? `${specialistFirstName} has joined your case thread`
                : 'This case is now with a senior specialist'}
            </h2>
            <p className="text-sm text-stone-600">
              {adminJoined
                ? `${specialistName} is reviewing the full case file. You can continue to send messages — they will respond directly in the thread.`
                : `${specialistName} is reviewing the full case file along with SafeAI's draft. You can continue to send messages — ${specialistFirstName} will respond directly in the thread.`}
            </p>
          </div>
          {/* ETA — desktop only */}
          <div className="text-right shrink-0 hidden md:block">
            <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-0.5">ETA</p>
            <EtaDisplay escalatedAt={escalatedAt} />
          </div>
        </div>

        {/* ETA — mobile inline */}
        <div className="mt-3 bg-white/60 rounded-xl p-3 flex items-center justify-between md:hidden">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">ETA</span>
          <EtaDisplay escalatedAt={escalatedAt} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Specialist card */}
        <div className="flex-1 bg-white border border-stone-200 rounded-2xl p-5">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Your Specialist</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0">
              {specialistInitial}
            </div>
            <div>
              <p className="font-bold text-stone-900">{specialistName}</p>
              <p className="text-xs text-stone-500">{specialistTitle}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {specialistTags.map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] border border-stone-200 rounded-full px-2 py-0.5 text-stone-500 capitalize">
                    {tag.replace(/_/g, ' ')} specialist
                  </span>
                ))}
                {casesResolved > 0 && (
                  <span className="text-[10px] border border-stone-200 rounded-full px-2 py-0.5 text-stone-500">
                    {casesResolved}+ resolved
                  </span>
                )}
              </div>
            </div>
          </div>
          <blockquote className="text-sm italic text-stone-500 bg-stone-50 rounded-xl p-3 border border-stone-100 leading-relaxed">
            "{specialistBio}"
          </blockquote>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
              <MessageSquare size={14} />
              Message
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
              <User size={14} />
              View profile
            </button>
          </div>
        </div>

        {/* Checklist card */}
        <div className="flex-1 bg-white border border-stone-200 rounded-2xl p-5">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">
            What {specialistFirstName} will look at
          </p>
          <div className="flex flex-col">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
                {item.done
                  ? <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                  : <Square size={16} className="text-stone-300 shrink-0" />
                }
                <span className="text-sm text-stone-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest in thread */}
      {lastMessages.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Latest in the case thread</p>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isAI ? 'bg-emerald-100' : isAdmin ? 'bg-amber-100' : 'bg-stone-100'}`}>
                    {isAI
                      ? <img src="/logo-main.svg" alt="SafeAI" className="h-5 w-5 object-contain" />
                      : <span className={isAdmin ? 'text-amber-700' : 'text-stone-600'}>{senderLabel.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-stone-700">{senderLabel}</span>
                      <span className="text-xs text-stone-400">{timeStr}</span>
                    </div>
                    <p className="text-sm text-stone-600 line-clamp-2">
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
