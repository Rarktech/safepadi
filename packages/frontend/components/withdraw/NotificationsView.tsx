'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, CheckCheck, Loader2, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '@/lib/api';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { MilestoneProgressCard } from '@/components/notifications/MilestoneProgressCard';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface NotificationsViewProps {
  safetag: string;
  profile?: any;
  onUnreadCountChange?: (count: number) => void;
  onProfileUpdate?: () => void;
}

type FilterKey = 'all' | 'unread' | 'payment' | 'transaction' | 'withdrawal' | 'dispute' | 'referral' | 'kyc' | 'system';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'unread',      label: 'Unread' },
  { key: 'payment',     label: 'Payments' },
  { key: 'transaction', label: 'Transactions' },
  { key: 'withdrawal',  label: 'Withdrawals' },
  { key: 'dispute',     label: 'Disputes' },
  { key: 'referral',    label: 'Referrals' },
  { key: 'kyc',         label: 'KYC' },
  { key: 'system',      label: 'System' },
];

function matchesFilter(n: Notification, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !n.is_read;
  if (filter === 'transaction') return n.type === 'transaction' || n.type === 'milestone';
  if (filter === 'system') return !['payment', 'transaction', 'milestone', 'withdrawal', 'dispute', 'referral', 'kyc'].includes(n.type);
  return n.type === filter;
}

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="w-[38px] h-[22px] rounded-full cursor-pointer relative shrink-0 transition-colors"
      style={{ background: on ? '#10b981' : '#e2e8f0' }}
    >
      <div
        className="w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all shadow-sm"
        style={{ left: on ? '19px' : '3px' }}
      />
    </div>
  );
}

export function NotificationsView({ safetag, profile, onUnreadCountChange, onProfileUpdate }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const LIMIT = 30;

  const notifPrefs: Record<string, boolean> = profile?.notification_prefs || { push: true, email: true, sms: false };

  const fetchPage = useCallback(async (currentOffset: number) => {
    try {
      const res = await api.get(`/notifications/${encodeURIComponent(safetag)}?limit=${LIMIT}&offset=${currentOffset}`);
      const { notifications: fetched, unread_count } = res.data;
      setNotifications(prev => currentOffset === 0 ? fetched : [...prev, ...fetched]);
      setUnreadCount(unread_count);
      setHasMore(fetched.length === LIMIT);
      if (onUnreadCountChange) onUnreadCountChange(unread_count);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [safetag, onUnreadCountChange]);

  useEffect(() => {
    setLoading(true);
    setNotifications([]);
    fetchPage(0);
  }, [fetchPage]);

  const handleMarkRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    if (onUnreadCountChange) onUnreadCountChange(Math.max(0, unreadCount - 1));
    try {
      await api.patch(`/notifications/${encodeURIComponent(safetag)}/read`, { ids: [id] });
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    if (onUnreadCountChange) onUnreadCountChange(0);
    try {
      await api.patch(`/notifications/${encodeURIComponent(safetag)}/read`, { all: true });
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLoadMore = () => {
    fetchPage(notifications.length);
  };

  const togglePref = async (key: 'push' | 'email' | 'sms') => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    try {
      await api.patch(`/profiles/${encodeURIComponent(safetag)}`, { notification_prefs: updated });
      if (onProfileUpdate) onProfileUpdate();
    } catch {
      // silent
    }
  };

  const filtered = useMemo(() => notifications.filter(n => matchesFilter(n, filter)), [notifications, filter]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: notifications.length, unread: 0, payment: 0, transaction: 0, withdrawal: 0, dispute: 0, referral: 0, kyc: 0, system: 0 };
    for (const n of notifications) {
      for (const key of ['unread', 'payment', 'transaction', 'withdrawal', 'dispute', 'referral', 'kyc', 'system'] as FilterKey[]) {
        if (matchesFilter(n, key)) c[key]++;
      }
    }
    return c;
  }, [notifications]);

  const FilterPills = ({ mobile }: { mobile?: boolean }) => (
    <>
      {FILTER_TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => setFilter(tab.key)}
          className={`flex items-center gap-[5px] px-[14px] py-[7px] rounded-full text-[12px] font-semibold whitespace-nowrap border transition-all ${mobile ? 'shrink-0' : ''} ${
            filter === tab.key ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-[#64748b] border-[#e9eaec]'
          }`}
        >
          {tab.label} <span className="opacity-60 font-medium">{counts[tab.key]}</span>
        </button>
      ))}
    </>
  );

  const renderNotif = (n: Notification) => {
    const time = relativeTime(n.created_at);
    if (n.type === 'milestone' && n.data?.milestone_total) {
      return (
        <MilestoneProgressCard
          key={n.id}
          title={n.title}
          message={n.message}
          time={time}
          isUnread={!n.is_read}
          milestoneIndex={n.data.milestone_index ?? 0}
          milestoneTotal={n.data.milestone_total}
          milestoneLabels={n.data.milestone_labels}
          transactionTitle={n.data.transaction_title}
        />
      );
    }
    return (
      <NotificationRow
        key={n.id}
        id={n.id}
        type={n.type}
        title={n.title}
        message={n.message}
        time={time}
        isUnread={!n.is_read}
        data={n.data}
        onMarkRead={handleMarkRead}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="text-[#10b981] animate-spin" />
      </div>
    );
  }

  const EmptyState = ({ compact }: { compact?: boolean }) => (
    <div className={`flex flex-col items-center text-center gap-3 ${compact ? 'py-12 px-5' : 'py-20 px-6'}`}>
      <div className="w-[52px] h-[52px] rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
        <Bell size={22} className="text-[#94a3b8]" strokeWidth={1.8} />
      </div>
      <p className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a]">All caught up</p>
      <p className="text-[12.5px] text-[#94a3b8]">No {filter === 'all' ? '' : FILTER_TABS.find(f => f.key === filter)?.label.toLowerCase() + ' '}notifications.</p>
    </div>
  );

  const SummaryPanel = () => (
    <div className="flex flex-col gap-3">
      {/* Overview */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] p-[18px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-3">OVERVIEW</p>
        <div className="flex flex-col gap-[10px]">
          {[
            { label: 'Unread', value: unreadCount, dot: '#2563eb' },
            { label: 'Payments', value: counts.payment, dot: '#10b981' },
            { label: 'Disputes', value: counts.dispute, dot: '#e11d48' },
            { label: 'Referrals', value: counts.referral, dot: '#9333ea' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.dot }} />
                <span className="text-[12.5px] font-medium text-[#64748b]">{row.label}</span>
              </div>
              <span className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] p-[18px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-3">PREFERENCES</p>
        <div className="flex flex-col gap-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-[#0f172a]">Push alerts</span>
            <ToggleSwitch on={!!notifPrefs.push} onClick={() => togglePref('push')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-[#0f172a]">Email digest</span>
            <ToggleSwitch on={!!notifPrefs.email} onClick={() => togglePref('email')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-[#0f172a]">SMS alerts</span>
            <ToggleSwitch on={!!notifPrefs.sms} onClick={() => togglePref('sms')} />
          </div>
        </div>
      </div>

      {/* SafeAI tip */}
      <div className="bg-[#0f172a] rounded-2xl p-[18px]">
        <div className="flex items-center gap-2 mb-[10px]">
          <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,.15)' }}>
            <ShieldCheck size={12} className="text-[#10b981]" />
          </div>
          <span className="text-[11px] font-bold text-[#10b981] tracking-[.05em]">SAFEAI TIP</span>
        </div>
        <p className="text-[12.5px] leading-[1.65]" style={{ color: 'rgba(255,255,255,.55)' }}>
          Respond to dispute notifications within 48 hours to keep SafeAI mediation moving.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full" style={{ backgroundColor: '#f1f5f9' }}>
      {/* Desktop */}
      <div className="hidden md:flex items-start">
        <div className="flex-1 min-w-0 py-6 flex flex-col">
          <div className="flex items-center gap-2 px-7 pb-4 flex-wrap">
            <FilterPills />
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-[#10b981] bg-[#f0fdf4] border border-[#d1fae5] rounded-lg px-[13px] py-[7px] disabled:opacity-50"
              >
                {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={14} />}
                Mark all read
              </button>
            )}
          </div>

          <div className="mx-7 bg-white rounded-[18px] border border-[#e9eaec] overflow-hidden">
            {filtered.length === 0 ? <EmptyState /> : filtered.map(renderNotif)}
          </div>

          {hasMore && (
            <div className="flex justify-center py-6">
              <button onClick={handleLoadMore} className="text-sm text-[#10b981] font-semibold hover:text-[#059669] transition-colors">
                Load more
              </button>
            </div>
          )}
        </div>

        <div className="w-[260px] shrink-0 py-6 pr-7">
          <SummaryPanel />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col pb-28">
        <div className="px-4 pt-3 flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1">
            <FilterPills mobile />
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="px-4 pt-2">
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#10b981] bg-[#f0fdf4] border border-[#d1fae5] rounded-lg px-[12px] py-[7px] disabled:opacity-50"
            >
              {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={14} />}
              Mark all read
            </button>
          </div>
        )}

        <div className="px-4 pt-3 flex flex-col gap-1">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[18px] border border-[#e9eaec]">
              <EmptyState compact />
            </div>
          ) : (
            <div className="bg-[#e9eaec] rounded-[20px] overflow-hidden flex flex-col gap-px">
              {filtered.map(renderNotif)}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center py-6">
              <button onClick={handleLoadMore} className="text-sm text-[#10b981] font-semibold">
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
