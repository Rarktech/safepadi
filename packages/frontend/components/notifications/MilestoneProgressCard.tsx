'use client';

import { MapPin, CheckCircle2 } from 'lucide-react';

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
    <div className={`flex flex-col gap-0 ${isUnread ? 'bg-[#f8faff]' : 'bg-white'}`}>
      <div className="flex items-start gap-[13px] px-5 pt-[15px] pb-[10px]">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fffbeb', color: '#d97706' }}>
            <MapPin size={16} strokeWidth={2.2} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white text-white" style={{ background: '#f59e0b' }}>
            <CheckCircle2 size={8} strokeWidth={3} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] leading-[1.4] ${isUnread ? 'font-bold text-[#0f172a]' : 'font-semibold text-[#334155]'}`}>{title}</p>
          {transactionTitle && (
            <p className="text-[11.5px] text-[#64748b] italic mt-[2px] font-medium truncate">&quot;{transactionTitle}&quot;</p>
          )}
          <p className="text-[11.5px] text-[#94a3b8] mt-[2px]">{message}</p>
          <p className="text-[11px] text-[#b0bac6] mt-[4px]">{time}</p>
        </div>
        {isUnread && (
          <div className="mt-[5px] shrink-0 w-2 h-2 rounded-full bg-[#2563eb]" />
        )}
      </div>

      {/* Progress track */}
      <div className="px-5 pb-4">
        <div className="bg-[#f7f8f9] rounded-xl px-4 py-3 border border-[#f1f5f9] overflow-x-auto">
          <div className="flex items-center min-w-max">
            {stages.map((stage, idx) => (
              <div key={idx} className="flex items-center shrink-0">
                {idx > 0 && (
                  <div className="h-1 w-8 rounded-full shrink-0" style={{ background: stage.state === 'future' ? '#e2e8f0' : '#f59e0b' }} />
                )}
                <div className="flex flex-col items-center gap-[5px]">
                  <div
                    className="flex items-center justify-center rounded-full transition-all shrink-0"
                    style={{
                      width: stage.state === 'current' ? '36px' : '28px',
                      height: stage.state === 'current' ? '36px' : '28px',
                      background: stage.state === 'future' ? '#f1f5f9' : '#f59e0b',
                      color: stage.state === 'future' ? '#94a3b8' : '#fff',
                      border: stage.state === 'current' ? '2px solid #fde68a' : '2px solid transparent',
                      boxShadow: stage.state === 'current' ? '0 0 0 4px rgba(245,158,11,.15)' : 'none',
                    }}
                  >
                    {stage.state === 'done' && <CheckCircle2 size={11} strokeWidth={3} />}
                    {stage.state === 'current' && <CheckCircle2 size={12} strokeWidth={3} />}
                    {stage.state === 'future' && <span className="w-[10px] h-[10px] rounded-full border-2 border-current" />}
                  </div>
                  <span
                    className="text-[9px] leading-[1.2] max-w-[48px] text-center truncate"
                    style={{ fontWeight: stage.state === 'future' ? 500 : 700, color: stage.state === 'future' ? '#94a3b8' : '#d97706' }}
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
  );
}
