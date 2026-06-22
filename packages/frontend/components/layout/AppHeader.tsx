'use client';

import type { ViewType } from '@/types/view';

const PAGE_COPY: Record<ViewType, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard', sub: 'Welcome back' },
  marketplace: { title: 'Marketplace', sub: 'Browse listings & jobs' },
  transactions: { title: 'My Transactions', sub: 'All your trade history' },
  disputes: { title: 'Disputes', sub: 'Active & resolved disputes' },
  dispute_chat: { title: 'Disputes', sub: 'Active & resolved disputes' },
  dispute_details: { title: 'Disputes', sub: 'Active & resolved disputes' },
  withdraw: { title: 'Withdraw', sub: 'Send funds to bank or crypto' },
  referrals: { title: 'Referrals', sub: 'Invite friends, earn rewards' },
  notifications: { title: 'Notifications', sub: 'Your latest alerts' },
  profile: { title: 'Profile & Settings', sub: 'Manage your account' },
};

interface AppHeaderProps {
  currentView: ViewType;
  unreadNotifCount: number;
  onNotifClick: () => void;
  firstName?: string;
  safetag?: string;
  avatarUrl?: string | null;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function AppHeader({ currentView, unreadNotifCount, onNotifClick, firstName, safetag, avatarUrl, searchValue, onSearchChange }: AppHeaderProps) {
  const { title, sub } = PAGE_COPY[currentView] || PAGE_COPY.dashboard;
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : 'good evening';
  })();
  const initial = (firstName?.[0] || safetag?.[1] || 'S').toUpperCase();

  return (
    <>
      {/* Desktop header */}
      <header className="hidden md:flex h-14 items-center justify-between px-7 sticky top-0 z-30 bg-white border-b border-[#e9eaec] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-[5px] h-[5px] rounded-full bg-[#10b981]" />
          <span className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">{title}</span>
          <span className="text-xs text-[#94a3b8] font-normal">{sub}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-[7px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[9px] px-[13px] py-[7px] ${onSearchChange ? '' : 'cursor-default'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            {onSearchChange ? (
              <input
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search transactions…"
                className="text-xs text-[#0f172a] font-normal bg-transparent outline-none w-[180px] placeholder:text-[#94a3b8]"
              />
            ) : (
              <span className="text-xs text-[#94a3b8] font-normal">Search anything…</span>
            )}
            <span className="text-[10px] text-[#cbd5e1] font-semibold bg-[#f1f5f9] px-[5px] py-px rounded ml-2">⌘K</span>
          </div>
          <button
            onClick={onNotifClick}
            className="relative w-9 h-9 rounded-[9px] border border-[#e9eaec] bg-white flex items-center justify-center cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {unreadNotifCount > 0 && (
              <span className="absolute top-[7px] right-[7px] w-[6px] h-[6px] bg-[#e11d48] rounded-full border-[1.5px] border-white" />
            )}
          </button>
          <div className="flex items-center gap-[7px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[9px] pl-[5px] pr-[10px] py-[5px] cursor-pointer">
            <div className="w-[26px] h-[26px] rounded-full bg-[#0f172a] flex items-center justify-center text-[#10b981] font-black text-[11px] font-['Inter_Tight',sans-serif] overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
            </div>
            <span className="text-[12.5px] font-semibold text-[#0f172a]">{safetag}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden flex h-[62px] items-center justify-between px-[18px] sticky top-0 z-30 shrink-0" style={{ backgroundColor: '#F4F7F6' }}>
        <div className="flex items-center gap-[10px]">
          <div className="w-9 h-9 rounded-[9px] bg-[#0f172a] flex items-center justify-center shrink-0">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.2}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z"/></svg>
          </div>
          <div className="leading-tight">
            <p className="text-[10.5px] text-[#94a3b8] font-medium">Hello, {greeting}!</p>
            <p className="text-sm font-bold text-[#0f172a] font-['Inter_Tight',sans-serif]">{firstName || safetag || 'User'}</p>
          </div>
        </div>
        <button
          onClick={onNotifClick}
          className="relative w-[38px] h-[38px] rounded-full bg-[#e2e8f0] flex items-center justify-center cursor-pointer border-none"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {unreadNotifCount > 0 && (
            <span className="absolute top-[5px] right-[5px] w-2 h-2 bg-[#e11d48] rounded-full border-[1.5px]" style={{ borderColor: '#F4F7F6' }} />
          )}
        </button>
      </header>
    </>
  );
}
