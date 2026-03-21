"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
    ArrowLeft,
    MoreHorizontal,
    Mail,
    Phone,
    MapPin,
    Calendar,
    User,
    Shield,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Copy,
    ExternalLink,
    ChevronRight,
    Search,
    Download,
    FileText,
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

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
                    axios.get(`${API_URL}/admin/customers/${id}`, {
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    }),
                    axios.get(`${API_URL}/admin/customers/${id}/transactions`, {
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    }),
                    axios.get(`${API_URL}/admin/customers/${id}/withdrawals`, {
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    })
                ]);
                setCustomer(profileRes.data);
                setTransactions(txnsRes.data);
                setWithdrawals(withRes.data);
            } catch (err: any) {
                console.error("Failed to fetch customer data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBlockToggle = async () => {
        setIsBlocking(true);
        try {
            const endpoint = customer.status === "Blocked" ? "unblock" : "block";
            await axios.post(`${API_URL}/admin/customers/${customer.id}/${endpoint}`);
            setCustomer({ ...customer, status: customer.status === "Blocked" ? "Active" : "Blocked" });
            showToast(`Account successfully ${customer.status === "Blocked" ? "unblocked" : "disabled"}`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to update account status", "error");
        } finally {
            setIsBlocking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
                <AdminSidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex bg-[#F8FAFC] min-h-screen">
                <AdminSidebar />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <XCircle className="w-12 h-12 text-rose-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900">Customer not found</h2>
                    <Button variant="ghost" className="mt-4" onClick={() => router.push("/admin/customers")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
            <AdminSidebar />

            <main className="flex-1 overflow-y-auto px-10 py-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[13px] font-medium text-slate-400 mb-6">
                    <button onClick={() => router.push("/admin/customers")} className="hover:text-slate-900 transition-colors">Customers</button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-slate-900">{customer.first_name} {customer.last_name}</span>
                </div>

                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">{customer.first_name} {customer.last_name}</h1>
                        {customer.kyc_status === 'VERIFIED' && (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider self-center transition-all hover:bg-emerald-100 shadow-sm shadow-emerald-50">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 font-semibold h-11 px-6 hover:bg-slate-50">
                            Send Email
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-11 h-11 rounded-xl border-slate-200 p-0 text-slate-600">
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl p-2 w-48">
                                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700">Edit Information</DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600">Delete customer</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Left Column - User Details */}
                    <div className="w-full lg:w-[380px] space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Customer details</h3>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                </Button>
                            </div>

                            <div className="space-y-6">
                                <DetailItem icon={Clock} label="Customer since" value={new Date(customer.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })} />
                                <DetailItem icon={User} label="Customer ID" value={customer.id.split("-").pop().toUpperCase()} hasCheck />
                                <DetailItem icon={Shield} label="Customer type" value="Individual" />
                                <DetailItem icon={Mail} label="Email address" value={customer.email} />
                                <DetailItem icon={Phone} label="Mobile number" value={customer.phone || "+234 812 456 9898"} />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Address</h3>
                            <div className="space-y-8">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Billing Address</p>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                        Vision Plaza, 2nd Flr Mombasa Rd, Nairobi, 20100<br />
                                        Kenya<br />
                                        +254-20828224
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Shipping Details</p>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                        Vision Plaza, 2nd Flr Mombasa Rd, Nairobi, 20100<br />
                                        Kenya<br />
                                        +254-20828224
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Tabs & Content */}
                    <div className="flex-1 min-w-0">
                        {/* Tabs */}
                        <div className="flex items-center gap-8 border-b border-slate-100 mb-8">
                            <TabButton active={activeTab === "payments"} onClick={() => setActiveTab("payments")}>Payments</TabButton>
                            <TabButton active={activeTab === "withdrawals"} onClick={() => setActiveTab("withdrawals")}>Withdrawals</TabButton>
                            <TabButton active={activeTab === "account"} onClick={() => setActiveTab("account")}>Account</TabButton>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="bg-white rounded-[24px] p-8 border border-slate-100/50 shadow-sm ring-1 ring-slate-100">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    {activeTab === "withdrawals" ? withdrawals.length : transactions.length}
                                </p>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    {activeTab === "withdrawals" ? "Total Withdrawals" : "Total Payments"}
                                </p>
                            </div>
                            <div className="bg-white rounded-[24px] p-8 border border-slate-100/50 shadow-sm ring-1 ring-slate-100 text-right">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    ₦ {
                                        activeTab === "withdrawals" 
                                        ? withdrawals.reduce((s, w) => s + Number(w.amount), 0).toLocaleString()
                                        : customer.stats?.total_spent?.toLocaleString() || "0.00"
                                    }
                                </p>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    {activeTab === "withdrawals" ? "Total Withdrawn" : "Total Amount Paid"}
                                </p>
                            </div>
                        </div>

                        {activeTab === "payments" && (
                            <div className="bg-white rounded-[32px] border border-slate-100/50 shadow-sm overflow-hidden ring-1 ring-slate-100">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-50">
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Recipient</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {transactions.length > 0 ? (
                                            transactions.map((tx: any) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="text-sm font-medium text-slate-600">
                                                            {new Date(tx.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}, {new Date(tx.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent">
                                                                {tx.buyer_id === id ? <CreditCard className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-600">
                                                                {tx.buyer_id === id ? "Payment Made" : "Payment Received"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="text-sm font-medium text-slate-600">
                                                            {tx.buyer_id === id ? (tx.seller?.safetag || "Merchant") : (tx.buyer?.safetag || "Customer")}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className={cn(
                                                            "text-sm font-bold tracking-tight",
                                                            tx.buyer_id === id ? "text-rose-500" : "text-emerald-500"
                                                        )}>
                                                            {tx.buyer_id === id ? "-" : "+"} {tx.currency === "NGN" ? "₦" : "$"} {Number(tx.amount).toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                            <Clock className="w-8 h-8 text-slate-200" />
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-400">No transactions recorded yet</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "withdrawals" && (
                            <div className="bg-white rounded-[32px] border border-slate-100/50 shadow-sm overflow-hidden ring-1 ring-slate-100">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-50">
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Reference</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {withdrawals.length > 0 ? (
                                            withdrawals.map((w: any) => (
                                                <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5 text-sm font-medium text-slate-600">
                                                        {new Date(w.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}, {new Date(w.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                                    </td>
                                                    <td className="px-8 py-5 text-xs font-bold text-slate-400 font-mono">{w.reference}</td>
                                                    <td className="px-8 py-5">
                                                        <Badge className={cn(
                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                                            w.status === "SUCCESS" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                        )}>
                                                            {w.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-bold text-slate-900">
                                                        ₦ {Number(w.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-20 text-center text-sm font-bold text-slate-400">No withdrawal history</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "account" && (() => {
                            // Calculate trust score from stats (0-100 scale)
                            const totalTxns = customer.stats?.total_transactions || 0;
                            const completed = customer.stats?.completed || 0;
                            const disputed = customer.stats?.disputed || 0;
                            const rawScore = totalTxns > 0 ? Math.max(0, ((completed - disputed) / totalTxns) * 100) : 100;
                            const boundedScore = Math.max(0, Math.min(100, rawScore));
                            const displayScore = Math.round(300 + (boundedScore / 100) * 600);
                            const numTicks = 41;
                            const ticks = Array.from({ length: numTicks }).map((_, i) => {
                                const percent = (i / (numTicks - 1)) * 100;
                                let color = '#22c55e';
                                if (percent <= 25) color = '#ef4444';
                                else if (percent <= 50) color = '#f97316';
                                else if (percent <= 75) color = '#3b82f6';
                                const angle = Math.PI - (i / (numTicks - 1)) * Math.PI;
                                const innerRadius = 75;
                                const outerRadius = 90;
                                const x1 = 100 + innerRadius * Math.cos(angle);
                                const y1 = 100 - innerRadius * Math.sin(angle);
                                const x2 = 100 + outerRadius * Math.cos(angle);
                                const y2 = 100 - outerRadius * Math.sin(angle);
                                return { x1, y1, x2, y2, color };
                            });
                            const scoreAngle = Math.PI - (boundedScore / 100) * Math.PI;
                            const needleOuterR = 110;
                            const needleInnerR = 55;
                            const needleX1 = 100 + needleInnerR * Math.cos(scoreAngle);
                            const needleY1 = 100 - needleInnerR * Math.sin(scoreAngle);
                            const needleX2 = 100 + needleOuterR * Math.cos(scoreAngle);
                            const needleY2 = 100 - needleOuterR * Math.sin(scoreAngle);
                            let badgeText = "Excellent";
                            let badgeColor = "text-[#22c55e] bg-[#ecfdf5]";
                            if (displayScore < 500) { badgeText = "Poor"; badgeColor = "text-[#ef4444] bg-[#fef2f2]"; }
                            else if (displayScore < 650) { badgeText = "Fair"; badgeColor = "text-[#f97316] bg-[#fff7ed]"; }
                            else if (displayScore < 750) { badgeText = "Good"; badgeColor = "text-[#3b82f6] bg-[#eff6ff]"; }
                            const totalVolume = customer.stats?.total_spent || 0;

                            return (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Trust Score Card */}
                                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                        <div className="flex flex-row items-baseline justify-between pt-6 px-6 pb-0">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-[#00a6e0] mb-[2px]">
                                                    <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></svg>
                                                    <span className="font-bold text-[10px] tracking-wide">Safeeely</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 -ml-1">
                                                    <div className="relative w-5 h-5 flex items-center justify-center transform scale-[0.8]">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute left-0 bottom-0.5 z-10" />
                                                        <div className="w-3.5 h-3.5 rounded-full border-[2px] border-slate-900 absolute right-0 top-0" />
                                                        <div className="w-[6px] h-[2px] bg-slate-900 absolute transform rotate-[45deg]" />
                                                    </div>
                                                    <span className="text-[20px] font-extrabold text-[#111827] tracking-tight">Trust score</span>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-xl text-[11px] font-bold border border-black/5 ${badgeColor}`}>{badgeText}</span>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center pt-2 pb-6 px-6">
                                            <div className="relative w-full max-w-[280px] aspect-[1.8/1] mx-auto mt-4">
                                                <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                                                    <path d="M 40 100 A 60 60 0 0 1 160 100" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 6" />
                                                    {ticks.map((tick, i) => (
                                                        <line key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke={tick.color} strokeWidth="2.5" strokeLinecap="round" />
                                                    ))}
                                                    <text x="35" y="118" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">300</text>
                                                    <text x="100" y="32" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">600</text>
                                                    <text x="165" y="118" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">900</text>
                                                    <line x1={needleX1} y1={needleY1} x2={needleX2} y2={needleY2} stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
                                                    <circle cx={needleX2} cy={needleY2} r="5.5" fill="white" stroke="#111827" strokeWidth="3.5" />
                                                    <text x={needleX2} y={needleY2 - 12} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600">your score</text>
                                                </svg>
                                                <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                    <span className="text-[54px] font-black text-[#111827] leading-[1] tracking-[-0.04em]">{displayScore}</span>
                                                    <div className={`mt-1.5 ${badgeColor} px-4 py-1 rounded-[12px] font-bold text-[13px] tracking-wide shadow-sm border border-black/5`}>{badgeText}</div>
                                                </div>
                                            </div>
                                            <div className="mt-8 flex items-center justify-center gap-1.5 text-slate-400 font-medium text-[11px] mb-2">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span>Updated real-time by reviews</span>
                                            </div>
                                            <div className="mt-2 bg-[#111827] text-white px-5 py-3 rounded-xl font-bold text-[13px] shadow-sm w-[90%] text-center">
                                                Total Volume: <span className="text-emerald-400 ml-1">₦{totalVolume.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Details */}
                                    <div className="bg-white rounded-[32px] p-10 border border-slate-100 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xl font-black text-[#020617] mb-6">Account Details</h4>
                                            
                                            {/* Balances & Referrals */}
                                            <div className="mb-8 space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Available Balances</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {customer.stats?.balances?.length > 0 ? customer.stats.balances.map((b: any) => (
                                                            <div key={b.currency} className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                                                                <span className="text-[10px] font-black text-slate-400">{b.currency}</span>
                                                                <span className="text-sm font-black text-emerald-600">{b.currency === 'NGN' ? '₦' : '$'}{b.amount?.toLocaleString()}</span>
                                                            </div>
                                                        )) : <span className="text-xs font-bold text-slate-400">No active balance</span>}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Referrals</p>
                                                        <p className="text-sm font-black text-slate-700">{customer.stats?.referral_count || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Referral Earnings</p>
                                                        <p className="text-sm font-black text-emerald-600">₦{(customer.stats?.referral_earned || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Login Email</p>
                                                    <p className="text-sm font-bold text-slate-700">{customer.email}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Transactions</p>
                                                        <p className="text-sm font-bold text-slate-700">{totalTxns}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completed / Disputed</p>
                                                        <p className="text-sm font-bold text-slate-700"><span className="text-emerald-600">{completed}</span> · <span className="text-rose-500">{disputed}</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-slate-50 mt-6">
                                            <Button 
                                                variant="outline" 
                                                onClick={handleBlockToggle}
                                                disabled={isBlocking}
                                                className={cn(
                                                    "rounded-xl font-bold w-full transition-all",
                                                    customer.status === "Blocked" 
                                                        ? "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                                        : "border-rose-100 text-rose-600 hover:bg-rose-50"
                                                )}
                                            >
                                                {isBlocking ? "Processing..." : (customer.status === "Blocked" ? "Unblock Account" : "Disable Account")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Pagination */}
                        {((activeTab === "payments" && transactions.length > 0) || (activeTab === "withdrawals" && withdrawals.length > 0)) && (
                            <div className="px-8 py-6 bg-slate-50/30 flex items-center justify-between border-t border-slate-50">
                                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                                    Viewing 1-{activeTab === "payments" ? transactions.length : withdrawals.length} of {activeTab === "payments" ? transactions.length : withdrawals.length} results
                                </p>
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30" disabled>
                                        <ArrowLeft className="w-4 h-4" /> Previous
                                    </button>
                                    <button className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30" disabled>
                                        Next <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Toast notification */}
            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300",
                    toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                )}>
                    <span>{toast.type === "success" ? "✅" : "❌"}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

function DetailItem({ icon: Icon, label, value, hasCheck }: any) {
    return (
        <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-slate-700">{value}</p>
                    {hasCheck && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
            </div>
        </div>
    );
}

function TabButton({ children, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "pb-4 text-[13px] font-bold uppercase tracking-widest border-b-2 transition-all",
                active ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
        >
            {children}
        </button>
    );
}
