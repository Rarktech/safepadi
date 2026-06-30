"use client";

import { Bell, Search } from "lucide-react";
import { useAdminUser } from "./AuthProvider";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  type: string;
}

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  notifications?: Notification[];
  onClearNotifications?: () => void;
}

export default function AdminHeader({
  title,
  subtitle,
  notifications = [],
  onClearNotifications,
}: AdminHeaderProps) {
  const { user } = useAdminUser();
  const [bellOpen, setBellOpen] = useState(false);
  const initial = (user?.name?.[0] ?? "A").toUpperCase();

  return (
    <header
      className="h-14 flex items-center justify-between px-7 sticky top-0 z-30 bg-white border-b border-[#e9eaec]"
      style={{ minHeight: 56 }}
    >
      {/* Left: title + subtitle */}
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
        <div>
          <p className="font-tight text-[15px] font-extrabold text-[#0f172a] leading-none">{title}</p>
          {subtitle && (
            <p className="text-[12px] text-[#94a3b8] leading-none mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: search + bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 pl-9 pr-10 text-[12.5px] font-medium text-[#0f172a] placeholder:text-[#b0bac6] rounded-[10px] outline-none transition-colors w-[200px]"
            style={{ background: "#f7f8f9", border: "1px solid #e9eaec" }}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#94a3b8] px-1 rounded"
            style={{ border: "1px solid #e9eaec", background: "#f1f5f9" }}
          >
            ⌘K
          </span>
        </div>

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setBellOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-[9px] text-[#64748b] hover:bg-[#f8f9fa] transition-colors relative"
            style={{ border: "1px solid #e9eaec" }}
          >
            <Bell className="w-4 h-4" strokeWidth={1.75} />
            {notifications.length > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#e11d48" }}
              />
            )}
          </button>

          {bellOpen && (
            <div
              className="absolute right-0 top-11 w-[330px] rounded-[18px] overflow-hidden z-50"
              style={{ background: "#fff", border: "1px solid #e9eaec", boxShadow: "0 16px 48px rgba(15,23,42,.12)" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9]">
                <p className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">Notifications</p>
                {notifications.length > 0 && onClearNotifications && (
                  <button
                    onClick={onClearNotifications}
                    className="text-[10px] font-semibold text-[#e11d48] hover:opacity-75"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto admin-area">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell className="w-5 h-5 text-[#cbd5e1] mb-2" />
                    <p className="text-[11px] text-[#94a3b8]">No new notifications</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa]">
                      <p className="text-[12px] font-semibold text-[#0f172a]">{n.title}</p>
                      <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-[#94a3b8] mt-1">
                        {formatDistanceToNow(n.time, { addSuffix: true })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin avatar pill */}
        <div
          className="flex items-center gap-2 px-2 py-1 rounded-[9px] cursor-default"
          style={{ background: "#f7f8f9", border: "1px solid #e9eaec" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
            style={{ background: "#0f172a", color: "#10b981" }}
          >
            {initial}
          </div>
          <span className="text-[12px] font-semibold text-[#0f172a] hidden sm:block pr-1">
            {user?.name ?? "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
}
