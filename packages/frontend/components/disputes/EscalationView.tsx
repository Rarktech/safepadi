'use client';

import { Headphones, CheckSquare, Square, MessageSquare, User } from 'lucide-react';

interface EscalationViewProps {
  dispute: any;
  messages: any[];
}

export function EscalationView({ dispute, messages }: EscalationViewProps) {
  const lastMessages = messages.slice(-2);
  const judgePayload = dispute.last_judge_payload || {};
  const confidence = dispute.adjudication?.low_confidence ? 52 : 86;

  const checklist = [
    { label: `SafeAI's draft verdict (${confidence}% confidence)`, done: true },
    { label: 'All case messages', done: true },
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
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Escalated · awaiting human</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-1">
              This case is now with a senior specialist
            </h2>
            <p className="text-sm text-stone-600">
              Our dispute team is reviewing the full case file along with SafeAI's draft. You can continue to send messages — the specialist will respond directly in the thread.
            </p>
          </div>
          <div className="text-right shrink-0 hidden md:block">
            <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-0.5">ETA</p>
            <p className="text-2xl font-bold text-red-500">~2h</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Specialist card */}
        <div className="flex-1 bg-white border border-stone-200 rounded-2xl p-5">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Your Specialist</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
              S
            </div>
            <div>
              <p className="font-bold text-stone-900">Safeeely Dispute Team</p>
              <p className="text-xs text-stone-500">Senior Dispute Specialist</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] border border-stone-200 rounded-full px-2 py-0.5 text-stone-500">Freelance specialist</span>
                <span className="text-[10px] border border-stone-200 rounded-full px-2 py-0.5 text-stone-500">500+ resolved</span>
              </div>
            </div>
          </div>
          <blockquote className="text-sm italic text-stone-500 bg-stone-50 rounded-xl p-3 border border-stone-100 leading-relaxed">
            "I'll review the brief, contract, and message history before making a call. Expect a written rationale, not just a number."
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
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">What the specialist will look at</p>
          <div className="flex flex-col gap-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                {item.done
                  ? <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                  : <Square size={16} className="text-stone-300 shrink-0" />
                }
                <span className="text-sm text-stone-700">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Escalation fee note */}
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
            <span className="text-amber-600">⚡</span>
            <p className="text-xs text-amber-700">
              Escalation fee held in escrow — refunded to whoever the specialist rules in favor of.
            </p>
          </div>
        </div>
      </div>

      {/* Latest in thread */}
      {lastMessages.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Latest in the case thread</p>
          <div className="flex flex-col gap-3">
            {lastMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${msg.sender_type === 'AI' ? 'bg-emerald-100' : 'bg-stone-100'}`}>
                  {msg.sender_type === 'AI'
                    ? <img src="/logo-main.svg" alt="SafeAI" className="h-5 w-5 object-contain" />
                    : msg.sender_type?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-stone-700">{msg.sender_type === 'AI' ? 'SafeAI' : 'Party'}</span>
                    <span className="text-xs text-stone-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
