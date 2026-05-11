'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, ChevronLeft, Loader2 } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
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
  onBack: () => void;
  onUnreadCountChange?: (count: number) => void;
}

function groupNotifications(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = { New: [], Today: [], Yesterday: [], Older: [] };

  for (const n of notifications) {
    const date = parseISO(n.created_at);
    const ageMs = Date.now() - date.getTime();
    if (!n.is_read && ageMs < 60 * 60 * 1000) {
      groups.New.push(n);
    } else if (isToday(date)) {
      groups.Today.push(n);
    } else if (isYesterday(date)) {
      groups.Yesterday.push(n);
    } else {
      groups.Older.push(n);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export function NotificationsView({ safetag, onBack, onUnreadCountChange }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 30;

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

  const groups = groupNotifications(notifications);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-bold text-slate-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Bell size={40} strokeWidth={1.5} />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-slate-300">No notifications yet</p>
          </div>
        ) : (
          <div className="pb-24">
            {groups.map(({ label, items }) => (
              <div key={label}>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
                </div>
                {items.map(n => {
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
                })}
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center py-6">
                <button
                  onClick={handleLoadMore}
                  className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
