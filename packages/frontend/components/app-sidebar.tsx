"use client"

import * as React from "react"
import {
  Activity,
  ArrowRightLeft,
  Home,
  LogOut,
  Send,
  Settings,
  Wallet,
  Users,
  ShoppingBag
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "User",
    email: "user@safeeely.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: Home,
      isActive: true,
    },
    {
      title: "Marketplace",
      url: "/marketplace",
      icon: ShoppingBag,
    },
    {
      title: "My Transactions",
      url: "#",
      icon: Activity,
    },
    {
      title: "Wallet",
      url: "#",
      icon: Wallet,
    },
    {
      title: "Withdraw",
      url: "#",
      icon: Send,
    },
    {
      title: "Exchange",
      url: "#",
      icon: ArrowRightLeft,
    },
    {
      title: "Referrals",
      url: "#",
      icon: Users,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentView?: 'dashboard' | 'transactions' | 'withdraw' | 'referrals' | 'dispute_details' | 'marketplace'
  setCurrentView?: (view: 'dashboard' | 'transactions' | 'withdraw' | 'referrals' | 'dispute_details' | 'marketplace') => void
  userName?: string
  userEmail?: string
}

export function AppSidebar({ currentView: propCurrentView, setCurrentView: propSetCurrentView, userName, userEmail, ...props }: AppSidebarProps) {
  const [internalView, setInternalView] = React.useState<'dashboard' | 'transactions' | 'withdraw' | 'referrals' | 'dispute_details' | 'marketplace'>('dashboard');

  const currentView = propCurrentView || internalView;
  const setCurrentView = propSetCurrentView || setInternalView;

  const user = {
    name: userName || data.user.name,
    email: userEmail || data.user.email,
    avatar: data.user.avatar,
  }

  const navItems = data.navMain.map(item => ({
    ...item,
    isActive: (item.title === 'Dashboard' && currentView === 'dashboard') ||
      (item.title === 'My Transactions' && currentView === 'transactions') ||
      (item.title === 'Withdraw' && currentView === 'withdraw') ||
      (item.title === 'Referrals' && currentView === 'referrals') ||
      (item.title === 'Marketplace' && currentView === 'marketplace')
  }))

  const handleNavClick = (title: string) => {
    if (title === 'Dashboard') setCurrentView('dashboard')
    if (title === 'My Transactions') setCurrentView('transactions')
    if (title === 'Withdraw') setCurrentView('withdraw')
    if (title === 'Referrals') setCurrentView('referrals')
    if (title === 'Marketplace') setCurrentView('marketplace')
  }

  return (
    <Sidebar
      style={{ "--sidebar-background": "transparent" } as React.CSSProperties}
      className="border-none bg-gradient-to-b from-[#0a2d1d] to-[#05140b] text-white"
      {...props}
    >
      <SidebarHeader className="!bg-transparent border-none">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-0 py-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
              <img src="/logo-main.svg" alt="Safeeely Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="!bg-transparent border-none">
        <SidebarGroup className="!bg-transparent">
          <SidebarMenu className="!bg-transparent">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title} className="!bg-transparent">
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.isActive}
                  onClick={() => handleNavClick(item.title)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${item.isActive ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                >
                  {item.icon && <item.icon className={`size-5 ${item.isActive ? 'text-white' : ''}`} />}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="!bg-transparent border-none">
        <div className="h-px bg-white/10 my-4 mx-2" />
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

function SidebarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-2 p-2 ${className}`}>{children}</div>
}
