"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";

const API_URL = "/api";

export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        axios.defaults.withCredentials = true;
        const isLoginPage = pathname === "/admin/login";

        // Inject stored JWT as Bearer header so auth works across Railway domain split
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sf_admin_token') : null;
        if (storedToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }

        axios.get(`${API_URL}/admin/auth/me`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => {
                if (res.data?.id) posthog.identify(res.data.id, { role: 'admin' });
                if (isLoginPage) router.replace("/admin/dashboard");
                setIsAuthorized(true);
            })
            .catch(() => {
                localStorage.removeItem('sf_admin_token');
                delete axios.defaults.headers.common['Authorization'];
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
