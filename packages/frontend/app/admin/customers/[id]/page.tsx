"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, Mail, Phone, Calendar, User, Shield, CreditCard,
  Clock, CheckCircle2, XCircle, ChevronRight, FileText,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

export default function CustomerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "withdrawals" | "account">("payments");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, txnsRes, withRes] = await Promise.all([
          axios.get(`${API_URL}/admin/customers/${id}`, { headers: H }),
          axios.get(`${API_URL}/admin/customers/${id}/transactions`, { headers: H }),
          axios.get(`${API_URL}/admin/customers/${id}/withdrawals`, { headers: H }),
        ]);
        setCustomer(profileRes.data);
        setTransactions(txnsRes.data);
        setWithdrawals(withRes.data);
      } catch (err: any) {
        console.error("Failed to fetch customer data:", err);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const handleBlockToggle = async () => {
    setIsBlocking(true);
    try {
      const endpoint = customer.status === "Blocked" ? "unblock" : "block";
      await axios.post(`${API_URL}/admin/customers/${customer.id}/${endpoint}`, {}, { headers: H });
      setCustomer({ ...customer, status: customer.status === "Blocked" ? "Active" : "Blocked" });
      showToast(`Account successfully ${customer.status === "Blocked" ? "unblocked" : "disabled"}`);
    } catch { showToast("Failed to update account status", "error"); }
    finally { setIsBlocking(false); }
  };

  if (loading) {
    return (
      <AdminShell title="Customer Profile" subtitle="Loading…">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!customer) {
    return (
      <AdminShell title="Customer Profile" subtitle="Not found">
        <div className="flex flex-col items-center justify-center h-64">
          <XCircle className="w-10 h-10 text-[#e11d48] mb-4" />
          <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-4">Customer not found.</p>
          <button onClick={() => router.push("/admin/customers")}
            className="text-[12px] font-semibold text-[#059669] hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
          </button>
        </div>
      </AdminShell>
    );
  }

  /* Trust Score gauge */
  const totalTxns = customer.stats?.total_transactions || 0;
  const completed = customer.stats?.completed || 0;
  const disputed = customer.stats?.disputed || 0;
  const rawScore = totalTxns > 0 ? Math.max(0, ((completed - disputed) / totalTxns) * 100) : 100;
  const boundedScore = Math.max(0, Math.min(100, rawScore));
  const displayScore = Math.round(300 + (boundedScore / 100) * 600);
  const numTicks = 41;
  const ticks = Array.from({ length: numTicks }).map((_, i) => {
    const pct = (i / (numTicks - 1)) * 100;
    let color = '#22c55e';
    if (pct <= 25) color = '#ef4444'; else if (pct <= 50) color = '#f97316'; else if (pct <= 75) color = '#3b82f6';
    const angle = Math.PI - (i / (numTicks - 1)) * Math.PI;
    return { x1: 100 + 75 * Math.cos(angle), y1: 100 - 75 * Math.sin(angle), x2: 100 + 90 * Math.cos(angle), y2: 100 - 90 * Math.sin(angle), color };
  });
  const scoreAngle = Math.PI - (boundedScore / 100) * Math.PI;
  const needleX1 = 100 + 55 * Math.cos(scoreAngle), needleY1 = 100 - 55 * Math.sin(scoreAngle);
  const needleX2 = 100 + 110 * Math.cos(scoreAngle), needleY2 = 100 - 110 * Math.sin(scoreAngle);
  let badgeText = "Excellent", badgeColor = "#22c55e", badgeBg = "#ecfdf5";
  if (displayScore < 500) { badgeText = "Poor"; badgeColor = "#ef4444"; badgeBg = "#fef2f2"; }
  else if (displayScore < 650) { badgeText = "Fair"; badgeColor = "#f97316"; badgeBg = "#fff7ed"; }
  else if (displayScore < 750) { badgeText = "Good"; badgeColor = "#3b82f6"; badgeBg = "#eff6ff"; }

  const statusChip = (s: string) => {
    const map: Record<string, string> = { SUCCESS: 'chip-green', PENDING: 'chip-amber', FAILED: 'chip-red', CANCELLED: 'chip-slate' };
    return <span className={`adm-chip ${map[s] || 'chip-slate'}`}>{s}</span>;
  };

  return (
    <AdminShell title={`${customer.first_name} ${customer.last_name}`} subtitle={`Safetag: ${customer.safetag || '—'}`}>
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <button onClick={() => router.push("/admin/customers")} className="text-[#94a3b8] hover:text-[#0f172a] transition-colors">Customers</button>
        <ChevronRight className="w-3.5 h-3.5 text-[#cbd5e1]" />
        <span className="text-[#0f172a]">{customer.first_name} {customer.last_name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar — profile info */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-[#e9eaec] mb-3">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.safetag}&backgroundColor=f1f5f9`} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="font-tight text-[15px] font-bold text-[#0f172a]">{customer.first_name} {customer.last_name}</p>
              <p className="text-[12px] font-semibold text-[#10b981]">{customer.safetag}</p>
              {customer.kyc_status === 'VERIFIED' && (
                <span className="mt-2 adm-chip chip-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>
              )}
            </div>
            <div className="space-y-3">
              {[
                { icon: Clock, label: "Customer since", value: new Date(customer.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }) },
                { icon: Mail, label: "Email", value: customer.email },
                { icon: Phone, label: "Phone", value: customer.phone || "—" },
                { icon: User, label: "Platform", value: customer.primary_platform || "—" },
              ].map(f => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#f1f5f9] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#64748b]" />
                    </div>
                    <div className="min-w-0">
                      <p className="adm-section-label">{f.label}</p>
                      <p className="text-[12px] font-semibold text-[#0f172a] truncate">{f.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <p className="adm-section-label mb-4">Stats</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Txns", value: totalTxns },
                { label: "Completed", value: completed },
                { label: "Disputed", value: disputed },
                { label: "Referrals", value: customer.stats?.referral_count || 0 },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#f7f8f9' }}>
                  <p className="font-tight text-[16px] font-bold text-[#0f172a]">{s.value}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabs + content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1 w-fit">
            {(['payments', 'withdrawals', 'account'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all"
                style={activeTab === tab ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
                {tab}
              </button>
            ))}
          </div>

          {/* PAYMENTS */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
              <div className="grid grid-cols-2 gap-4 p-5 border-b border-[#f3f4f6]">
                <div>
                  <p className="adm-section-label mb-1">Total Payments</p>
                  <p className="font-tight text-xl font-bold text-[#0f172a]">{transactions.length}</p>
                </div>
                <div>
                  <p className="adm-section-label mb-1">Total Amount Paid</p>
                  <p className="font-tight text-xl font-bold text-[#0f172a]">₦{(customer.stats?.total_spent || 0).toLocaleString()}</p>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    {['Date', 'Type', 'Counterparty', 'Amount'].map(h => (
                      <th key={h} className={`px-5 py-3 adm-section-label ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? transactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-3.5 text-[12px] font-medium text-[#64748b]">
                        {new Date(tx.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#f1f5f9] flex items-center justify-center">
                            {tx.buyer_id === id ? <CreditCard className="w-3.5 h-3.5 text-[#64748b]" /> : <Shield className="w-3.5 h-3.5 text-[#64748b]" />}
                          </div>
                          <span className="text-[12px] font-semibold text-[#64748b]">
                            {tx.buyer_id === id ? "Payment Made" : "Payment Received"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-medium text-[#64748b]">
                        {tx.buyer_id === id ? (tx.seller?.safetag || "—") : (tx.buyer?.safetag || "—")}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-[12px] font-bold" style={{ color: tx.buyer_id === id ? '#e11d48' : '#10b981' }}>
                          {tx.buyer_id === id ? "−" : "+"}{tx.currency === "NGN" ? "₦" : "$"}{Number(tx.amount).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-5 py-16 text-center text-[12px] font-bold text-[#94a3b8]">No transactions recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* WITHDRAWALS */}
          {activeTab === "withdrawals" && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
              <div className="grid grid-cols-2 gap-4 p-5 border-b border-[#f3f4f6]">
                <div>
                  <p className="adm-section-label mb-1">Total Withdrawals</p>
                  <p className="font-tight text-xl font-bold text-[#0f172a]">{withdrawals.length}</p>
                </div>
                <div>
                  <p className="adm-section-label mb-1">Total Withdrawn</p>
                  <p className="font-tight text-xl font-bold text-[#0f172a]">₦{withdrawals.reduce((s, w) => s + Number(w.amount), 0).toLocaleString()}</p>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    {['Date', 'Reference', 'Status', 'Amount'].map(h => (
                      <th key={h} className={`px-5 py-3 adm-section-label ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length > 0 ? withdrawals.map((w: any) => (
                    <tr key={w.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-3.5 text-[12px] font-medium text-[#64748b]">
                        {new Date(w.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] font-bold text-[#94a3b8]">{w.reference}</td>
                      <td className="px-5 py-3.5">{statusChip(w.status)}</td>
                      <td className="px-5 py-3.5 text-right font-tight text-[13px] font-bold text-[#0f172a]">
                        ₦{Number(w.amount).toLocaleString()}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-5 py-16 text-center text-[12px] font-bold text-[#94a3b8]">No withdrawal history</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ACCOUNT */}
          {activeTab === "account" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trust Score card */}
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-4">Trust Score</p>
                <div className="relative w-full max-w-[260px] mx-auto" style={{ aspectRatio: '1.8/1' }}>
                  <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                    <path d="M 40 100 A 60 60 0 0 1 160 100" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 6" />
                    {ticks.map((tick, i) => (
                      <line key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke={tick.color} strokeWidth="2.5" strokeLinecap="round" />
                    ))}
                    <text x="35" y="118" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="700">300</text>
                    <text x="100" y="32" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="700">600</text>
                    <text x="165" y="118" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="700">900</text>
                    <line x1={needleX1} y1={needleY1} x2={needleX2} y2={needleY2} stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                    <circle cx={needleX2} cy={needleY2} r="4.5" fill="white" stroke="#0f172a" strokeWidth="3" />
                  </svg>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="font-tight text-[42px] font-black text-[#0f172a] leading-none">{displayScore}</span>
                    <span className="mt-1 text-[12px] font-bold px-3 py-0.5 rounded-xl" style={{ color: badgeColor, background: badgeBg }}>{badgeText}</span>
                  </div>
                </div>
                <div className="mt-5 rounded-xl p-3 text-center" style={{ background: '#0f172a' }}>
                  <span className="text-[11px] font-bold text-[#64748b]">Total Volume </span>
                  <span className="text-[13px] font-black text-[#10b981]">₦{(customer.stats?.total_spent || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Account details */}
              <div className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <p className="font-tight text-[14px] font-bold text-[#0f172a]">Account Details</p>
                  {/* Balances */}
                  <div className="rounded-xl p-4 space-y-3" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
                    <p className="adm-section-label">Available Balances</p>
                    <div className="flex flex-wrap gap-2">
                      {customer.stats?.balances?.length > 0 ? customer.stats.balances.map((b: any) => (
                        <div key={b.currency} className="bg-white border border-[#e9eaec] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <span className="text-[10px] font-black text-[#94a3b8]">{b.currency}</span>
                          <span className="text-[12px] font-black text-[#059669]">{b.currency === 'NGN' ? '₦' : '$'}{b.amount?.toLocaleString()}</span>
                        </div>
                      )) : <span className="text-[11px] font-bold text-[#94a3b8]">No active balance</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Referrals Made", value: customer.stats?.referral_count || 0 },
                      { label: "Referral Earnings", value: `₦${(customer.stats?.referral_earned || 0).toLocaleString()}` },
                      { label: "Completed / Disputed", value: `${completed} / ${disputed}` },
                      { label: "Total Transactions", value: totalTxns },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="adm-section-label mb-1">{s.label}</p>
                        <p className="text-[13px] font-bold text-[#0f172a]">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-[#f3f4f6]">
                  <button onClick={handleBlockToggle} disabled={isBlocking}
                    className="w-full h-11 rounded-xl text-[13px] font-bold transition-all disabled:opacity-60"
                    style={{
                      border: '1px solid',
                      borderColor: customer.status === "Blocked" ? '#bbf7d0' : '#fecdd3',
                      color: customer.status === "Blocked" ? '#059669' : '#e11d48',
                      background: customer.status === "Blocked" ? '#f0fdf4' : '#fff1f2',
                    }}>
                    {isBlocking ? "Processing…" : customer.status === "Blocked" ? "Unblock Account" : "Disable Account"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
