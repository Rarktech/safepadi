"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Repeat, 
    BarChart3, 
    Users, 
    CreditCard, 
    Settings, 
    HelpCircle, 
    Shield,
    Search,
    ChevronLeft,
    LogOut,
    Megaphone,
    Lock,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "/api";

const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { name: "Transactions", icon: Repeat, href: "/admin/transactions" },
    { name: "KYC Verification", icon: Shield, href: "/admin/kyc" },
    { name: "Customers", icon: Users, href: "/admin/customers" },
    { name: "Disputes", icon: Shield, href: "/admin/disputes" },
    { name: "Payouts", icon: CreditCard, href: "/admin/payouts" },
    { name: "Reports", icon: BarChart3, href: "/admin/reports" },
    { name: "Marketing", icon: Megaphone, href: "/admin/marketing" },
    { name: "Management", icon: Lock, href: "/admin/management" },
];

const secondaryItems = [
    { name: "Settings", icon: Settings, href: "/admin/settings" },
    { name: "Help Center", icon: HelpCircle, href: "/admin/help" },
];

import { useRouter } from "next/navigation";

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<"SUPER_ADMIN" | "DISPUTER">("SUPER_ADMIN");

    useEffect(() => {
        axios.get(`${API_URL}/admin/auth/me`, { withCredentials: true })
            .then(res => { if (res.data.role === "DISPUTER") setRole("DISPUTER"); })
            .catch(() => {});
    }, []);

    const handleLogout = async () => {
        await axios.post(`${API_URL}/admin/auth/logout`, {}, { withCredentials: true }).catch(() => {});
        router.push("/admin/login");
    };

    // RBAC Filter Logic
    const visibleMenuItems = menuItems.filter(item => {
        if (role === "SUPER_ADMIN") return true; // Super admin sees everything
        if (role === "DISPUTER") {
            // Disputers only see specific tabs
            return ["Transactions", "Customers", "Disputes"].includes(item.name);
        }
        return false;
    });

    const visibleSecondaryItems = secondaryItems.filter(item => role === "SUPER_ADMIN");

    return (
        <aside className="w-68 bg-gradient-to-b from-[#0a2d1d] to-[#05140b] flex flex-col h-screen sticky top-0 text-white overflow-hidden shadow-2xl z-50">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-2 mb-8">
                    <img src="/logo-main.svg" alt="Safeeely Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
                </div>
            </div>

            {/* Search */}
            <div className="px-6 mb-8">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search system..." 
                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-bold focus:bg-white/10 outline-none transition-all text-white placeholder:text-white/30"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                        <span className="text-[9px] font-black text-white/20">⌘ K</span>
                    </div>
                </div>
            </div>

            {/* Navigation Menus */}
            <div className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide">
                <nav className="space-y-1">
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Main Menu</p>
                    {visibleMenuItems.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link 
                                key={item.name} 
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group outline-none",
                                    active 
                                        ? "bg-white/15 text-white shadow-lg shadow-black/10 font-bold translate-x-1" 
                                        : "text-white/50 hover:bg-white/5 hover:text-white font-medium hover:translate-x-1"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 transition-transform duration-300", active ? "text-emerald-400 scale-110" : "text-white/30 group-hover:text-emerald-400 group-hover:scale-110")} />
                                <span className="text-sm tracking-tight">{item.name}</span>
                                {active && (
                                    <div className="ml-auto w-1 h-5 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {visibleSecondaryItems.length > 0 && (
                    <nav className="space-y-1">
                        <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">System</p>
                        {visibleSecondaryItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group outline-none",
                                        isActive 
                                            ? "bg-white/10 text-white translate-x-1" 
                                            : "text-white/60 hover:text-white hover:bg-white/5 hover:translate-x-1"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-transform duration-300",
                                        isActive ? "scale-110 text-emerald-400" : "group-hover:scale-110 group-hover:text-emerald-400"
                                    )} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 space-y-2 mt-auto">
                <div className="h-px bg-white/10 mb-4 mx-2" />
                {secondaryItems.map((item) => (
                    <Link 
                        key={item.name} 
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all group"
                    >
                        <item.icon className="w-5 h-5 text-white/20 group-hover:text-white" />
                        <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                    </Link>
                ))}
                
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
