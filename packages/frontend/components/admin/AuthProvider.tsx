"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";

const API_URL = "/api";

export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        axios.defaults.withCredentials = true;
        const isLoginPage = pathname === "/admin/login";

        axios.get(`${API_URL}/admin/auth/me`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(() => {
                if (isLoginPage) router.replace("/admin/dashboard");
                setIsAuthorized(true);
            })
            .catch(() => {
                if (!isLoginPage) router.replace("/admin/login");
                else setIsAuthorized(true);
            });
    }, [pathname, router]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Authenticating Node</p>
            </div>
        );
    }

    return <>{children}</>;
}
