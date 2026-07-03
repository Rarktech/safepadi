"use client"

import * as React from "react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { ViewType } from "@/types/view"

interface NavItem {
  title: string
  view: ViewType
  icon: React.ReactNode
}

const overviewItems: NavItem[] = [
  {
    title: "Dashboard",
    view: "dashboard",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    title: "Marketplace",
    view: "marketplace",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 2 4 6v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z"/><line x1="4.5" y1="6" x2="19.5" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  },
  {
    title: "My Transactions",
    view: "transactions",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
  {
    title: "Disputes",
    view: "disputes",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z"/></svg>,
  },
  {
    title: "Support",
    view: "support_tickets",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><line x1="4.5" y1="4.5" x2="8.5" y2="8.5"/><line x1="19.5" y1="4.5" x2="15.5" y2="8.5"/><line x1="4.5" y1="19.5" x2="8.5" y2="15.5"/><line x1="19.5" y1="19.5" x2="15.5" y2="15.5"/></svg>,
  },
]

const financeItems: NavItem[] = [
  {
    title: "Withdraw",
    view: "withdraw",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  },
  {
    title: "Referrals",
    view: "referrals",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
]

const accountItems: NavItem[] = [
  {
    title: "Profile & Settings",
    view: "profile",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
]

function isActive(view: ViewType, current: ViewType) {
  if (view === "disputes") return current === "disputes" || current === "dispute_chat" || current === "dispute_details"
  if (view === "support_tickets") return current === "support_tickets" || current === "support_chat"
  return view === current
}

function NavSection({
  label,
  items,
  currentView,
  setCurrentView,
  disputeCount,
}: {
  label: string
  items: NavItem[]
  currentView: ViewType
  setCurrentView: (v: ViewType) => void
  disputeCount?: number
}) {
  return (
    <div className="flex flex-col gap-px">
      <p className="text-[11px] font-medium text-[#b0bac6] px-3 pt-2.5 pb-[5px]">{label}</p>
      {items.map((item) => {
        const active = isActive(item.view, currentView)
        const showBadge = item.view === "disputes" && !!disputeCount && disputeCount > 0
        return (
          <div
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex items-center gap-[10px] px-3 py-[9px] rounded-[9px] cursor-pointer text-[13.5px] transition-colors ${
              active ? "bg-[#f1f5f9] text-[#0f172a] font-semibold" : "text-[#64748b] font-medium hover:bg-[#f8f9fa] hover:text-[#0f172a]"
            }`}
          >
            {item.icon}
            <span>{item.title}</span>
            {showBadge ? (
              <span className="ml-auto bg-[#e11d48] text-white text-[9px] font-extrabold px-[6px] py-[2px] rounded-full">
                {disputeCount}
              </span>
            ) : (
              <span className={`w-[5px] h-[5px] rounded-full bg-[#10b981] ml-auto shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentView?: ViewType
  setCurrentView?: (view: ViewType) => void
  userName?: string
  userEmail?: string
  userSafetag?: string
  userAvatarUrl?: string | null
  disputeCount?: number
}

export function AppSidebar({ currentView: propCurrentView, setCurrentView: propSetCurrentView, userName, userEmail, userSafetag, userAvatarUrl, disputeCount, ...props }: AppSidebarProps) {
  const [internalView, setInternalView] = React.useState<ViewType>('dashboard')
  const currentView = propCurrentView ?? internalView
  const setCurrentView = propSetCurrentView ?? setInternalView
  const user = {
    name: userName || "User",
    email: userEmail || "user@safeeely.com",
    safetag: userSafetag || "",
    avatar: userAvatarUrl,
  }

  return (
    <Sidebar
      className="border-none bg-white text-[#0f172a]"
      {...props}
    >
      <SidebarHeader className="!bg-transparent border-none border-b border-[#f1f5f9] px-[18px] pt-[22px] pb-[18px]">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center cursor-pointer" onClick={() => setCurrentView("dashboard")}>
              <img src="/logo-main.svg" alt="Safeeely" className="h-6 w-auto" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="!bg-transparent border-none px-[10px] py-3 gap-px">
        <NavSection label="Overview" items={overviewItems} currentView={currentView} setCurrentView={setCurrentView} disputeCount={disputeCount} />
        <NavSection label="Finance" items={financeItems} currentView={currentView} setCurrentView={setCurrentView} />
        <NavSection label="Account" items={accountItems} currentView={currentView} setCurrentView={setCurrentView} />
      </SidebarContent>
      <SidebarFooter className="!bg-transparent border-none border-t border-[#f1f5f9] px-[10px] pt-[10px] pb-[18px]">
        <NavUser user={user} onAccountClick={() => setCurrentView("profile")} />
      </SidebarFooter>
    </Sidebar>
  )
}
