"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Settings, Save, RefreshCw, DollarSign, Percent, TrendingUp } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

interface PlatformSettings {
    platform_fee_rate: number;
    referral_tier1_percent: number;
    referral_tier2_percent: number;
}

export default function AdminSettings() {
    const router = useRouter();
    const [form, setForm] = useState({ feeRate: "5", tier1: "10", tier2: "5" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem("safepadi_admin_token");
            const res = await axios.get(`${API_URL}/admin/settings`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true",
                },
            });
            const data: PlatformSettings = res.data;
            setForm({
                feeRate: (data.platform_fee_rate * 100).toFixed(2),
                tier1: (data.referral_tier1_percent * 100).toFixed(2),
                tier2: (data.referral_tier2_percent * 100).toFixed(2),
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
        if (isNaN(feeVal) || feeVal < 0 || feeVal > 50)
            return "Platform fee must be between 0% and 50%";
        if (isNaN(t1Val) || t1Val < 0 || t1Val > 100)
            return "Tier 1 commission must be between 0% and 100%";
        if (isNaN(t2Val) || t2Val < 0 || t2Val > 100)
            return "Tier 2 commission must be between 0% and 100%";
        if (t1Val + t2Val > 100)
            return `Tier 1 (${t1Val}%) + Tier 2 (${t2Val}%) cannot exceed 100% of the platform fee`;
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) {
            setValidationError(err);
            return;
        }
        setValidationError(null);
        setSaving(true);
        try {
            const token = localStorage.getItem("safepadi_admin_token");
            await axios.patch(
                `${API_URL}/admin/settings`,
                {
                    platform_fee_rate: parseFloat(form.feeRate) / 100,
                    referral_tier1_percent: parseFloat(form.tier1) / 100,
                    referral_tier2_percent: parseFloat(form.tier2) / 100,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                }
            );
            showToast("Settings saved successfully");
            fetchSettings();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to save settings", "error");
        } finally {
            setSaving(false);
        }
    };

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />

            {toast && (
                <div
                    className={cn(
                        "fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300",
                        toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                    )}
                >
                    <span>{toast.type === "success" ? "✅" : "❌"}</span>
                    {toast.msg}
                </div>
            )}

            <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Settings className="w-8 h-8 text-slate-400" />
                            Platform Settings
                        </h1>
                        <p className="text-sm text-slate-400 font-medium mt-1">
                            Configure fee rates and referral commission percentages
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20"
                    >
                        {saving ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {saving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>

                {validationError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-bold">
                        ⚠️ {validationError}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm h-48 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Platform Fee Rate
                                </label>
                                <p className="text-xs text-slate-400 mt-1">
                                    % charged on every transaction amount
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="0.01"
                                    value={form.feeRate}
                                    onChange={(e) => setForm({ ...form, feeRate: e.target.value })}
                                    className="w-full h-12 px-4 pr-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    %
                                </span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Tier 1 Commission
                                </label>
                                <p className="text-xs text-slate-400 mt-1">
                                    % of platform fee paid to direct referrer
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.tier1}
                                    onChange={(e) => setForm({ ...form, tier1: e.target.value })}
                                    className="w-full h-12 px-4 pr-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    %
                                </span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Percent className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Tier 2 Commission
                                </label>
                                <p className="text-xs text-slate-400 mt-1">
                                    % of platform fee paid to indirect referrer
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.tier2}
                                    onChange={(e) => setForm({ ...form, tier2: e.target.value })}
                                    className="w-full h-12 px-4 pr-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[28px] p-8 border border-slate-100 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 mb-6 tracking-tight">
                        Live Preview — On a ${PREVIEW_AMOUNT} Transaction
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Platform Fee Collected
                            </p>
                            <p className="text-2xl font-black text-slate-900">
                                ${previewFee.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">{form.feeRate}% of ${PREVIEW_AMOUNT}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Tier 1 Earns
                            </p>
                            <p className="text-2xl font-black text-emerald-600">
                                ${previewTier1Earn.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">
                                {form.tier1}% of ${previewFee.toFixed(2)} fee
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Tier 2 Earns
                            </p>
                            <p className="text-2xl font-black text-indigo-600">
                                ${previewTier2Earn.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">
                                {form.tier2}% of ${previewFee.toFixed(2)} fee
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Platform Keeps
                            </p>
                            <p
                                className={cn(
                                    "text-2xl font-black",
                                    previewPlatformKeeps < 0 ? "text-rose-600" : "text-blue-600"
                                )}
                            >
                                ${previewPlatformKeeps.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">After referral payouts</p>
                        </div>
                    </div>

                    {tier1PlusTier2 > 1.0 && (
                        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-bold">
                            ⚠️ Tier 1 + Tier 2 exceeds 100% of the fee. Platform would operate at a loss on every referred transaction. Reduce the percentages before saving.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
