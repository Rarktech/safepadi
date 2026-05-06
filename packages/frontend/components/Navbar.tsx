"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function Navbar() {
    const pathname = usePathname();
    const isMarketplace = pathname.startsWith('/marketplace');

    const navItems = [
        { label: "Product", href: "/marketplace?type=product" },
        { label: "Services", href: "/marketplace?type=services" },
        { label: "Jobs", href: "/marketplace/jobs" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6 bg-transparent">
            <div className="w-full max-w-7xl flex items-center justify-between px-6 py-3 rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <img src="/logo-main.svg" alt="Safeeely Logo" className="h-8 md:h-8 w-auto object-contain drop-shadow-sm" />
                </Link>

                {/* Center Navigation - Desktop (Only on Marketplace) */}
                {isMarketplace && (
                    <div className="hidden md:flex items-center gap-8 animate-in fade-in slide-in-from-top-2 duration-500">
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors tracking-tight"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 shrink-0">
                    <Link href="/pay">
                        <Button className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-6 font-bold shadow-lg shadow-slate-200 h-11">
                            Join for Free →
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
