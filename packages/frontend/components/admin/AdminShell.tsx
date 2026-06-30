"use client";

import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  type: string;
}

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Notification) => {
    setNotifications(prev => [n, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    const txnChannel = supabase.channel("shell-tx-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, payload => {
        const tx = payload.new as any;
        addNotification({
          id: `tx-${tx.id}-${Date.now()}`,
          type: "transaction",
          title: "Transaction Initiated",
          message: `Order #${tx.txn_code} created — ${tx.currency}${tx.total_amount} in escrow`,
          time: new Date(),
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transactions" }, payload => {
        const tx = payload.new as any;
        if (tx.status === "PAID") {
          addNotification({
            id: `tx-paid-${tx.id}-${Date.now()}`,
            type: "payment",
            title: "Payment Received",
            message: `Order #${tx.txn_code} funded — escrow now active`,
            time: new Date(),
          });
        } else if (tx.status === "DISPUTED") {
          addNotification({
            id: `tx-disp-${tx.id}-${Date.now()}`,
            type: "dispute",
            title: "Dispute Opened",
            message: `Order #${tx.txn_code} entered dispute mode`,
            time: new Date(),
          });
        }
      })
      .subscribe();

    const disputeChannel = supabase.channel("shell-disputes-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "disputes" }, payload => {
        const d = payload.new as any;
        addNotification({
          id: `ds-${d.id}-${Date.now()}`,
          type: "dispute",
          title: "Dispute Raised",
          message: d.reason?.substring(0, 80) ?? "New dispute opened",
          time: new Date(),
        });
      })
      .subscribe();

    const withdrawalChannel = supabase.channel("shell-payouts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, payload => {
        const w = payload.new as any;
        addNotification({
          id: `wd-${w.id}-${Date.now()}`,
          type: "payout",
          title: "Payout Requested",
          message: `Withdrawal of ${w.currency}${w.amount} (ref: ${w.reference})`,
          time: new Date(),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txnChannel);
      supabase.removeChannel(disputeChannel);
      supabase.removeChannel(withdrawalChannel);
    };
  }, [addNotification]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] admin-area">
      <AdminSidebar />
      <div className="ml-[238px] flex flex-col min-h-screen">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
        />
        <main className="flex-1 p-7 pb-20">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-[18px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
