'use client';

import { CheckCircle2, Circle } from 'lucide-react';

interface MilestoneProgressCardProps {
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  milestoneIndex: number;   // 0-based index of current/last-released milestone
  milestoneTotal: number;
  milestoneLabels?: string[];
  transactionTitle?: string;
}

export function MilestoneProgressCard({
  title,
  message,
  time,
  isUnread,
  milestoneIndex,
  milestoneTotal,
  milestoneLabels = [],
  transactionTitle,
}: MilestoneProgressCardProps) {
  const stages = Array.from({ length: milestoneTotal }, (_, i) => ({
    index: i,
    label: milestoneLabels[i] ?? `Stage ${i + 1}`,
    state: i < milestoneIndex ? 'done' : i === milestoneIndex ? 'current' : 'future',
  }));

  return (
    <div className={`relative flex flex-col gap-3 px-4 py-4 transition-colors ${isUnread ? 'bg-blue-50/40' : 'bg-white'} hover:bg-slate-50`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg">
            📦
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
            {title}
          </p>
          {transactionTitle && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">"{transactionTitle}"</p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{message}</p>
          <p className="text-xs text-slate-400 mt-1">{time}</p>
        </div>

        {isUnread && (
          <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Dark pill progress track */}
      <div className="bg-slate-900 rounded-2xl px-4 py-3">
        {/* overflow-x-auto with centered inner content */}
        <div className="overflow-x-auto">
          <div className="flex justify-center min-w-full">
            <div className="inline-flex items-center gap-0 py-1">
              {stages.map((stage, idx) => (
                <div key={idx} className="flex items-center">
                  {/* Connector line before each node except first */}
                  {idx > 0 && (
                    <div
                      className={`h-1 w-8 rounded-full ${
                        stage.state === 'future' ? 'bg-slate-700' : 'bg-amber-500'
                      }`}
                    />
                  )}

                  {/* Stage node */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`
                        flex items-center justify-center rounded-full border-2 transition-all
                        ${stage.state === 'done'
                          ? 'w-7 h-7 bg-amber-500 border-amber-500 text-white'
                          : stage.state === 'current'
                          ? 'w-9 h-9 bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-900/60 ring-2 ring-amber-500/40 animate-pulse'
                          : 'w-7 h-7 bg-slate-700 border-slate-600 text-slate-400'}
                      `}
                    >
                      {stage.state === 'done' ? (
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                      ) : stage.state === 'current' ? (
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                      ) : (
                        <Circle size={14} strokeWidth={1.5} />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[9px] leading-none max-w-[48px] text-center truncate ${
                        stage.state === 'future' ? 'text-slate-500' : 'text-amber-400 font-medium'
                      }`}
                      title={stage.label}
                    >
                      {stage.label.length > 7 ? stage.label.slice(0, 7) + '…' : stage.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
