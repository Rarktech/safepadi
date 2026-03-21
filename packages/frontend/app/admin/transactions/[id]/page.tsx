"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle, ExternalLink, Activity, Image as ImageIcon } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING_SELLER_ACCEPTANCE: { label: "Pending", color: "bg-amber-50 text-amber-600 border-amber-100" },
    ACCEPTED: { label: "Accepted", color: "bg-sky-50 text-sky-600 border-sky-100" },
    PAID: { label: "Paid", color: "bg-blue-50 text-blue-600 border-blue-100" },
    AWAITING_PROOF: { label: "Awaiting", color: "bg-purple-50 text-purple-600 border-purple-100" },
    COMPLETED_BY_SELLER: { label: "Delivered", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    FINALIZED: { label: "Completed", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    DISPUTED: { label: "Disputed", color: "bg-rose-50 text-rose-600 border-rose-100" },
    DECLINED: { label: "Declined", color: "bg-slate-100 text-slate-500 border-slate-200" },
    CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-400 border-slate-200" },
};

const CURRENCY_FLAG: Record<string, string> = { NGN: "🇳🇬", USD: "🇺🇸", USDT: "🪙" };

export default function AdminTransactionDetails() {
    const params = useParams();
    const router = useRouter();
    const [txn, setTxn] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTxn = async () => {
            if (!params.id) return;
            try {
                const res = await axios.get(`${API_URL}/admin/transactions/${params.id}`, {
                    headers: { "ngrok-skip-browser-warning": "true" },
                });
                setTxn(res.data);
            } catch (err) {
                console.error("❌ Failed to fetch transaction details:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTxn();
    }, [params.id]);

    const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>, url: string, filename: string) => {
        e.preventDefault();
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Download failed', err);
            window.open(url, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#f8fafc] min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="w-16 h-16 border-8 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    if (!txn) {
        return (
            <div className="flex bg-[#f8fafc] min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 opacity-20" />
                    <h2 className="text-2xl font-black text-slate-800">Transaction Not Found</h2>
                    <p className="text-slate-500 mt-2 max-w-sm">The transaction you're looking for doesn't exist or has been permanently removed.</p>
                    <button onClick={() => router.push("/admin/transactions")} className="mt-6 font-bold text-emerald-600 hover:text-emerald-700">
                        &larr; Back to Ledger
                    </button>
                </div>
            </div>
        );
    }

    const { buyer, seller, transaction_proofs, dispute_id } = txn;
    const statusCfg = STATUS_CONFIG[txn.status] || { label: txn.status, color: "bg-slate-100 text-slate-500 border-slate-200" };
    const dateStr = new Date(txn.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const monthYear = new Date(txn.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    
    // Fallback names
    const buyerName = buyer ? `${buyer.first_name || ""} ${buyer.last_name || ""}`.trim() : "Unknown";
    const sellerName = seller ? `${seller.first_name || ""} ${seller.last_name || ""}`.trim() : "Unknown";

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />

            <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                <div className="max-w-6xl mx-auto pl-4">

                    {/* Top Navigation */}
                    <div className="mb-8 flex items-center gap-3">
                        <button onClick={() => router.push("/admin/transactions")} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" /> Transactions
                        </button>
                        <span className="text-slate-300">/</span>
                        <span className="text-xs font-bold text-slate-400">Transaction Details</span>
                    </div>

                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <h1 className="text-4xl font-black text-[#020617] tracking-tighter">
                                    {txn.txn_code}
                                </h1>
                                <Badge className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-none border", statusCfg.color)}>
                                    {statusCfg.label}
                                </Badge>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 tracking-wide">
                                {Number(txn.total_amount).toLocaleString()} {txn.currency} • Created on {dateStr}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {dispute_id && (
                                <Link href={`/admin/disputes/${dispute_id}`}>
                                    <button className="h-10 px-5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Go to Dispute
                                    </button>
                                </Link>
                            )}
                            <button className="h-10 px-5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm shadow-slate-200/50">
                                <ExternalLink className="w-3.5 h-3.5" /> Export Data
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                        
                        {/* Main Details Card (Left - Takes 2 cols) */}
                        <div className="xl:col-span-2 bg-white rounded-[32px] p-10 border border-slate-100 shadow-sm ring-1 ring-slate-50">
                            <h2 className="text-xl font-black text-[#020617] mb-10 tracking-tight">Payment batch {monthYear}</h2>
                            
                            {/* Grid details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12 mb-12">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed to (Buyer)</p>
                                        <p className="text-[13px] font-bold text-[#020617] mb-0.5">{buyer?.email || "Unknown Email"}</p>
                                        <p className="text-[13px] font-bold text-slate-500">{buyerName}</p>
                                        <p className="text-xs font-black text-indigo-500 mt-1">@{buyer?.safetag}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seller details</p>
                                        <p className="text-[13px] font-bold text-[#020617] mb-0.5">{seller?.email || "Unknown Email"}</p>
                                        <p className="text-[13px] font-bold text-slate-500">{sellerName}</p>
                                        <p className="text-xs font-black text-emerald-500 mt-1">@{seller?.safetag}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Transaction No</p>
                                        <p className="text-[12px] font-bold text-[#020617] text-right">{txn.txn_code}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Subject</p>
                                        <p className="text-[12px] font-bold text-[#020617] text-right line-clamp-1">{txn.product_name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Currency</p>
                                        <p className="text-[12px] font-bold text-[#020617] text-right">{txn.currency}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Issued</p>
                                        <p className="text-[12px] font-bold text-[#020617] text-right">{dateStr}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Safeeely Fee</p>
                                        <p className="text-[12px] font-bold text-[#020617] text-right">{txn.fee_allocation === "buyer" ? "Paid by Buyer" : txn.fee_allocation === "seller" ? "Paid by Seller" : "Split 50/50"}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Payment Gateway</p>
                                        <p className="text-[12px] font-bold text-[#020617] text-right">
                                            {txn.metadata?.payment_gateway || (['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'CANCELLED', 'DECLINED'].includes(txn.status) ? "Pending Payment" : "Unknown")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="mt-4 pt-10 border-t border-slate-100/60">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/2">Product/Service</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Qty</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Unit Price</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="py-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-black text-[#020617]">{txn.product_name}</p>
                                                        {txn.description && (
                                                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed mt-1 max-w-sm">
                                                                {txn.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 text-center text-[12px] font-bold text-slate-500">1</td>
                                            <td className="py-6 text-right text-[12px] font-bold text-slate-500">{Number(txn.amount).toLocaleString()} {txn.currency}</td>
                                            <td className="py-6 text-right text-[12px] font-black text-[#020617]">{Number(txn.amount).toLocaleString()} {txn.currency}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals Section */}
                            <div className="flex justify-end pt-8 border-t border-slate-100 mt-2">
                                <div className="w-full max-w-[280px] space-y-4">
                                    <div className="flex justify-between items-center text-[12px]">
                                        <span className="font-bold text-slate-500">Subtotal</span>
                                        <span className="font-black text-[#020617]">{Number(txn.amount).toLocaleString()} {txn.currency}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[12px]">
                                        <span className="font-bold text-slate-500">Platform Fee</span>
                                        <span className="font-black text-slate-400">{Number(txn.fee_amount).toLocaleString()} {txn.currency}</span>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[14px]">
                                        <span className="font-black text-[#020617]">Amount Due</span>
                                        <span className="font-black text-[#020617] text-lg tracking-tight">{Number(txn.total_amount).toLocaleString()} {txn.currency}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-14 pt-8 border-t border-slate-100">
                                <p className="text-[11px] font-black text-[#020617] mb-2 tracking-tight">Terms & Condition</p>
                                <p className="text-[10px] text-slate-400 font-bold max-w-lg leading-relaxed">
                                    This invoice secures the transaction on Safeeely. The payment acts as escrow until the transaction is successfully verified or disputed through the Resolution Center.
                                </p>
                            </div>
                        </div>

                        {/* Right Sidebar Details */}
                        <div className="xl:col-span-1 space-y-6">
                            
                            {/* Attached Proofs */}
                            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm ring-1 ring-slate-50">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-black text-[#020617] tracking-tight">Attached Proofs</h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{(transaction_proofs || []).length} Files</span>
                                </div>
                                
                                {(!transaction_proofs || transaction_proofs.length === 0) ? (
                                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Proofs Attached</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {transaction_proofs.map((proof: any) => (
                                            <a 
                                                key={proof.id} 
                                                href={proof.media_url} 
                                                onClick={(e) => proof.media_url && handleDownload(e, proof.media_url, proof.media_url.split('/').pop() || 'document')}
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors group"
                                            >
                                                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {proof.media_type === 'image' ? (
                                                        <img src={proof.media_url} alt="Proof" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FileText className="w-4 h-4 text-emerald-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black text-[#020617] truncate">{proof.media_type?.toUpperCase() || 'DOCUMENT'} Uploaded</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(proof.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Minimal Log overview (if needed) */}
                            <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                                <h3 className="text-sm font-black text-[#020617] tracking-tight mb-6">System Log</h3>
                                <div className="space-y-5">
                                    <div className="relative pl-6 before:absolute before:left-2 before:top-1.5 before:w-2 before:h-2 before:bg-emerald-500 before:rounded-full before:ring-4 before:ring-emerald-50 after:absolute after:left-[11px] after:top-4 after:w-px after:h-full after:bg-slate-200 last:after:hidden">
                                        <p className="text-[11px] font-black text-[#020617]">Transaction Initiated</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{dateStr}</p>
                                    </div>
                                    <div className="relative pl-6 before:absolute before:left-2 before:top-1.5 before:w-2 before:h-2 before:bg-sky-500 before:rounded-full before:ring-4 before:ring-sky-50 after:absolute after:left-[11px] after:top-4 after:w-px after:h-full after:bg-slate-200 last:after:hidden">
                                        <p className="text-[11px] font-black text-[#020617]">Current Status</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{statusCfg.label}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
