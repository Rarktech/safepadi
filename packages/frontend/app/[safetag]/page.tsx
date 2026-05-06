'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const BOT_LINKS = {
    telegram:  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL   || 'https://t.me/saferr_bot',
    discord:   process.env.NEXT_PUBLIC_DISCORD_BOT_URL    || 'https://discord.gg/KBmrKmpxAb',
    whatsapp:  process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL   || 'https://wa.me/1234567890',
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_BOT_URL  || 'https://ig.me/m/safeeely',
    messenger: process.env.NEXT_PUBLIC_MESSENGER_BOT_URL  || 'https://m.me/safeeely',
};

// ── Brand SVG icons ────────────────────────────────────────────────────────────

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#229ED9] shrink-0">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
    </svg>
);

const DiscordIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#5865F2] shrink-0">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.016.01.033.02.041a19.904 19.904 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
);

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#25D366] shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0" style={{ color: '#E1306C' }}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);

const MessengerIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0084FF] shrink-0">
        <path d="M12 0C5.374 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.626 0 12-4.974 12-11.111C24 4.975 18.626 0 12 0zm1.193 14.963-3.056-3.259-5.963 3.259L10.733 8.4l3.13 3.259L19.752 8.4l-6.559 6.563z"/>
    </svg>
);

// ──────────────────────────────────────────────────────────────────────────────

export default function SafetagGateway() {
    const params = useParams();
    const rawSafetag = params.safetag as string;
    const safetag = decodeURIComponent(rawSafetag || '').replace(/^@/, '');

    useEffect(() => {
        if (safetag) localStorage.setItem('Safeeely_referral_code', safetag);
    }, [safetag]);

    const getBotUrl = (platform: keyof typeof BOT_LINKS) => {
        const baseUrl = BOT_LINKS[platform];
        if (platform === 'telegram')  return `${baseUrl}?start=ref_${encodeURIComponent(safetag)}`;
        if (platform === 'discord')   return `${baseUrl}?ref=${encodeURIComponent(safetag)}`;
        if (platform === 'whatsapp')  return `${baseUrl}?text=Start%20Safeeely%20ref_${encodeURIComponent(safetag)}`;
        if (platform === 'instagram') return `${baseUrl}`;
        if (platform === 'messenger') return `${baseUrl}`;
        return baseUrl;
    };

    const handleDiscordClick = () => {
        const command = `!start ref_${safetag}`;
        navigator.clipboard.writeText(command);
        toast.success(`Copied "${command}" to clipboard! Paste this in Discord to claim your referral.`);
        setTimeout(() => { window.location.href = getBotUrl('discord'); }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                {/* Logo */}
                <div className="flex justify-center">
                    <img src="/logo-mark.svg" alt="Safeeely" className="w-16 h-16 object-contain drop-shadow-md" />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">You're invited!</h1>
                    <p className="text-slate-500 font-medium">Join Safeeely using this referral.</p>
                </div>

                <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
                    <CardContent className="p-8 space-y-6">

                        {/* Inviter Info — background card */}
                        <div
                            className="flex flex-col items-center justify-start rounded-[24px] overflow-hidden relative min-h-[160px] pt-6"
                            style={{ backgroundImage: "url('/safetag.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xl text-slate-900 drop-shadow-sm">@{safetag}</span>
                                <CheckCircle2 size={18} className="text-[#10b981]" />
                            </div>
                        </div>

                        {/* Platform buttons */}
                        <div className="space-y-3">
                            <Button
                                className="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 rounded-[20px] font-black text-base shadow-sm justify-start gap-3 px-5"
                                onClick={() => window.location.href = getBotUrl('telegram')}
                            >
                                <TelegramIcon />
                                Continue on Telegram
                            </Button>

                            <Button
                                className="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 rounded-[20px] font-black text-base shadow-sm justify-start gap-3 px-5"
                                onClick={handleDiscordClick}
                            >
                                <DiscordIcon />
                                Continue on Discord
                            </Button>

                            <Button
                                className="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 rounded-[20px] font-black text-base shadow-sm justify-start gap-3 px-5"
                                onClick={() => window.location.href = getBotUrl('whatsapp')}
                            >
                                <WhatsAppIcon />
                                Continue on WhatsApp
                            </Button>

                            <Button
                                className="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 rounded-[20px] font-black text-base shadow-sm justify-start gap-3 px-5"
                                onClick={() => window.location.href = getBotUrl('instagram')}
                            >
                                <InstagramIcon />
                                Continue on Instagram
                            </Button>

                            <Button
                                className="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 rounded-[20px] font-black text-base shadow-sm justify-start gap-3 px-5"
                                onClick={() => window.location.href = getBotUrl('messenger')}
                            >
                                <MessengerIcon />
                                Continue on Messenger
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
