"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Repeat, BarChart3, Users, CreditCard,
    Settings, HelpCircle, Shield, Search, LogOut, Megaphone,
    Lock, Server, TrendingUp, DollarSign, Star, Gift,
    ShoppingBag, MessageSquare, UserSearch, Activity, BookOpen,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_URL = "/api";

type NavItem = { name: string; icon: any; href: string };
type NavGroup = { label: string; items: NavItem[]; superAdminOnly?: boolean };

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Core Ops',
        items: [
            { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
            { name: 'Transactions', icon: Repeat, href: '/admin/transactions' },
            { name: 'Disputes', icon: Shield, href: '/admin/disputes' },
            { name: 'KYC Verification', icon: BookOpen, href: '/admin/kyc' },
            { name: 'Payouts', icon: CreditCard, href: '/admin/payouts' },
        ],
    },
    {
        label: 'People & Trust',
        superAdminOnly: true,
        items: [
            { name: 'Customers', icon: Users, href: '/admin/customers' },
            { name: 'Trust & Reputation', icon: Star, href: '/admin/trust' },
            { name: 'Review Moderation', icon: Star, href: '/admin/reviews' },
        ],
    },
    {
        label: 'Analytics & Finance',
        superAdminOnly: true,
        items: [
            { name: 'Analytics Hub', icon: TrendingUp, href: '/admin/analytics' },
            { name: 'Financial Deep-Dive', icon: DollarSign, href: '/admin/finance' },
            { name: 'User Segments', icon: UserSearch, href: '/admin/segments' },
        ],
    },
    {
        label: 'Growth',
        superAdminOnly: true,
        items: [
            { name: 'Referral Program', icon: Gift, href: '/admin/referrals' },
            { name: 'Marketing', icon: Megaphone, href: '/admin/marketing' },
        ],
    },
    {
        label: 'Marketplace',
        superAdminOnly: true,
        items: [
            { name: 'Marketplace', icon: ShoppingBag, href: '/admin/marketplace' },
        ],
    },
    {
        label: 'Compliance',
        items: [
            { name: 'Reports', icon: BarChart3, href: '/admin/reports' },
        ],
    },
    {
        label: 'Communications',
        superAdminOnly: true,
        items: [
            { name: 'Notifications', icon: MessageSquare, href: '/admin/communications' },
        ],
    },
    {
        label: 'System',
        superAdminOnly: true,
        items: [
            { name: 'System Health', icon: Server, href: '/admin/system' },
            { name: 'Management', icon: Lock, href: '/admin/management' },
        ],
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<"SUPER_ADMIN" | "DISPUTER">("SUPER_ADMIN");
    const [unassignedCount, setUnassignedCount] = useState(0);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    useEffect(() => {
        axios.get(`${API_URL}/admin/auth/me`, { withCredentials: true })
            .then(res => { if (res.data.role === "DISPUTER") setRole("DISPUTER"); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchUnassigned = () => {
            axios.get(`${API_URL}/admin/disputes/unassigned`, { withCredentials: true })
                .then(res => setUnassignedCount(Array.isArray(res.data) ? res.data.length : 0))
                .catch(() => {});
        };
        fetchUnassigned();
        const interval = setInterval(fetchUnassigned, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        await axios.post(`${API_URL}/admin/auth/logout`, {}, { withCredentials: true }).catch(() => {});
        router.push("/admin/login");
    };

    const toggleGroup = (label: string) => {
        setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const DISPUTER_ALLOWED = new Set(['Dashboard', 'Transactions', 'Customers', 'Disputes', 'KYC Verification', 'Payouts']);

    const visibleGroups = NAV_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(item => {
            if (role === 'SUPER_ADMIN') return true;
            return DISPUTER_ALLOWED.has(item.name);
        }),
    })).filter(group => group.items.length > 0 && !(group.superAdminOnly && role !== 'SUPER_ADMIN'));

    return (
        <aside className="w-68 bg-gradient-to-b from-[#0a2d1d] to-[#05140b] flex flex-col h-screen sticky top-0 text-white overflow-hidden shadow-2xl z-50">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-2 mb-8">
                    <img src="/logo-main.svg" alt="Safeeely Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
                </div>
            </div>

            {/* Search */}
            <div className="px-6 mb-6">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search system..."
                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-bold focus:bg-white/10 outline-none transition-all text-white placeholder:text-white/30"
                    />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 overflow-y-auto scrollbar-hide space-y-2">
                {visibleGroups.map(group => {
                    const isCollapsed = collapsed[group.label];
                    return (
                        <div key={group.label}>
                            <button
                                onClick={() => toggleGroup(group.label)}
                                className="w-full flex items-center justify-between px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/25 hover:text-white/40 transition-colors"
                            >
                                {group.label}
                                <ChevronDown className={cn("w-3 h-3 transition-transform", isCollapsed ? "-rotate-90" : "")} />
                            </button>

                            {!isCollapsed && (
                                <nav className="space-y-0.5">
                                    {group.items.map(item => {
                                        const active = pathname === item.href || pathname.startsWith(item.href + '/');
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group outline-none",
                                                    active
                                                        ? "bg-white/15 text-white shadow-lg shadow-black/10 font-bold translate-x-1"
                                                        : "text-white/50 hover:bg-white/5 hover:text-white font-medium hover:translate-x-1"
                                                )}
                                            >
                                                <item.icon className={cn("w-4 h-4 transition-transform duration-300 shrink-0",
                                                    active ? "text-emerald-400 scale-110" : "text-white/30 group-hover:text-emerald-400 group-hover:scale-110"
                                                )} />
                                                <span className="text-sm tracking-tight truncate">{item.name}</span>
                                                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                                    {item.name === 'Disputes' && unassignedCount > 0 && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full min-w-[18px] text-center leading-tight">
                                                            {unassignedCount > 99 ? '99+' : unassignedCount}
                                                        </span>
                                                    )}
                                                    {active && <div className="w-1 h-5 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]" />}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-6 space-y-2 mt-auto">
                <div className="h-px bg-white/10 mb-4 mx-2" />
                {role === 'SUPER_ADMIN' && (
                    <Link href="/admin/settings"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all group">
                        <Settings className="w-5 h-5 text-white/20 group-hover:text-white" />
                        <span className="text-sm font-semibold tracking-tight">Settings</span>
                    </Link>
                )}
                <Link href="/admin/help"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all group">
                    <HelpCircle className="w-5 h-5 text-white/20 group-hover:text-white" />
                    <span className="text-sm font-semibold tracking-tight">Help Center</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex text-left items-center gap-3 px-4 py-3 rounded-xl text-rose-300/60 hover:bg-rose-500/10 hover:text-rose-400 transition-all group"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-semibold tracking-tight">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
