"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, CheckCircle2, XCircle, ShieldCheck, Clock, Calendar,
  MapPin, Phone, Mail, User, FileText, ExternalLink, Loader2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = "/api";

export default function AdminKYCDetails() {
  const params = useParams();
  const router = useRouter();
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchDetails = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/kyc/${params.id}`, { withCredentials: true });
      setKyc(res.data);
    } catch (err) {
      console.error("Fetch KYC details failed:", err);
      toast.error("Failed to load submission details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [params.id]);

  const handleAction = async (type: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      await axios.post(`${API_URL}/admin/kyc/${params.id}/${type}`, {
        reason: type === 'reject' ? rejectionReason : undefined
      }, { withCredentials: true });
      toast.success(`KYC ${type === 'approve' ? 'Approved' : 'Rejected'} successfully`);
      setRejectDialogOpen(false);
      const res = await axios.get(`${API_URL}/admin/kyc/${params.id}`, { withCredentials: true });
      setKyc(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const statusChip = (status: string) => {
    if (status === "PENDING")  return <span className="adm-chip chip-amber flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    if (status === "APPROVED") return <span className="adm-chip chip-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
    if (status === "REJECTED") return <span className="adm-chip chip-red flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="adm-chip chip-slate">{status}</span>;
  };

  if (loading) {
    return (
      <AdminShell title="KYC Review" subtitle="Loading…">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!kyc) {
    return (
      <AdminShell title="KYC Review" subtitle="Not found">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-2">Submission not found.</p>
          <button onClick={() => router.back()} className="text-[13px] font-semibold text-[#059669] hover:underline">← Go back</button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Review Submission" subtitle={`Submitted ${new Date(kyc.created_at).toLocaleDateString()}`}>
      {/* Reject Dialog */}
      {rejectDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-sm w-full shadow-2xl" style={{ border: '1px solid #edeff3' }}>
            <p className="font-tight text-[17px] font-bold text-[#0f172a] mb-4">Reject Submission</p>
            <p className="adm-section-label mb-2">Rejection Reason</p>
            <textarea
              rows={3}
              className="w-full rounded-xl px-3.5 py-3 text-[13px] font-medium outline-none resize-none mb-5"
              style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
              placeholder="Explain why this submission is rejected…"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectDialogOpen(false)}
                className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
                style={{ border: '1px solid #e9eaec' }}>
                Cancel
              </button>
              <button onClick={() => handleAction('reject')} disabled={processing}
                className="flex-1 h-11 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
                style={{ background: '#e11d48' }}>
                {processing ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-[12px] font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to KYC
        </button>
        <div className="flex items-center gap-2">
          {kyc.status === 'PENDING' ? (
            <>
              <button onClick={() => setRejectDialogOpen(true)} disabled={processing}
                className="h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#fff1f2]"
                style={{ border: '1px solid #fecdd3', color: '#e11d48' }}>
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button onClick={() => handleAction('approve')} disabled={processing}
                className="h-9 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
                style={{ background: '#059669' }}>
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve Identity
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {statusChip(kyc.status)}
              {kyc.status === 'REJECTED' && kyc.rejection_reason && (
                <span className="text-[11px] font-semibold text-[#e11d48]">Reason: {kyc.rejection_reason}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Personal info + Documents */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-[#059669]" />
              </div>
              <p className="font-tight text-[14px] font-bold text-[#0f172a]">Personal Particulars</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "First Name", value: kyc.first_name || "N/A", icon: User },
                { label: "Last Name", value: kyc.last_name || "N/A", icon: User },
                { label: "Date of Birth", value: kyc.dob ? new Date(kyc.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : "N/A", icon: Calendar },
                { label: "Phone", value: kyc.phone || "N/A", icon: Phone },
              ].map(f => {
                const Icon = f.icon;
                return (
                  <div key={f.label}>
                    <p className="adm-section-label mb-1">{f.label}</p>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-[#94a3b8]" />
                      <span className="text-[13px] font-semibold text-[#0f172a]">{f.value}</span>
                    </div>
                  </div>
                );
              })}
              <div className="sm:col-span-2">
                <p className="adm-section-label mb-1">Residential Address</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span className="text-[13px] font-semibold text-[#0f172a]">
                    {[kyc.address, kyc.city, kyc.state, kyc.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Identity data */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5 text-[#2563eb]" />
              </div>
              <p className="font-tight text-[14px] font-bold text-[#0f172a]">Identity Verification</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <p className="adm-section-label mb-1">Issuing Authority</p>
                <p className="text-[13px] font-semibold text-[#0f172a]">{kyc.document_country || "N/A"}</p>
              </div>
              <div>
                <p className="adm-section-label mb-1">Identification Method</p>
                <p className="text-[13px] font-semibold text-[#0f172a]">{kyc.nin ? 'NIN Digital Verification' : 'International Passport'}</p>
              </div>
            </div>

            {kyc.nin && (
              <div className="rounded-xl p-4 mb-5 flex items-center justify-between" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
                <div>
                  <p className="adm-section-label mb-1">National Identity Number (NIN)</p>
                  <p className="font-tight text-xl font-bold text-[#0f172a] tracking-[0.15em]">{kyc.nin}</p>
                </div>
                <span className="adm-chip chip-green">Direct DB Match</span>
              </div>
            )}

            {(kyc.front_url || kyc.back_url) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Front ID Image", url: kyc.front_url },
                  { label: "Reverse ID Image", url: kyc.back_url },
                ].filter(d => d.url).map(doc => (
                  <div key={doc.label}>
                    <p className="adm-section-label mb-2">{doc.label}</p>
                    <div className="rounded-xl overflow-hidden aspect-video bg-[#f1f5f9] flex items-center justify-center relative group"
                      style={{ border: '1px solid #e9eaec' }}>
                      {doc.url ? (
                        <>
                          <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                              <Eye className="w-4 h-4 text-[#0f172a]" />
                            </div>
                          </a>
                        </>
                      ) : (
                        <FileText className="w-8 h-8 text-[#cbd5e1]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Profile sidebar */}
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
          <p className="adm-section-label mb-5">System Profile</p>
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-[#e9eaec] mb-4 relative">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${kyc.profile?.safetag}&backgroundColor=f1f5f9`}
                className="w-full h-full object-cover" alt="" />
              {kyc.status === 'APPROVED' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#10b981] border-2 border-white flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <p className="font-tight text-[16px] font-bold text-[#0f172a]">{kyc.profile?.first_name} {kyc.profile?.last_name}</p>
            <p className="text-[12px] font-semibold text-[#10b981]">{kyc.profile?.safetag}</p>
          </div>

          <div className="mt-6 space-y-3 rounded-xl p-4" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
            {[
              { label: "Platform", value: kyc.profile?.primary_platform, icon: ShieldCheck },
              { label: "Email", value: kyc.profile?.email, icon: Mail },
              { label: "Registered", value: kyc.profile?.created_at ? new Date(kyc.profile.created_at).toLocaleDateString() : "—", icon: Calendar },
            ].map(r => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="adm-section-label">{r.label}</p>
                    <p className="text-[12px] font-semibold text-[#0f172a] truncate">{r.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
