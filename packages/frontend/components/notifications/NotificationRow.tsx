'use client';

import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, AlertTriangle, Star, DollarSign,
  ShieldCheck, ArrowUpRight, Users, Bell,
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

function TypeIcon({ type, data }: { type: string; data?: Record<string, any> }) {
  const initial = data?.counterparty_name?.[0]?.toUpperCase();

  const iconMap: Record<string, { icon: React.ReactNode; bg: string; badge: React.ReactNode; badgeBg: string }> = {
    payment:    { icon: <DollarSign size={16} />,     bg: 'bg-emerald-100 text-emerald-700',  badge: <CheckCircle2 size={10} strokeWidth={3} />, badgeBg: 'bg-emerald-500 text-white' },
    transaction:{ icon: <Clock size={16} />,           bg: 'bg-blue-100 text-blue-700',         badge: <Clock size={10} strokeWidth={3} />,         badgeBg: 'bg-blue-500 text-white' },
    withdrawal: { icon: <ArrowUpRight size={16} />,    bg: 'bg-amber-100 text-amber-700',       badge: <CheckCircle2 size={10} strokeWidth={3} />, badgeBg: 'bg-amber-500 text-white' },
    dispute:    { icon: <AlertTriangle size={16} />,   bg: 'bg-red-100 text-red-700',           badge: <AlertTriangle size={10} strokeWidth={3} />, badgeBg: 'bg-red-500 text-white' },
    review:     { icon: <Star size={16} />,            bg: 'bg-yellow-100 text-yellow-700',     badge: <Star size={10} strokeWidth={3} />,          badgeBg: 'bg-yellow-400 text-white' },
    referral:   { icon: <Users size={16} />,           bg: 'bg-purple-100 text-purple-700',     badge: <DollarSign size={10} strokeWidth={3} />,   badgeBg: 'bg-purple-500 text-white' },
    kyc:        { icon: <ShieldCheck size={16} />,     bg: 'bg-teal-100 text-teal-700',         badge: <CheckCircle2 size={10} strokeWidth={3} />, badgeBg: 'bg-teal-500 text-white' },
    system:     { icon: <Bell size={16} />,            bg: 'bg-slate-100 text-slate-700',       badge: <Bell size={10} strokeWidth={3} />,          badgeBg: 'bg-slate-400 text-white' },
  };

  const cfg = iconMap[type] ?? iconMap.system;

  return (
    <div className="relative shrink-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${cfg.bg}`}>
        {initial || cfg.icon}
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${cfg.badgeBg}`}>
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
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors border-b border-slate-100 last:border-b-0 ${
        isUnread ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <TypeIcon type={type} data={data} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug truncate ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
          {title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-snug">{message}</p>
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>

      {isUnread && (
        <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </button>
  );
}
