'use client';

import type { ViewType } from '@/types/view';

interface NavItem {
  view: ViewType;
  icon: React.ReactNode;
}

const items: NavItem[] = [
  { view: 'dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { view: 'transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { view: 'marketplace', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M6 2 4 6v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z"/><line x1="4.5" y1="6" x2="19.5" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
  { view: 'withdraw', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { view: 'referrals', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { view: 'disputes', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z"/></svg> },
  { view: 'profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
];

function isActive(view: ViewType, current: ViewType) {
  if (view === 'disputes') return current === 'disputes' || current === 'dispute_chat' || current === 'dispute_details';
  return view === current;
}

interface MobileBottomNavProps {
  currentView: ViewType;
  setCurrentView: (v: ViewType) => void;
}

export function MobileBottomNav({ currentView, setCurrentView }: MobileBottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
      <nav className="bg-[#0f172a] rounded-[32px] shadow-2xl border border-white/[.06] p-2 flex items-center justify-between">
        {items.map((item) => {
          const active = isActive(item.view, currentView);
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`flex-1 flex items-center justify-center py-2 transition-all duration-300 ${active ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-[#10b981] shadow-lg shadow-emerald-500/30' : ''}`}>
                {item.icon}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
