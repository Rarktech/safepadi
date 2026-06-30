"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Settings, Save, RefreshCw, DollarSign, Percent, TrendingUp, Users, Calendar, BadgeDollarSign } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

interface PlatformSettings {
  platform_fee_rate: number;
  referral_tier1_percent: number;
  referral_tier2_percent: number;
  community_free_revenue_share?: number;
  community_pro_revenue_share?: number;
  community_enterprise_revenue_share?: number;
  community_pro_price?: number;
  community_enterprise_price?: number;
  community_pro_duration_days?: number;
  community_enterprise_duration_days?: number;
}

export default function AdminSettings() {
  const router = useRouter();
  const [form, setForm] = useState({ feeRate: "5", tier1: "10", tier2: "5" });
  const [communityForm, setCommunityForm] = useState({
    freeShare: "10", proShare: "25", enterpriseShare: "40",
    proPrice: "15000", enterprisePrice: "35000",
    proDuration: "30", enterpriseDuration: "30",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const PREVIEW_AMOUNT = 100;
  const previewFeeRate = (parseFloat(form.feeRate) || 0) / 100;
  const previewTier1 = (parseFloat(form.tier1) || 0) / 100;
  const previewTier2 = (parseFloat(form.tier2) || 0) / 100;
  const previewFee = PREVIEW_AMOUNT * previewFeeRate;
  const previewTier1Earn = previewFee * previewTier1;
  const previewTier2Earn = previewFee * previewTier2;
  const previewPlatformKeeps = previewFee - previewTier1Earn - previewTier2Earn;
  const tier1PlusTier2 = previewTier1 + previewTier2;

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/settings`, {
        withCredentials: true, headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data: PlatformSettings = res.data;
      setForm({
        feeRate: (data.platform_fee_rate * 100).toFixed(2),
        tier1: (data.referral_tier1_percent * 100).toFixed(2),
        tier2: (data.referral_tier2_percent * 100).toFixed(2),
      });
      setCommunityForm({
        freeShare: String(data.community_free_revenue_share ?? 10),
        proShare: String(data.community_pro_revenue_share ?? 25),
        enterpriseShare: String(data.community_enterprise_revenue_share ?? 40),
        proPrice: String(data.community_pro_price ?? 15000),
        enterprisePrice: String(data.community_enterprise_price ?? 35000),
        proDuration: String(data.community_pro_duration_days ?? 30),
        enterpriseDuration: String(data.community_enterprise_duration_days ?? 30),
      });
    } catch (err: any) {
      if (err.response?.status === 401) router.push("/admin/login");
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const validate = (): string | null => {
    const feeVal = parseFloat(form.feeRate);
    const t1Val = parseFloat(form.tier1);
    const t2Val = parseFloat(form.tier2);
    if (isNaN(feeVal) || feeVal < 0 || feeVal > 50) return "Platform fee must be between 0% and 50%";
    if (isNaN(t1Val) || t1Val < 0 || t1Val > 100) return "Tier 1 commission must be between 0% and 100%";
    if (isNaN(t2Val) || t2Val < 0 || t2Val > 100) return "Tier 2 commission must be between 0% and 100%";
    if (t1Val + t2Val > 100) return `Tier 1 (${t1Val}%) + Tier 2 (${t2Val}%) cannot exceed 100% of the platform fee`;
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setValidationError(err); return; }
    setValidationError(null); setSaving(true);
    try {
      await axios.patch(`${API_URL}/admin/settings`, {
        platform_fee_rate: parseFloat(form.feeRate) / 100,
        referral_tier1_percent: parseFloat(form.tier1) / 100,
        referral_tier2_percent: parseFloat(form.tier2) / 100,
      }, { withCredentials: true, headers: { "ngrok-skip-browser-warning": "true" } });
      showToast("Settings saved successfully"); fetchSettings();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to save settings", "error");
    } finally { setSaving(false); }
  };

  const handleSaveCommunity = async () => {
    setSavingCommunity(true);
    try {
      await axios.patch(`${API_URL}/admin/settings`, {
        community_free_revenue_share: parseFloat(communityForm.freeShare),
        community_pro_revenue_share: parseFloat(communityForm.proShare),
        community_enterprise_revenue_share: parseFloat(communityForm.enterpriseShare),
        community_pro_price: parseFloat(communityForm.proPrice),
        community_enterprise_price: parseFloat(communityForm.enterprisePrice),
        community_pro_duration_days: parseInt(communityForm.proDuration, 10),
        community_enterprise_duration_days: parseInt(communityForm.enterpriseDuration, 10),
      }, { withCredentials: true, headers: { "ngrok-skip-browser-warning": "true" } });
      showToast("Community settings saved"); fetchSettings();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to save community settings", "error");
    } finally { setSavingCommunity(false); }
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  };

  const numInput = (value: string, onChange: (v: string) => void, suffix = '%', min = 0, max = 100, step = '0.01') => (
    <div className="relative">
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-11 px-4 pr-8 rounded-xl text-[13px] font-semibold outline-none transition-all"
        style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#94a3b8]">{suffix}</span>
    </div>
  );

  return (
    <AdminShell title="Platform Settings" subtitle="Configure fee rates and referral commission percentages">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {validationError && (
        <div className="p-4 rounded-xl text-[13px] font-semibold" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48' }}>
          ⚠️ {validationError}
        </div>
      )}

      {/* Fee + Commission cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#e9eaec] h-44 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="font-tight text-[15px] font-bold text-[#0f172a]">Fee & Commission Rates</p>
            <button onClick={handleSave} disabled={saving || loading}
              className="h-9 px-5 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: '#0f172a' }}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Platform Fee Rate", desc: "% charged on every transaction amount", key: "feeRate", icon: DollarSign, max: 50 },
              { label: "Tier 1 Commission", desc: "% of platform fee paid to direct referrer", key: "tier1", icon: TrendingUp },
              { label: "Tier 2 Commission", desc: "% of platform fee paid to indirect referrer", key: "tier2", icon: Percent },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.key} className="bg-white rounded-2xl border border-[#e9eaec] p-5 space-y-4">
                  <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#64748b]" />
                  </div>
                  <div>
                    <p className="adm-section-label">{f.label}</p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">{f.desc}</p>
                  </div>
                  {numInput((form as any)[f.key], v => setForm({ ...form, [f.key]: v }), '%', 0, f.max || 100)}
                </div>
              );
            })}
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
            <p className="font-tight text-[14px] font-bold text-[#0f172a] mb-5">Live Preview — On a ${PREVIEW_AMOUNT} Transaction</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Platform Fee", value: `$${previewFee.toFixed(2)}`, sub: `${form.feeRate}% of $${PREVIEW_AMOUNT}`, color: "#0f172a" },
                { label: "Tier 1 Earns", value: `$${previewTier1Earn.toFixed(2)}`, sub: `${form.tier1}% of fee`, color: "#059669" },
                { label: "Tier 2 Earns", value: `$${previewTier2Earn.toFixed(2)}`, sub: `${form.tier2}% of fee`, color: "#6366f1" },
                { label: "Platform Keeps", value: `$${previewPlatformKeeps.toFixed(2)}`, sub: "After referral payouts", color: previewPlatformKeeps < 0 ? "#e11d48" : "#2563eb" },
              ].map(p => (
                <div key={p.label} className="space-y-1">
                  <p className="adm-section-label">{p.label}</p>
                  <p className="font-tight text-xl font-bold" style={{ color: p.color }}>{p.value}</p>
                  <p className="text-[11px] text-[#94a3b8]">{p.sub}</p>
                </div>
              ))}
            </div>
            {tier1PlusTier2 > 1.0 && (
              <div className="mt-5 p-3.5 rounded-xl text-[12px] font-semibold" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}>
                ⚠️ Tier 1 + Tier 2 exceeds 100% of the fee. Platform would operate at a loss on every referred transaction.
              </div>
            )}
          </div>

          {/* Community licensing */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f3ff] flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#7c3aed]" />
                </div>
                <div>
                  <p className="font-tight text-[14px] font-bold text-[#0f172a]">Community Licensing</p>
                  <p className="text-[11px] text-[#94a3b8]">Revenue share %, pricing, and subscription duration per tier</p>
                </div>
              </div>
              <button onClick={handleSaveCommunity} disabled={savingCommunity || loading}
                className="h-9 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
                style={{ background: '#7c3aed' }}>
                {savingCommunity ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {savingCommunity ? "Saving…" : "Save"}
              </button>
            </div>

            {/* Revenue share */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BadgeDollarSign className="w-3.5 h-3.5 text-[#94a3b8]" />
                <p className="adm-section-label">Revenue Share (%)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Free Tier", key: "freeShare" },
                  { label: "Pro Tier", key: "proShare" },
                  { label: "Enterprise Tier", key: "enterpriseShare" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[12px] font-semibold text-[#64748b] block mb-1.5">{f.label}</label>
                    {numInput((communityForm as any)[f.key], v => setCommunityForm({ ...communityForm, [f.key]: v }))}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & Duration */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
                <p className="adm-section-label">Pricing & Duration</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "Pro", color: "#2563eb", priceKey: "proPrice", durKey: "proDuration" },
                  { label: "Enterprise", color: "#d97706", priceKey: "enterprisePrice", durKey: "enterpriseDuration" },
                ].map(tier => (
                  <div key={tier.label} className="space-y-3">
                    <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: tier.color }}>{tier.label}</p>
                    <div>
                      <label className="text-[12px] font-semibold text-[#64748b] block mb-1.5">Price (NGN)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#94a3b8]">₦</span>
                        <input type="number" min={0} step={100}
                          value={(communityForm as any)[tier.priceKey]}
                          onChange={e => setCommunityForm({ ...communityForm, [tier.priceKey]: e.target.value })}
                          className="w-full h-11 pl-8 pr-4 rounded-xl text-[13px] font-semibold outline-none"
                          style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-[#64748b] block mb-1.5">Duration (days)</label>
                      {numInput((communityForm as any)[tier.durKey], v => setCommunityForm({ ...communityForm, [tier.durKey]: v }), 'days', 1, 9999, '1')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
