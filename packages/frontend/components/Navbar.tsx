"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6 bg-transparent">
            <div className="w-full max-w-7xl flex items-center justify-between px-6 py-3 rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
                <Link href="/" className="flex items-center gap-2">
                    <img src="/sidebar-logo-black.png" alt="Safeeely Logo" className="h-10 md:h-12 w-auto object-contain drop-shadow-sm" />
                </Link>

                <div className="flex items-center gap-4">
                    <Link href="/pay">
                        <Button className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-6 shadow-lg shadow-slate-200">
                            Join for Free →
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
