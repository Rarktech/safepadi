'use client';

import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, AlertTriangle, Star, DollarSign,
  ShieldCheck, ArrowUpRight, Users, Bell, LifeBuoy,
} from 'lucide-react';

interface NotificationRowProps {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  data?: Record<string, any>;
  onMarkRead: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string; badge: React.ReactNode; badgeBg: string }> = {
  payment:     { icon: <DollarSign size={16} />,   bg: '#f0fdf4', color: '#16a34a', badge: <CheckCircle2 size={8} strokeWidth={3} />, badgeBg: '#10b981' },
  transaction: { icon: <Clock size={16} />,        bg: '#eff6ff', color: '#2563eb', badge: <Clock size={8} strokeWidth={3} />,        badgeBg: '#2563eb' },
  withdrawal:  { icon: <ArrowUpRight size={16} />, bg: '#fffbeb', color: '#d97706', badge: <CheckCircle2 size={8} strokeWidth={3} />, badgeBg: '#f59e0b' },
  dispute:     { icon: <AlertTriangle size={16} />,bg: '#fff1f2', color: '#e11d48', badge: <AlertTriangle size={8} strokeWidth={3} />,badgeBg: '#e11d48' },
  review:      { icon: <Star size={16} />,         bg: '#fefce8', color: '#ca8a04', badge: <Star size={8} strokeWidth={3} />,         badgeBg: '#eab308' },
  referral:    { icon: <Users size={16} />,        bg: '#fdf4ff', color: '#9333ea', badge: <DollarSign size={8} strokeWidth={3} />,   badgeBg: '#9333ea' },
  kyc:         { icon: <ShieldCheck size={16} />,  bg: '#f0fdfa', color: '#0d9488', badge: <CheckCircle2 size={8} strokeWidth={3} />, badgeBg: '#0d9488' },
  support:     { icon: <LifeBuoy size={16} />,     bg: '#f0fdf4', color: '#16a34a', badge: <LifeBuoy size={8} strokeWidth={3} />,     badgeBg: '#16a34a' },
  system:      { icon: <Bell size={16} />,         bg: '#f8fafc', color: '#475569', badge: <Bell size={8} strokeWidth={3} />,         badgeBg: '#64748b' },
};

function TypeIcon({ type, data }: { type: string; data?: Record<string, any> }) {
  const initial = data?.counterparty_name?.[0]?.toUpperCase();
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.system;

  return (
    <div className="relative shrink-0">
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: cfg.bg, color: cfg.color }}>
        {initial || cfg.icon}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white text-white" style={{ background: cfg.badgeBg }}>
        {cfg.badge}
      </div>
    </div>
  );
}

function deriveFallbackUrl(type: string, data?: Record<string, any>): string | null {
  if (!data) return null;
  if (data.transaction_id) return `/dashboard/transactions/${data.transaction_id}`;
  return null;
}

export function NotificationRow({ id, type, title, message, time, isUnread, data, onMarkRead }: NotificationRowProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isUnread) onMarkRead(id);
    const url = data?.link_url || deriveFallbackUrl(type, data);
    if (url) router.push(url);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-[13px] px-5 py-[15px] transition-colors border-b border-[#f3f4f6] last:border-b-0 ${
        isUnread ? 'bg-[#f8faff] hover:bg-[#f0f6ff]' : 'bg-white hover:bg-[#fafbfc]'
      }`}
    >
      <TypeIcon type={type} data={data} />

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-[1.4] ${isUnread ? 'font-bold text-[#0f172a]' : 'font-semibold text-[#334155]'}`}>
          {title}
        </p>
        <p className="text-[11.5px] text-[#94a3b8] mt-[3px] line-clamp-2 leading-[1.5]">{message}</p>
        <p className="text-[11px] text-[#b0bac6] mt-[5px]">{time}</p>
      </div>

      {isUnread && (
        <div className="mt-[5px] shrink-0 w-2 h-2 rounded-full bg-[#2563eb]" />
      )}
    </button>
  );
}
