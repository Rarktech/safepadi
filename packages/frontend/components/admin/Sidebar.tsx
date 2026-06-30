"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, DollarSign,
  Users, BookOpen, Star, MessageSquare, UserSearch,
  Repeat, Shield, CreditCard,
  ShoppingBag, Gift, Megaphone, Bell,
  Settings, Lock, Server, FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAdminUser } from "./AuthProvider";

const API_URL = "/api";

type NavItem = { name: string; icon: any; href: string; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard",         icon: LayoutDashboard, href: "/admin/dashboard" },
      { name: "Analytics Hub",     icon: TrendingUp,      href: "/admin/analytics" },
      { name: "Financial Dive",    icon: DollarSign,      href: "/admin/finance" },
    ],
  },
  {
    label: "Users",
    items: [
      { name: "Customers",          icon: Users,       href: "/admin/customers" },
      { name: "KYC Verification",   icon: BookOpen,    href: "/admin/kyc",     badge: "kyc" },
      { name: "Trust & Reputation", icon: Star,        href: "/admin/trust" },
      { name: "Review Moderation",  icon: MessageSquare, href: "/admin/reviews" },
      { name: "User Segments",      icon: UserSearch,  href: "/admin/segments" },
    ],
  },
  {
    label: "Transactions",
    items: [
      { name: "Transactions", icon: Repeat,     href: "/admin/transactions" },
      { name: "Disputes",     icon: Shield,     href: "/admin/disputes",    badge: "disputes" },
      { name: "Payouts",      icon: CreditCard, href: "/admin/payouts" },
    ],
  },
  {
    label: "Platform",
    items: [
      { name: "Marketplace",    icon: ShoppingBag, href: "/admin/marketplace" },
      { name: "Referrals",      icon: Gift,        href: "/admin/referrals" },
      { name: "Marketing",      icon: Megaphone,   href: "/admin/marketing" },
      { name: "Notifications",  icon: Bell,        href: "/admin/communications" },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "Settings",     icon: Settings, href: "/admin/settings" },
      { name: "Management",   icon: Lock,     href: "/admin/management" },
      { name: "System Health",icon: Server,   href: "/admin/system" },
      { name: "Reports",      icon: FileText, href: "/admin/reports" },
    ],
  },
];

const DISPUTER_ALLOWED = new Set([
  "Dashboard", "Transactions", "Customers", "Disputes", "KYC Verification", "Payouts",
]);

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAdminUser();
  const role = user?.role ?? "SUPER_ADMIN";

  const [unassignedCount, setUnassignedCount] = useState(0);
  const [pendingKyc, setPendingKyc] = useState(0);

  useEffect(() => {
    const fetchBadges = () => {
      axios.get(`${API_URL}/admin/disputes/unassigned`, { withCredentials: true })
        .then(res => setUnassignedCount(Array.isArray(res.data) ? res.data.length : 0))
        .catch(() => {});
      axios.get(`${API_URL}/admin/kyc`, { withCredentials: true })
        .then(res => {
          const list: any[] = Array.isArray(res.data) ? res.data : (res.data?.submissions ?? []);
          setPendingKyc(list.filter((k: any) => k.status === "PENDING").length);
        })
        .catch(() => {});
    };
    fetchBadges();
    const iv = setInterval(fetchBadges, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => {
    await axios.post(`${API_URL}/admin/auth/logout`, {}, { withCredentials: true }).catch(() => {});
    localStorage.removeItem("sf_admin_token");
    delete axios.defaults.headers.common["Authorization"];
    router.push("/admin/login");
  };

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      role === "SUPER_ADMIN" ? true : DISPUTER_ALLOWED.has(item.name)
    ),
  })).filter(g => g.items.length > 0);

  const initial = (user?.name?.[0] ?? "A").toUpperCase();

  return (
    <aside className="w-[238px] bg-white border-r border-[#e9eaec] flex flex-col h-screen fixed top-0 left-0 z-40 overflow-hidden">

      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-[#f1f5f9] flex items-center gap-3">
        <img src="/logo-main.svg" alt="Safeeely" className="h-8 w-auto" />
        <span
          className="text-[9.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: "#ecfdf5", color: "#059669", letterSpacing: "0.08em" }}
        >
          Admin · v2.0
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto admin-area px-2 py-2.5 flex flex-col gap-0.5">
        {visibleGroups.map(group => (
          <div key={group.label} className="mb-1">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#cbd5e1]">
              {group.label}
            </p>
            {group.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const badgeCount =
                item.badge === "disputes" ? unassignedCount :
                item.badge === "kyc" ? pendingKyc : 0;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-[9px] rounded-[9px] text-[13.5px] font-medium transition-colors relative",
                    active
                      ? "bg-[#f0fdf4] text-[#059669] font-semibold"
                      : "text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#0f172a]"
                  )}
                >
                  <item.icon
                    className={cn("w-[15px] h-[15px] shrink-0", active ? "text-[#059669]" : "text-[#94a3b8]")}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {badgeCount > 0 && (
                      <span
                        className="text-[9px] font-black text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center"
                        style={{ background: item.badge === "kyc" ? "#f59e0b" : "#e11d48" }}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                    {active && (
                      <span className="w-[5px] h-[5px] rounded-full bg-[#10b981] shrink-0" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#f1f5f9] px-2 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] font-medium text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#0f172a] transition-colors"
        >
          <LogOut className="w-[15px] h-[15px] text-[#94a3b8]" strokeWidth={1.75} />
          <span>Log Out</span>
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-black"
            style={{ background: "#0f172a", color: "#10b981" }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-[#0f172a] truncate">{user?.name ?? "Admin"}</p>
            <p className="text-[10px] font-semibold text-[#10b981]">
              {role === "SUPER_ADMIN" ? "Super Admin" : "Disputer"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
