"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Shield, AlertTriangle, UserX, Star, RefreshCw, CheckCircle2, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const TABS = ['Fraud Queue', 'Leaderboard'] as const;
type Tab = typeof TABS[number];

const trustBucket = (score: number) => {
  if (score >= 4.5) return { label: 'Excellent', color: '#059669', bg: '#f0fdf4' };
  if (score >= 3.5) return { label: 'Good', color: '#2563eb', bg: '#eff6ff' };
  if (score >= 2.5) return { label: 'Fair', color: '#d97706', bg: '#fffbeb' };
  return { label: 'Poor', color: '#e11d48', bg: '#fff1f2' };
};

export default function TrustReputationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Fraud Queue');
  const [overview, setOverview] = useState<any>(null);
  const [flagged, setFlagged] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [overrideModal, setOverrideModal] = useState<{ profileId: string; safetag: string } | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      axios.get(`${API_URL}/admin/trust/overview`, { headers: H }).then(r => setOverview(r.data)),
      axios.get(`${API_URL}/admin/trust/flagged`, { headers: H }).then(r => setFlagged(r.data)),
      axios.get(`${API_URL}/admin/trust/leaderboard`, { headers: H }).then(r => setLeaderboard(r.data)),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const clearFlag = async (profileId: string) => {
    try {
      await axios.patch(`${API_URL}/admin/trust/${profileId}/clear-flag`, { reason: 'Cleared by admin' }, { headers: H });
      showToast('Flag cleared');
      setFlagged(prev => prev.filter(p => p.id !== profileId));
      setOverview((prev: any) => prev ? { ...prev, flagged_count: Math.max(0, (prev.flagged_count || 1) - 1) } : prev);
    } catch { showToast('Failed to clear flag', 'error'); }
  };

  const applyOverride = async () => {
    if (!overrideModal || !overrideScore || !overrideReason) return;
    setOverrideLoading(true);
    try {
      await axios.patch(`${API_URL}/admin/trust/${overrideModal.profileId}/score`, { new_score: parseFloat(overrideScore), reason: overrideReason }, { headers: H });
      showToast('Trust score updated'); setOverrideModal(null); setOverrideScore(''); setOverrideReason(''); fetchAll();
    } catch { showToast('Failed to update score', 'error'); }
    finally { setOverrideLoading(false); }
  };

  return (
    <AdminShell title="Trust & Reputation" subtitle="Fraud review queue, trust scores, and manual overrides">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>
          {toast.msg}
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-7 w-full max-w-sm" style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-tight text-[17px] font-bold text-[#0f172a]">Override Trust Score</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{overrideModal.safetag}</p>
              </div>
              <button onClick={() => setOverrideModal(null)} className="w-8 h-8 rounded-xl hover:bg-[#f1f5f9] flex items-center justify-center"><X className="w-4 h-4 text-[#64748b]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="adm-section-label block mb-1.5">New Score (1.0 – 5.0)</label>
                <input type="number" min="1" max="5" step="0.1" value={overrideScore} onChange={e => setOverrideScore(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-[13px] font-semibold outline-none" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
              </div>
              <div>
                <label className="adm-section-label block mb-1.5">Reason</label>
                <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOverrideModal(null)} className="flex-1 h-11 rounded-xl text-[12px] font-semibold text-[#64748b]" style={{ border: '1px solid #e9eaec' }}>Cancel</button>
              <button onClick={applyOverride} disabled={overrideLoading} className="flex-1 h-11 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#6366f1' }}>
                {overrideLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Flagged Users', value: overview?.flagged_count ?? '—', icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
          { label: 'Blocked Users', value: overview?.blocked_count ?? '—', icon: UserX, color: '#e11d48', bg: '#fff1f2' },
          { label: 'Avg Trust Score', value: overview?.avg_trust_score ? `${overview.avg_trust_score}/5` : '—', icon: Star, color: '#2563eb', bg: '#eff6ff' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="font-tight text-2xl font-bold text-[#0f172a]">{card.value}</p>
                <p className="adm-section-label mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={activeTab === tab ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
              {tab}
            </button>
          ))}
        </div>
        <button onClick={fetchAll} className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]" style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" /></div>
      ) : (
        <>
          {activeTab === 'Fraud Queue' && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f3f4f6]">
                <p className="font-tight text-[14px] font-bold text-[#0f172a]">Flagged Accounts</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{flagged.length} users awaiting review</p>
              </div>
              <table className="w-full text-left">
                <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  {['User', 'Trust Score', 'Disputes Lost', 'Fraud Flags', ''].map((h, i) => <th key={i} className={`px-5 py-3 adm-section-label ${h === '' ? 'text-right' : ''}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {flagged.map((u: any) => {
                    const rep = Array.isArray(u.reputation) ? u.reputation[0] : u.reputation;
                    const score = rep?.trust_score ?? 0;
                    const bucket = trustBucket(score);
                    return (
                      <tr key={u.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] font-bold text-[#0f172a]">{u.safetag}</p>
                          <p className="text-[10px] text-[#94a3b8]">{u.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="adm-chip text-[10px] font-bold" style={{ color: bucket.color, background: bucket.bg }}>{score.toFixed(1)} — {bucket.label}</span>
                        </td>
                        <td className="px-5 py-3.5 font-tight text-[14px] font-bold text-[#e11d48]">{rep?.disputes_lost ?? 0}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(rep?.fraud_flags || []).map((f: string) => <span key={f} className="adm-chip chip-red text-[9px]">{f}</span>)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={() => clearFlag(u.id)} className="h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors" style={{ background: '#f0fdf4', color: '#059669' }}>
                              <CheckCircle2 className="w-3 h-3" /> Clear
                            </button>
                            <button onClick={() => setOverrideModal({ profileId: u.id, safetag: u.safetag })} className="h-8 px-3 rounded-lg text-[11px] font-bold transition-colors" style={{ background: '#f5f3ff', color: '#6366f1' }}>
                              Score
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {flagged.length === 0 && (
                    <tr><td colSpan={5} className="py-16 text-center">
                      <Shield className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
                      <p className="text-[12px] font-bold text-[#94a3b8]">No flagged accounts</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Leaderboard' && (
            <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f3f4f6]">
                <p className="font-tight text-[14px] font-bold text-[#0f172a]">Top Trust Scores</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">Top 50 users by platform trust score</p>
              </div>
              <table className="w-full text-left">
                <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  {['#', 'User', 'Trust Score', 'Won', 'Lost', ''].map((h, i) => <th key={i} className="px-5 py-3 adm-section-label">{h}</th>)}
                </tr></thead>
                <tbody>
                  {leaderboard.map((u: any, i: number) => {
                    const score = Number(u.trust_score);
                    const bucket = trustBucket(score);
                    const profile = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                    return (
                      <tr key={i} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5 text-[12px] font-black text-[#94a3b8]">{i+1}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] font-bold text-[#0f172a]">{profile?.safetag}</p>
                          <p className="text-[10px] text-[#94a3b8]">{profile?.email}</p>
                        </td>
                        <td className="px-5 py-3.5"><span className="adm-chip font-bold" style={{ color: bucket.color, background: bucket.bg }}>{score.toFixed(1)}</span></td>
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#059669]">{u.disputes_won ?? 0}</td>
                        <td className="px-5 py-3.5 text-[12px] font-bold text-[#e11d48]">{u.disputes_lost ?? 0}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => setOverrideModal({ profileId: u.profile_id, safetag: profile?.safetag })} className="h-8 px-3 rounded-lg text-[11px] font-bold transition-colors" style={{ background: '#f5f3ff', color: '#6366f1' }}>Override</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
