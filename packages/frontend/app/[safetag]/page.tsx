'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

// We map simple bot platform names to their actual Deep Link URLs
const BOT_LINKS = {
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/saferr_bot',
    discord: process.env.NEXT_PUBLIC_DISCORD_BOT_URL || 'https://discord.gg/KBmrKmpxAb',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://wa.me/1234567890',
};

export default function SafetagGateway() {
    const params = useParams();
    const rawSafetag = params.safetag as string;
    const safetag = decodeURIComponent(rawSafetag || '').replace(/^@/, '');

    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // As soon as they land here, if there's a safetag, we store it in localStorage 
        // as the 'referred_by' code. This way, if they navigate around the actual website
        // and sign up later, we still have it!
        if (safetag) {
            localStorage.setItem('Safeeely_referral_code', safetag);
        }
    }, [safetag]);

    const handleCopy = () => {
        navigator.clipboard.writeText(safetag);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Construct the deep link that passes the referral code to the bot
    // e.g. https://t.me/safepayng_bot?start=ref_rarktech
    const getBotUrl = (platform: keyof typeof BOT_LINKS) => {
        const baseUrl = BOT_LINKS[platform];
        if (platform === 'telegram') {
            return `${baseUrl}?start=ref_${encodeURIComponent(safetag)}`;
        }
        if (platform === 'discord') {
            return `${baseUrl}?ref=${encodeURIComponent(safetag)}`;
        }
        if (platform === 'whatsapp') {
            return `${baseUrl}?text=Start%20Safeeely%20ref_${encodeURIComponent(safetag)}`;
        }
        return baseUrl;
    };

    const handleDiscordClick = () => {
        const command = `!start ref_${safetag}`;
        navigator.clipboard.writeText(command);
        toast.success(`Copied "${command}" to clipboard! Paste this in Discord to claim your referral.`);
        setTimeout(() => {
            window.location.href = getBotUrl('discord');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                {/* Logo Area */}
                <div className="flex justify-center">
                    <img src="/favicon.ico.png" alt="Safeeely Icon" className="w-16 h-16 object-contain drop-shadow-md rounded-2xl" />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">You're invited!</h1>
                    <p className="text-slate-500 font-medium">Join Safeeely using this referral.</p>
                </div>

                <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
                    <CardContent className="p-8 space-y-8">

                        {/* Inviter Info */}
                        <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-slate-50 rounded-[24px]">
                            <div className="w-16 h-16 bg-white rounded-full border-4 border-slate-50 flex items-center justify-center shadow-sm">
                                <span className="text-slate-900 font-black text-xl">@{safetag.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-900">
                                <span className="font-bold text-lg">@{safetag}</span>
                                <CheckCircle2 size={18} className="text-[#16a34a]" />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Button
                                className="w-full h-14 bg-[#229ED9] hover:bg-[#1CA0DE] text-white rounded-[20px] font-black text-base shadow-lg shadow-blue-500/20"
                                onClick={() => window.location.href = getBotUrl('telegram')}
                            >
                                Continue on Telegram
                            </Button>

                            <Button
                                className="w-full h-14 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[20px] font-black text-base shadow-lg shadow-indigo-500/20"
                                onClick={handleDiscordClick}
                            >
                                Continue on Discord
                            </Button>

                            <Button
                                className="w-full h-14 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-[20px] font-black text-base shadow-lg shadow-green-500/20"
                                onClick={() => window.location.href = getBotUrl('whatsapp')}
                            >
                                Continue on WhatsApp
                            </Button>

                            {/* Future: Add Web here */}
                            <Button
                                variant="outline"
                                className="w-full h-14 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-900 rounded-[20px] font-bold text-sm"
                                disabled
                            >
                                Website Alpha (Coming Soon)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs font-bold text-slate-400">
                    Secure Escrow & Payouts for Africans.
                </p>
            </div>
        </div>
    );
}
