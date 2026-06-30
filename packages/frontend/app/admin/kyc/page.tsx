"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Users, ShieldCheck, ShieldAlert, Clock, Search, Eye, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = "/api";

export default function AdminKYCList() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    axios.get(`${API_URL}/admin/kyc`, { withCredentials: true })
      .then(res => setData(res.data))
      .catch(err => console.error("Fetch KYC failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredSubmissions = data?.submissions?.filter((s: any) => {
    const matchesSearch =
      s.profile?.safetag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = data?.stats || {};

  const kpiCards = [
    { label: "Total Submissions", value: stats.total, icon: Users, chip: "chip-blue" },
    { label: "Pending Review", value: stats.pending, icon: Clock, chip: "chip-amber", pulse: (stats.pending ?? 0) > 0 },
    { label: "Verified Users", value: stats.verified_users, icon: ShieldCheck, chip: "chip-green" },
    { label: "Unverified Users", value: stats.unverified_users, icon: ShieldAlert, chip: "chip-red" },
  ];

  const statusChip = (status: string) => {
    if (status === "PENDING") return <span className="adm-chip chip-amber flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    if (status === "APPROVED") return <span className="adm-chip chip-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
    if (status === "REJECTED") return <span className="adm-chip chip-red flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="adm-chip chip-slate">{status}</span>;
  };

  return (
    <AdminShell title="KYC Verification" subtitle="Identity & compliance hub">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <p className="adm-section-label">{card.label}</p>
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#64748b]" />
                </div>
              </div>
              <p className="font-tight text-2xl font-bold text-[#0f172a]">{card.value ?? 0}</p>
              {card.pulse && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#d97706] animate-ping" />
              )}
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {/* Filters header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-[#f3f4f6]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
            <input
              placeholder="Search by name or safetag…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 h-9 rounded-xl text-[12px] font-medium outline-none"
              style={{ width: 240, background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-[#f7f8f9] rounded-xl border border-[#e9eaec] p-1">
            {["all", "PENDING", "APPROVED", "REJECTED"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={statusFilter === s
                  ? { background: '#0f172a', color: '#fff' }
                  : { color: '#64748b' }
                }
              >
                {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin mb-3" />
            <p className="adm-section-label">Loading verification hub…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  {["User / Safetag", "Document Info", "Submission Date", "Status", ""].map(h => (
                    <th key={h} className={`px-5 py-3.5 adm-section-label ${h === "" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(filteredSubmissions ?? []).map((sub: any) => (
                  <tr key={sub.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] border border-[#e9eaec] overflow-hidden shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.profile?.safetag}&backgroundColor=f1f5f9`}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#0f172a]">{sub.first_name} {sub.last_name}</p>
                          <p className="text-[11px] text-[#10b981] font-semibold">{sub.profile?.safetag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[12px] font-semibold text-[#0f172a]">
                        {sub.document_country} — {sub.nin ? 'National ID (NIN)' : 'International Passport'}
                      </p>
                      <p className="text-[11px] text-[#94a3b8]">{sub.city}, {sub.state}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[12px] font-semibold text-[#0f172a]">{new Date(sub.created_at).toLocaleDateString()}</p>
                      <p className="text-[11px] text-[#94a3b8]">
                        {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">{statusChip(sub.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/kyc/${sub.id}`}>
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-[#f0fdf4]"
                          style={{ border: '1px solid #e9eaec', color: '#10b981' }}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(filteredSubmissions?.length === 0 || !filteredSubmissions) && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShieldAlert className="w-10 h-10 mb-3 opacity-20 text-[#94a3b8]" />
                <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-1">No verification requests</p>
                <p className="text-[12px] text-[#94a3b8]">Try adjusting your filters or wait for new submissions.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
