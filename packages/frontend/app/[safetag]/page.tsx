'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const BOT_LINKS = {
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/saferr_bot',
    discord:  process.env.NEXT_PUBLIC_DISCORD_BOT_URL  || 'https://discord.gg/KBmrKmpxAb',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://wa.me/1234567890',
};

type PlatformId = 'telegram' | 'discord' | 'whatsapp' | 'instagram' | 'messenger';

type PlatformData = {
    name: string;
    live: boolean;
    cta?: string;
    s1?: string;
    s2?: string;
};

const DATA: Record<PlatformId, PlatformData> = {
    telegram:  { name: 'Telegram', cta: 'Open Telegram', s1: 'Tap the button below to open Telegram.', s2: 'Your referral is pre-loaded — just press Start.', live: true },
    discord:   { name: 'Discord',  cta: 'Open Discord',  s1: 'Tap the button below to open Discord.',  s2: 'Send the pre-filled message to start the bot.', live: true },
    whatsapp:  { name: 'WhatsApp', cta: 'Open WhatsApp', s1: 'Tap the button below to open WhatsApp.', s2: 'The message is pre-filled — just hit Send.', live: true },
    instagram: { name: 'Instagram', live: false },
    messenger: { name: 'Messenger', live: false },
};

// ── Brand SVG icons (verbatim from design) ──────────────────────────────────

const TelegramIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff"><path d="M9.04 15.3 8.88 19c.4 0 .57-.17.78-.38l1.87-1.8 3.88 2.85c.71.39 1.22.19 1.41-.66l2.56-12.05c.23-1.06-.38-1.48-1.08-1.22L3.4 9.84c-1.04.4-1.02.97-.18 1.23l3.83 1.2 8.9-5.6c.42-.28.8-.13.49.15z"/></svg>
);

const DiscordIcon = ({ size = 25 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff"><path d="M19.3 5.4A16.6 16.6 0 0 0 15.1 4l-.2.4a15.4 15.4 0 0 1 3.7 1.2 13 13 0 0 0-11.2 0A15.4 15.4 0 0 1 11 4l-.2-.4A16.6 16.6 0 0 0 6.6 5.4 17.6 17.6 0 0 0 3.7 17a16.8 16.8 0 0 0 5.1 1.6l.6-1c-.55-.2-1.07-.46-1.56-.78l.13-.1a11.9 11.9 0 0 0 10.06 0l.13.1c-.49.32-1.01.58-1.56.78l.6 1A16.8 16.8 0 0 0 22.3 17 17.6 17.6 0 0 0 19.3 5.4ZM9.5 14.3c-.79 0-1.45-.74-1.45-1.65s.64-1.65 1.45-1.65 1.46.74 1.45 1.65c0 .91-.65 1.65-1.45 1.65Zm5 0c-.79 0-1.45-.74-1.45-1.65s.64-1.65 1.45-1.65 1.46.74 1.45 1.65c0 .91-.65 1.65-1.45 1.65Z"/></svg>
);

const WhatsAppIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.46 15.3L2 22l4.85-1.27A10 10 0 1 0 12 2Zm5.7 14.13c-.24.68-1.4 1.3-1.95 1.34-.5.05-1.14.07-1.84-.12-.42-.13-.97-.31-1.67-.61-2.94-1.27-4.86-4.23-5-4.43-.15-.2-1.2-1.6-1.2-3.04 0-1.45.76-2.16 1.03-2.46.27-.3.58-.37.78-.37h.56c.18 0 .42-.07.66.5l.8 1.96c.07.16.11.35.01.55-.1.2-.15.32-.3.5l-.45.52c-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08l.93-1.08c.21-.25.39-.2.65-.1l1.84.87c.27.13.45.2.51.31.07.12.07.68-.17 1.36Z"/></svg>
);

const InstagramIcon = ({ size = 23 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5.4" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="2"/><circle cx="17.2" cy="6.8" r="1.3" fill="#fff"/></svg>
);

const MessengerIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff"><path d="M12 2.2C6.4 2.2 2.2 6.3 2.2 11.6c0 2.86 1.3 5.36 3.42 7.06v3.14l3.15-1.73c.84.23 1.73.36 2.64.36 5.6 0 9.8-4.1 9.8-9.4S17.6 2.2 12 2.2Zm.97 12.58-2.5-2.66-4.86 2.66 5.34-5.67 2.56 2.66 4.8-2.66-5.34 5.67Z"/></svg>
);

const ArrowRightIcon = ({ size = 18, stroke = '#b4bcc8' }: { size?: number; stroke?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
);

const CheckBadgeIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#10b981" style={{ marginLeft: -3 }}><path d="M12 2l2.4 1.7 2.9-.3 1.2 2.7 2.6 1.3-.6 2.9.6 2.9-2.6 1.3-1.2 2.7-2.9-.3L12 22l-2.4-1.7-2.9.3-1.2-2.7L2.9 16.6l.6-2.9-.6-2.9 2.6-1.3 1.2-2.7 2.9.3z"/><path d="M10.5 14.2l-1.9-1.9-1.2 1.2 3.1 3.1 5.4-5.4-1.2-1.2z" fill="#fff"/></svg>
);

const LockIcon = ({ size = 13, stroke = '#94a3b8', strokeWidth = '2' }: { size?: number; stroke?: string; strokeWidth?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth}><rect x="4.5" y="11" width="15" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
);

const CloseIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
);

const PLATFORM_ICON: Record<PlatformId, React.ReactNode> = {
    telegram: <TelegramIcon size={23} />,
    discord: <DiscordIcon size={24} />,
    whatsapp: <WhatsAppIcon size={23} />,
    instagram: <InstagramIcon size={22} />,
    messenger: <MessengerIcon size={23} />,
};

const PLATFORM_GRADIENT: Record<PlatformId, string> = {
    telegram: 'linear-gradient(135deg,#2AABEE,#229ED9)',
    discord: 'linear-gradient(135deg,#5865F2,#4752c4)',
    whatsapp: 'linear-gradient(135deg,#25D366,#12b150)',
    instagram: 'linear-gradient(135deg,#feda75,#d62976 55%,#962fbf)',
    messenger: 'linear-gradient(135deg,#00B2FF,#006AFF 60%,#A033FF)',
};

// ──────────────────────────────────────────────────────────────────────────

export default function SafetagGateway() {
    const params = useParams();
    const rawSafetag = params.safetag as string;
    const safetag = decodeURIComponent(rawSafetag || '').replace(/^@/, '');

    const [selected, setSelected] = useState<PlatformId | null>(null);

    useEffect(() => {
        if (safetag) localStorage.setItem('Safeeely_referral_code', safetag);
    }, [safetag]);

    const openTg = () => setSelected('telegram');
    const openDc = () => setSelected('discord');
    const openWa = () => setSelected('whatsapp');
    const openIg = () => setSelected('instagram');
    const openMs = () => setSelected('messenger');
    const close = () => setSelected(null);

    const handleCta = (platform: PlatformId) => {
        if (platform === 'telegram') {
            window.open(`${BOT_LINKS.telegram}?start=ref_${encodeURIComponent(safetag)}`, '_blank');
        } else if (platform === 'discord') {
            navigator.clipboard.writeText(`!start ref_${safetag}`)
                .then(() => toast.success('Command copied! Paste it in Discord.'))
                .catch(() => {});
            window.open(BOT_LINKS.discord, '_blank');
        } else if (platform === 'whatsapp') {
            window.open(`${BOT_LINKS.whatsapp}?text=ref_${encodeURIComponent(safetag)}`, '_blank');
        }
        close();
    };

    const d = selected ? DATA[selected] : null;
    const modalLive = !!(d && d.live);
    const modalSoon = !!(d && !d.live);

    return (
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#ffffff', overflow: 'hidden' }}>
            <style jsx>{`
                @keyframes sfBobA { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(3deg); } }
                @keyframes sfBobB { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(-3deg); } }
                @keyframes sfBobC { 0%,100% { transform: translateY(0) rotate(1deg); } 50% { transform: translateY(-17px) rotate(-2deg); } }
                @keyframes sfRise { from { transform: translateY(24px); } to { transform: translateY(0); } }
                @keyframes sfFade { from { transform: translateY(10px); } to { transform: translateY(0); } }
                @keyframes sfPop { from { transform: translateY(18px) scale(.97); } to { transform: translateY(0) scale(1); } }
                @media (max-width: 600px) {
                    .sf-rf-pad { padding-top: 56px !important; }
                    .sf-rf-coin-tg { width: 100px !important; top: 78px !important; left: -34px !important; }
                    .sf-rf-coin-dc { width: 60px !important; top: 50px !important; right: -18px !important; }
                    .sf-rf-coin-wa { width: 96px !important; bottom: 110px !important; right: -34px !important; }
                }
                .sf-rf-live-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(15,23,42,.10); border-color: #dde2e9; }
                .sf-rf-soon-btn:hover { border-color: #e3e7ec; background: #fff; }
                .sf-rf-close-btn:hover { background: #e9edf1; }
                .sf-rf-cta:hover { transform: translateY(-2px); background: #1e293b; }
            `}</style>

            {/* top brand glow */}
            <div style={{ position: 'absolute', top: -220, left: '50%', transform: 'translateX(-50%)', width: 900, height: 560, background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,185,129,.16) 0%, rgba(16,185,129,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />

            {/* floating brand coins */}
            <img className="sf-rf-coin sf-rf-coin-tg" src="/assets/coin-telegram.webp" alt="" style={{ position: 'absolute', width: 148, height: 'auto', top: 120, left: -50, zIndex: 1, pointerEvents: 'none', animation: 'sfBobA 7s ease-in-out infinite', filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.18))' }} />
            <img className="sf-rf-coin sf-rf-coin-dc" src="/assets/coin-discord.webp" alt="" style={{ position: 'absolute', width: 104, height: 'auto', top: 90, right: -30, zIndex: 1, pointerEvents: 'none', animation: 'sfBobB 8.4s ease-in-out infinite', filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.18))' }} />
            <img className="sf-rf-coin sf-rf-coin-wa" src="/assets/coin-whatsapp.webp" alt="" style={{ position: 'absolute', width: 220, height: 'auto', bottom: 40, right: -64, zIndex: 1, pointerEvents: 'none', animation: 'sfBobC 9s ease-in-out infinite', filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.18))' }} />

            {/* content */}
            <div className="sf-rf-pad" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 22px 60px', maxWidth: 520, margin: '0 auto' }}>

                <img src="/assets/safeeely-logo.png" alt="Safeeely" style={{ height: 25, width: 'auto', display: 'block', objectFit: 'contain', animation: 'sfRise .7s cubic-bezier(.16,1,.3,1) both' }} />

                {/* referrer chip */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 40, padding: '7px 16px 7px 7px', background: '#fff', border: '1px solid #eceef2', borderRadius: 999, boxShadow: '0 4px 16px rgba(15,23,42,.05)', animation: 'sfRise .7s cubic-bezier(.16,1,.3,1) .06s both' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#34d399,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        <img src="/assets/character.png" alt="" style={{ width: 30, height: 30, objectFit: 'cover', objectPosition: 'center 20%' }} />
                    </span>
                    <span style={{ fontFamily: "'Inter Tight',sans-serif", fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>@{safetag}</span>
                    <CheckBadgeIcon />
                    <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500, paddingRight: 6, whiteSpace: 'nowrap' }}>invited you</span>
                </div>

                {/* headline */}
                <h1 style={{ fontFamily: "'Inter Tight',sans-serif", fontWeight: 400, fontSize: 41, lineHeight: 1.08, letterSpacing: '-.035em', color: '#0f172a', margin: '24px 0 14px', animation: 'sfRise .8s cubic-bezier(.16,1,.3,1) .12s both' }}>
                    You&apos;re invited<br />to join <span style={{ fontWeight: 700 }}>Safeeely</span>
                </h1>
                <p style={{ fontSize: 16.5, lineHeight: 1.6, color: '#64748b', maxWidth: 400, margin: '0 0 34px', fontWeight: 450, animation: 'sfRise .8s cubic-bezier(.16,1,.3,1) .18s both' }}>
                    Pick where you&apos;d like to continue. Your referral is saved automatically — start a secure deal in seconds.
                </p>

                {/* card */}
                <div style={{ width: '100%', background: '#fff', border: '1px solid #edeff3', borderRadius: 26, boxShadow: '0 24px 60px rgba(15,23,42,.08)', padding: '26px 22px', textAlign: 'left', animation: 'sfRise .9s cubic-bezier(.16,1,.3,1) .24s both' }}>

                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#a4adba', textTransform: 'uppercase', margin: '2px 0 14px' }}>Continue with</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="sf-rf-live-btn" onClick={openTg} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 15px', border: '1px solid #eceef2', borderRadius: 16, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .18s,box-shadow .18s,border-color .18s' }}>
                            <span style={{ width: 46, height: 46, borderRadius: 13, background: PLATFORM_GRADIENT.telegram, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <TelegramIcon size={24} />
                            </span>
                            <span style={{ fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16.5, color: '#0f172a', flex: 1 }}>Telegram</span>
                            <ArrowRightIcon />
                        </button>
                        <button className="sf-rf-live-btn" onClick={openDc} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 15px', border: '1px solid #eceef2', borderRadius: 16, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .18s,box-shadow .18s,border-color .18s' }}>
                            <span style={{ width: 46, height: 46, borderRadius: 13, background: PLATFORM_GRADIENT.discord, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <DiscordIcon size={25} />
                            </span>
                            <span style={{ fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16.5, color: '#0f172a', flex: 1 }}>Discord</span>
                            <ArrowRightIcon />
                        </button>
                        <button className="sf-rf-live-btn" onClick={openWa} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 15px', border: '1px solid #eceef2', borderRadius: 16, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .18s,box-shadow .18s,border-color .18s' }}>
                            <span style={{ width: 46, height: 46, borderRadius: 13, background: PLATFORM_GRADIENT.whatsapp, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <WhatsAppIcon size={24} />
                            </span>
                            <span style={{ fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16.5, color: '#0f172a', flex: 1 }}>WhatsApp</span>
                            <ArrowRightIcon />
                        </button>
                    </div>

                    {/* coming soon divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#a4adba', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Coming soon</span>
                        <span style={{ height: 1, flex: 1, background: '#eef1f4' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="sf-rf-soon-btn" onClick={openIg} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 15px', border: '1px solid #f1f3f6', borderRadius: 16, background: '#fafbfc', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .18s,background .18s' }}>
                            <span style={{ width: 46, height: 46, borderRadius: 13, background: PLATFORM_GRADIENT.instagram, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: .78 }}>
                                <InstagramIcon size={23} />
                            </span>
                            <span style={{ fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16.5, color: '#64748b', flex: 1 }}>Instagram</span>
                            <span style={{ background: '#eef1f4', color: '#7c8696', fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 999, letterSpacing: '.03em' }}>Soon</span>
                        </button>
                        <button className="sf-rf-soon-btn" onClick={openMs} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 15px', border: '1px solid #f1f3f6', borderRadius: 16, background: '#fafbfc', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .18s,background .18s' }}>
                            <span style={{ width: 46, height: 46, borderRadius: 13, background: PLATFORM_GRADIENT.messenger, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: .78 }}>
                                <MessengerIcon size={24} />
                            </span>
                            <span style={{ fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16.5, color: '#64748b', flex: 1 }}>Messenger</span>
                            <span style={{ background: '#eef1f4', color: '#7c8696', fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 999, letterSpacing: '.03em' }}>Soon</span>
                        </button>
                    </div>
                </div>

                {/* trust footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 26, animation: 'sfFade .9s ease .4s both' }}>
                    <LockIcon size={13} stroke="#94a3b8" strokeWidth="2" />
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.02em', color: '#94a3b8' }}>Secure escrow &amp; payouts — your referral is saved automatically</span>
                </div>
                <Link href="/" style={{ marginTop: 14, fontSize: 13.5, fontWeight: 600, color: '#0f172a', textDecoration: 'none', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 1, animation: 'sfFade .9s ease .46s both' }}>New to Safeeely? See how it works →</Link>
            </div>

            {/* ===================== MODAL ===================== */}
            {selected && d && (
                <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,.42)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, animation: 'sfFade .2s ease both' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 412, background: '#fff', borderRadius: 24, boxShadow: '0 30px 80px rgba(15,23,42,.28)', padding: '26px 24px 24px', animation: 'sfPop .34s cubic-bezier(.16,1,.3,1) both' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
                            <span style={{ width: 44, height: 44, borderRadius: 13, background: PLATFORM_GRADIENT[selected], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {PLATFORM_ICON[selected]}
                            </span>

                            <div style={{ flex: 1 }}>
                                {modalLive && (
                                    <>
                                        <p style={{ margin: 0, fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', letterSpacing: '-.01em' }}>Continue on {d.name}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#94a3b8', fontWeight: 500 }}>Two quick steps</p>
                                    </>
                                )}
                                {modalSoon && (
                                    <>
                                        <p style={{ margin: 0, fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f172a', letterSpacing: '-.01em' }}>{d.name} — coming soon</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#94a3b8', fontWeight: 500 }}>Bot in the works</p>
                                    </>
                                )}
                            </div>
                            <button className="sf-rf-close-btn" onClick={close} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: '#f4f6f8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
                                <CloseIcon />
                            </button>
                        </div>

                        {modalLive && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#d1fae5', color: '#047857', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>1</span>
                                        <span style={{ fontSize: 15, lineHeight: 1.5, color: '#334155', fontWeight: 450 }}>{d.s1}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#d1fae5', color: '#047857', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>2</span>
                                        <span style={{ fontSize: 15, lineHeight: 1.5, color: '#334155', fontWeight: 450 }}>{d.s2}</span>
                                    </div>
                                </div>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleCta(selected); }} className="sf-rf-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', background: '#0f172a', color: '#fff', textDecoration: 'none', borderRadius: 999, padding: 15, fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16, boxShadow: '0 10px 24px rgba(15,23,42,.22)', transition: 'transform .18s,background .18s', whiteSpace: 'nowrap' }}>
                                    {d.cta}
                                    <ArrowRightIcon size={17} stroke="#fff" />
                                </a>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 13 }}>
                                    <LockIcon size={11} stroke="#10b981" strokeWidth="2.2" />
                                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', color: '#10b981', textTransform: 'uppercase' }}>Your referral is saved automatically</span>
                                </div>
                            </>
                        )}

                        {modalSoon && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4px 4px 0' }}>
                                <img src="/assets/character.png" alt="" style={{ width: 78, height: 78, objectFit: 'contain', marginBottom: 14 }} />
                                <p style={{ margin: '0 0 6px', fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 17, color: '#0f172a', letterSpacing: '-.01em' }}>We&apos;re still building this</p>
                                <p style={{ margin: '0 0 20px', fontSize: 14.5, lineHeight: 1.55, color: '#64748b', fontWeight: 450, maxWidth: 300 }}>The {d.name} bot isn&apos;t live yet. Hop on Telegram, Discord, or WhatsApp instead — your referral carries over automatically.</p>
                                <button onClick={openTg} className="sf-rf-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 999, padding: 15, fontFamily: "'Inter Tight',sans-serif", fontWeight: 700, fontSize: 16, boxShadow: '0 10px 24px rgba(15,23,42,.22)', transition: 'transform .18s,background .18s', whiteSpace: 'nowrap' }}>
                                    Continue on Telegram
                                    <ArrowRightIcon size={17} stroke="#fff" />
                                </button>
                                <button onClick={close} style={{ marginTop: 11, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#94a3b8', padding: 4 }}>Maybe later</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
