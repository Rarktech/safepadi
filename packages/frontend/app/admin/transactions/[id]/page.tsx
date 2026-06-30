"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle, ExternalLink, ImageIcon } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const STATUS_CONFIG: Record<string, { label: string; chip: string }> = {
  PENDING_SELLER_ACCEPTANCE: { label: "Pending",   chip: "chip-amber" },
  ACCEPTED:                  { label: "Accepted",  chip: "chip-blue" },
  PAID:                      { label: "Paid",      chip: "chip-blue" },
  AWAITING_PROOF:            { label: "Awaiting",  chip: "chip-purple" },
  COMPLETED_BY_SELLER:       { label: "Delivered", chip: "chip-blue" },
  FINALIZED:                 { label: "Completed", chip: "chip-green" },
  DISPUTED:                  { label: "Disputed",  chip: "chip-red" },
  DECLINED:                  { label: "Declined",  chip: "chip-slate" },
  CANCELLED:                 { label: "Cancelled", chip: "chip-slate" },
  RETURN_PENDING:            { label: "Return",    chip: "chip-amber" },
  RESOLVED_SPLIT:            { label: "Split",     chip: "chip-green" },
};

export default function AdminTransactionDetails() {
  const params = useParams();
  const router = useRouter();
  const [txn, setTxn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    axios.get(`${API_URL}/admin/transactions/${params.id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then(res => setTxn(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>, url: string, filename: string) => {
    e.preventDefault();
    try {
      const blob = await fetch(url).then(r => r.blob());
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch { window.open(url, "_blank"); }
  };

  if (loading) {
    return (
      <AdminShell title="Transaction Details" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!txn) {
    return (
      <AdminShell title="Transaction Details" subtitle="Not found">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="w-12 h-12 text-[#e11d48] mb-3 opacity-30" />
          <p className="font-tight text-lg font-bold text-[#0f172a]">Transaction Not Found</p>
          <button onClick={() => router.push("/admin/transactions")} className="mt-4 text-[13px] font-semibold text-[#059669] hover:underline">
            ← Back to Ledger
          </button>
        </div>
      </AdminShell>
    );
  }

  const { buyer, seller, transaction_proofs, dispute_id } = txn;
  const cfg = STATUS_CONFIG[txn.status] ?? { label: txn.status, chip: "chip-slate" };
  const dateStr = new Date(txn.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const buyerName = buyer ? `${buyer.first_name ?? ""} ${buyer.last_name ?? ""}`.trim() : "Unknown";
  const sellerName = seller ? `${seller.first_name ?? ""} ${seller.last_name ?? ""}`.trim() : "Unknown";

  return (
    <AdminShell title={txn.txn_code} subtitle="Transaction details">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-[#94a3b8]">
          <button onClick={() => router.push("/admin/transactions")} className="flex items-center gap-1.5 hover:text-[#0f172a] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Transactions
          </button>
          <span>/</span>
          <span className="text-[#64748b]">{txn.txn_code}</span>
        </div>
        <div className="flex items-center gap-2">
          {dispute_id && (
            <Link href={`/admin/disputes/${dispute_id}`}>
              <button className="h-9 px-4 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
                style={{ background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }}>
                <AlertTriangle className="w-3.5 h-3.5" /> View Dispute
              </button>
            </Link>
          )}
          <button className="h-9 px-4 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
            style={{ border: "1px solid #e9eaec" }}>
            <ExternalLink className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Status header */}
      <div className="flex items-center gap-3">
        <h1 className="font-tight text-2xl font-bold text-[#0f172a]">{txn.txn_code}</h1>
        <span className={`adm-chip ${cfg.chip}`}>{cfg.label}</span>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Main details */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#e9eaec] p-6">
          <p className="font-tight text-[15px] font-bold text-[#0f172a] mb-5">
            Payment — {new Date(txn.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Buyer */}
            <div>
              <p className="adm-section-label mb-2">Buyer</p>
              <p className="text-[13px] font-semibold text-[#0f172a]">{buyerName}</p>
              <p className="text-[12px] text-[#64748b]">{buyer?.email}</p>
              <p className="text-[11px] font-semibold text-[#059669] mt-0.5">{buyer?.safetag}</p>
            </div>
            {/* Seller */}
            <div>
              <p className="adm-section-label mb-2">Seller</p>
              <p className="text-[13px] font-semibold text-[#0f172a]">{sellerName}</p>
              <p className="text-[12px] text-[#64748b]">{seller?.email}</p>
              <p className="text-[11px] font-semibold text-[#2563eb] mt-0.5">{seller?.safetag}</p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="space-y-2 border-t border-[#f3f4f6] pt-5 mb-5">
            {[
              { label: "Transaction Code", value: txn.txn_code },
              { label: "Product", value: txn.product_name },
              { label: "Currency", value: txn.currency },
              { label: "Created", value: dateStr },
              { label: "Fee Allocation", value: txn.fee_allocation === "buyer" ? "Paid by Buyer" : txn.fee_allocation === "seller" ? "Paid by Seller" : "Split 50/50" },
              { label: "Payment Gateway", value: txn.metadata?.payment_gateway || "Pending" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5">
                <span className="adm-section-label">{row.label}</span>
                <span className="text-[12px] font-semibold text-[#0f172a]">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Product row */}
          <div className="border-t border-[#f3f4f6] pt-5">
            <table className="w-full">
              <thead>
                <tr>
                  {["Product/Service", "Qty", "Unit Price", "Amount"].map(h => (
                    <th key={h} className={`pb-3 adm-section-label ${h !== "Product/Service" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#94a3b8]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0f172a]">{txn.product_name}</p>
                        {txn.description && <p className="text-[11px] text-[#94a3b8] line-clamp-2">{txn.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right text-[12px] text-[#64748b]">1</td>
                  <td className="py-3 text-right text-[12px] text-[#64748b]">{Number(txn.amount).toLocaleString()} {txn.currency}</td>
                  <td className="py-3 text-right text-[13px] font-bold text-[#0f172a]">{Number(txn.amount).toLocaleString()} {txn.currency}</td>
                </tr>
              </tbody>
            </table>
            {/* Totals */}
            <div className="border-t border-[#f3f4f6] pt-4 mt-2 flex justify-end">
              <div className="space-y-2 w-56">
                {[
                  { label: "Subtotal", value: `${Number(txn.amount).toLocaleString()} ${txn.currency}`, dim: false },
                  { label: "Platform Fee", value: `${Number(txn.fee_amount).toLocaleString()} ${txn.currency}`, dim: true },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[12px]">
                    <span className="text-[#64748b]">{r.label}</span>
                    <span className={r.dim ? "text-[#94a3b8]" : "font-semibold text-[#0f172a]"}>{r.value}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[14px] font-bold border-t border-[#f3f4f6] pt-2">
                  <span className="text-[#0f172a]">Amount Due</span>
                  <span className="text-[#0f172a]">{Number(txn.total_amount).toLocaleString()} {txn.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Proofs */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-tight text-[13px] font-bold text-[#0f172a]">Attached Proofs</p>
              <span className="adm-chip chip-green">{(transaction_proofs || []).length} files</span>
            </div>
            {(!transaction_proofs?.length) ? (
              <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-[#e9eaec] rounded-xl">
                <ImageIcon className="w-7 h-7 text-[#cbd5e1] mb-2" />
                <p className="adm-section-label">No proofs attached</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transaction_proofs.map((proof: any) => (
                  <a
                    key={proof.id}
                    href={proof.media_url}
                    onClick={e => handleDownload(e, proof.media_url, proof.media_url.split("/").pop() || "document")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#f3f4f6] hover:bg-[#f8f9fa] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg border border-[#e9eaec] bg-white flex items-center justify-center shrink-0 overflow-hidden">
                      {proof.media_type === "image"
                        ? <img src={proof.media_url} alt="" className="w-full h-full object-cover" />
                        : <FileText className="w-4 h-4 text-[#10b981]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#0f172a] truncate">{(proof.media_type ?? "document").toUpperCase()}</p>
                      <p className="text-[10px] text-[#94a3b8]">{new Date(proof.created_at).toLocaleDateString()}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#cbd5e1]" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* System log */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <p className="font-tight text-[13px] font-bold text-[#0f172a] mb-4">System Log</p>
            <div className="space-y-4">
              {[
                { label: "Transaction Initiated", detail: dateStr, color: "#10b981" },
                { label: "Current Status", detail: cfg.label, color: "#2563eb" },
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: log.color }} />
                  <div>
                    <p className="text-[12px] font-semibold text-[#0f172a]">{log.label}</p>
                    <p className="text-[11px] text-[#94a3b8]">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
