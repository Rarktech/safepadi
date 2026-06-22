'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

const PLATFORM_LABEL: Record<string, string> = {
    telegram: 'Telegram',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    apple: 'Apple Messages',
    messenger: 'Messenger',
};

const PLATFORM_ICON: Record<string, string> = {
    telegram: '✈️',
    discord: '🎮',
    whatsapp: '💬',
    instagram: '📷',
    apple: '🍎',
    messenger: '💬',
};

export const AccountInfoSection = ({ safetag, createdAt }: { safetag: string; createdAt?: string | null }) => {
    const [linked, setLinked] = useState<{ platform: string; platform_id: string; is_primary: boolean }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!safetag) return;
        api.get(`/profiles/${safetag}/linked-accounts`)
            .then(res => setLinked(Array.isArray(res.data) ? res.data : []))
            .catch(() => setLinked([]))
            .finally(() => setLoading(false));
    }, [safetag]);

    const memberSince = createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '—';

    return (
        <div className="bg-white border border-[#e9eaec] rounded-[18px] p-6">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2.2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <div>
                    <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Account</h2>
                    <p className="text-[11.5px] text-[#94a3b8] mt-px">Account creation and linked platforms</p>
                </div>
            </div>

            <div className="flex flex-col gap-1 rounded-xl overflow-hidden border border-[#e9eaec] mb-4">
                <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                    <span className="text-[13px] font-medium text-[#64748b]">Member since</span>
                    <span className="text-[13px] font-bold text-[#0f172a]">{memberSince}</span>
                </div>
            </div>

            <p className="text-[11px] font-medium text-[#b0bac6] mb-2.5 uppercase tracking-wider">Linked platforms</p>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />)}
                </div>
            ) : linked.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {linked.map((l) => (
                        <div key={`${l.platform}-${l.platform_id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fafafa] border border-[#f1f5f9]">
                            <span className="text-base flex-shrink-0">{PLATFORM_ICON[l.platform] || '🔗'}</span>
                            <span className="text-[13px] font-bold text-[#0f172a] flex-1">{PLATFORM_LABEL[l.platform] || l.platform}</span>
                            {l.is_primary && (
                                <span className="text-[9.5px] font-bold text-white bg-[#0f172a] px-2 py-0.5 rounded-full flex-shrink-0">Primary</span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[12.5px] text-[#94a3b8]">No linked platforms found.</p>
            )}
        </div>
    );
};
