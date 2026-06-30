"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import posthog from "posthog-js";

const API_URL = "/api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "DISPUTER";
}

interface AdminContextValue {
  user: AdminUser | null;
  isAuthorized: boolean;
}

export const AdminContext = createContext<AdminContextValue>({ user: null, isAuthorized: false });
export const useAdminUser = () => useContext(AdminContext);

export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    axios.defaults.withCredentials = true;
    const isLoginPage = pathname === "/admin/login";

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sf_admin_token') : null;
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }

    axios.get(`${API_URL}/admin/auth/me`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then((res) => {
        if (res.data?.id) {
          posthog.identify(res.data.id, { role: 'admin' });
          setUser({ id: res.data.id, name: res.data.name, email: res.data.email, role: res.data.role });
        }
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
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest">Authenticating</p>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ user, isAuthorized }}>
      {children}
    </AdminContext.Provider>
  );
}
