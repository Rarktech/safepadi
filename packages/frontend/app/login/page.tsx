'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { OtpInput, focusOtpBox } from '@/components/auth/OtpInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next');
    const reason = searchParams.get('reason');

    const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [sending, setSending] = useState(false);
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [showExpiredBanner, setShowExpiredBanner] = useState(!!reason);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!showExpiredBanner) return;
        const t = setTimeout(() => setShowExpiredBanner(false), 6000);
        return () => clearTimeout(t);
    }, [showExpiredBanner]);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const startResendTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setResendCountdown(60);
        setCanResend(false);
        timerRef.current = setInterval(() => {
            setResendCountdown((c) => {
                if (c <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setCanResend(true);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async () => {
        const trimmed = email.trim();
        if (!trimmed) { setEmailError('Please enter your email address'); return; }
        if (!EMAIL_RE.test(trimmed)) { setEmailError('Please enter a valid email address'); return; }

        setSending(true);
        setEmailError('');
        try {
            await api.post('/auth/account-otp/send', { email: trimmed, purpose: 'web_login' });
            setStep('otp');
            startResendTimer();
            setTimeout(() => focusOtpBox(0), 100);
        } catch (err) {
            setEmailError(apiErrorMessage(err, 'Could not send code. Please try again.'));
        } finally {
            setSending(false);
        }
    };

    const handleResend = async () => {
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setSending(true);
        try {
            await api.post('/auth/account-otp/send', { email: email.trim(), purpose: 'web_login' });
            startResendTimer();
            setTimeout(() => focusOtpBox(0), 80);
        } catch {
            // keep current step — user can retry
        } finally {
            setSending(false);
        }
    };

    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) { setOtpError('Please enter the full 6-digit code'); return; }

        setVerifying(true);
        setOtpError('');
        try {
            const res = await api.post<{ profile?: { safetag?: string } }>('/auth/account-otp/verify', { email: email.trim(), code, purpose: 'web_login' });
            setStep('success');
            const safetag = res.data?.profile?.safetag;
            const destination = next || (safetag ? `/withdraw/${encodeURIComponent(safetag)}` : '/');
            setTimeout(() => router.push(destination), 1800);
        } catch (err) {
            setOtpError(apiErrorMessage(err, 'Invalid or expired code. Please try again.'));
        } finally {
            setVerifying(false);
        }
    };

    const goBack = () => {
        setStep('input');
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
    };

    return (
        <div className="relative w-full min-h-screen bg-white overflow-hidden">
            <div className="pointer-events-none absolute -top-[220px] left-1/2 -translate-x-1/2 w-[920px] h-[560px] z-0" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,185,129,.14) 0%, rgba(16,185,129,0) 70%)' }} />

            <img src="/assets/coin-whatsapp.webp" alt="" className="hidden sm:block pointer-events-none absolute top-[120px] -left-[58px] w-[220px] z-[1] animate-[ckBobA_7.5s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.14))' }} />
            <img src="/assets/coin-telegram.webp" alt="" className="hidden sm:block pointer-events-none absolute bottom-[80px] -right-[52px] w-[172px] z-[1] animate-[ckBobB_8.6s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.14))' }} />

            <div className="relative z-10 flex flex-col items-center pt-11 px-[22px] pb-[60px] max-w-[480px] mx-auto">
                <Link href="/" className="block no-underline">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[8px] bg-[#0f172a] flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                        </div>
                        <span className="font-['Inter_Tight',sans-serif] text-[20px] font-black text-[#0f172a] tracking-[-.03em]">Safeeely</span>
                    </div>
                </Link>

                <div className="inline-flex items-center gap-[7px] mt-4 px-[13px] py-[6px] bg-[#f0fdf4] border border-[#d1fae5] rounded-full">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.2}><rect x="4.5" y="11" width="15" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                    <span className="text-[11px] font-bold tracking-[.1em] text-[#059669] uppercase whitespace-nowrap">Secure sign-in</span>
                </div>

                {showExpiredBanner && (
                    <div className="w-full mt-4 flex items-start gap-2.5 px-4 py-3 bg-[#fffbeb] border border-[#fde68a] rounded-[14px]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.2} className="flex-shrink-0 mt-px"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <div className="flex-1">
                            <p className="text-[12.5px] font-bold text-[#92400e] mb-0.5">Your sign-in link has expired</p>
                            <p className="text-[12px] text-[#b45309] font-normal leading-[1.5]">Enter your email to receive a fresh one-time code instantly.</p>
                        </div>
                        <button onClick={() => setShowExpiredBanner(false)} className="bg-none border-none cursor-pointer p-0.5 flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                )}

                <div className="w-full mt-6 bg-white border border-[#edeff3] rounded-[26px] shadow-[0_24px_60px_rgba(15,23,42,0.08)] overflow-hidden">

                    {step === 'input' && (
                        <>
                            <div className="px-[26px] pt-6 pb-[22px] border-b border-[#f1f3f6]">
                                <span className="text-[11px] font-bold tracking-[.13em] text-[#a4adba] uppercase">Sign in to your account</span>
                                <h1 className="font-['Inter_Tight',sans-serif] text-[28px] font-bold text-[#0f172a] tracking-[-.02em] leading-[1.1] mt-2.5">Welcome back</h1>
                            </div>

                            <div className="px-[26px] pt-[22px] flex flex-col gap-4">
                                <div>
                                    <div className="flex items-center gap-[7px] mb-2">
                                        <span className="w-[22px] h-[22px] rounded-[7px] bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.2} strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                        </span>
                                        <p className="m-0 text-[11px] font-bold tracking-[.08em] text-[#a4adba] uppercase">Email address</p>
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        autoComplete="email"
                                        onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                                        className={`w-full h-[50px] px-4 bg-[#f7f8f9] border-[1.5px] rounded-[13px] font-medium text-[14.5px] text-[#0f172a] outline-none transition-all placeholder:text-[#b0bac6] placeholder:font-normal focus:border-[#10b981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:bg-white ${emailError ? 'border-[#e11d48] shadow-[0_0_0_3px_rgba(225,29,72,0.08)]' : 'border-[#edeff3]'}`}
                                    />
                                    {emailError && (
                                        <p className="text-[11.5px] text-[#e11d48] font-semibold mt-1.5 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            {emailError}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2.5 p-3.5 px-4 bg-[#f0fdf4] border border-[#d1fae5] rounded-[14px]">
                                    <span className="w-9 h-9 rounded-[10px] bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round"><rect x="4.5" y="11" width="15" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                                    </span>
                                    <div>
                                        <p className="text-[13px] font-bold text-[#15803d] mb-0.5">No password needed</p>
                                        <p className="text-[12px] text-[#3f9d63] font-normal">We&apos;ll send a one-time code to your inbox.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-[26px] pt-[22px] pb-[26px]">
                                <button
                                    onClick={handleSendOtp}
                                    disabled={sending}
                                    className="flex items-center justify-center gap-2.5 w-full bg-[#0f172a] text-white border-none rounded-full py-4 font-['Inter_Tight',sans-serif] font-bold text-[16px] shadow-[0_12px_26px_rgba(15,23,42,0.2)] cursor-pointer transition-all hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-[#1e293b] active:not-disabled:scale-[.98] disabled:opacity-45 disabled:cursor-not-allowed"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={17} className="animate-spin" />
                                            Sending code…
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}><rect x="4.5" y="11" width="15" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                                            Send my sign-in code
                                        </>
                                    )}
                                </button>
                                <p className="mt-3.5 text-[12px] leading-[1.5] text-[#94a3b8] text-center font-normal">
                                    Don&apos;t have an account?{' '}
                                    <a href="https://safeeely.com" className="text-[#475569] font-semibold no-underline border-b border-[#cbd5e1]">Learn about Safeeely</a>
                                </p>
                            </div>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <div className="px-[26px] pt-6 pb-[22px] border-b border-[#f1f3f6]">
                                <span className="text-[11px] font-bold tracking-[.13em] text-[#a4adba] uppercase">Verification</span>
                                <h1 className="font-['Inter_Tight',sans-serif] text-[28px] font-bold text-[#0f172a] tracking-[-.02em] leading-[1.1] mt-2.5">Check your inbox</h1>
                            </div>

                            <div className="px-[26px] pt-[22px] flex flex-col gap-4">
                                <div className="flex items-center gap-2.5 p-3.5 px-4 bg-[#f0fdf4] border border-[#d1fae5] rounded-[14px]">
                                    <span className="w-9 h-9 rounded-[10px] bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                    </span>
                                    <div>
                                        <p className="text-[13px] font-bold text-[#0f172a] mb-0.5 break-all">{email}</p>
                                        <p className="text-[12px] text-[#3f9d63] font-normal">Code expires in 10 minutes.</p>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-[7px] mb-[9px]">
                                        <span className="w-[22px] h-[22px] rounded-[7px] bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2.2} strokeLinecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /></svg>
                                        </span>
                                        <p className="m-0 text-[11px] font-bold tracking-[.08em] text-[#a4adba] uppercase">Enter 6-digit code</p>
                                    </div>
                                    <OtpInput value={otp} onChange={(next) => { setOtp(next); setOtpError(''); }} error={!!otpError} onEnter={handleVerifyOtp} />
                                    {otpError && (
                                        <p className="text-[11.5px] text-[#e11d48] font-semibold mt-2 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            {otpError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="px-[26px] pt-[22px] pb-[26px]">
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={verifying}
                                    className="flex items-center justify-center gap-2.5 w-full mb-3.5 bg-[#0f172a] text-white border-none rounded-full py-4 font-['Inter_Tight',sans-serif] font-bold text-[16px] shadow-[0_12px_26px_rgba(15,23,42,0.2)] cursor-pointer transition-all hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-[#1e293b] active:not-disabled:scale-[.98] disabled:opacity-45 disabled:cursor-not-allowed"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 size={17} className="animate-spin" />
                                            Verifying…
                                        </>
                                    ) : (
                                        <>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}><rect x="4.5" y="11" width="15" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                                            Verify and sign in
                                        </>
                                    )}
                                </button>
                                <div className="flex items-center justify-between">
                                    <button onClick={goBack} className="bg-none border-none cursor-pointer font-sans text-[12.5px] font-semibold text-[#64748b] hover:text-[#0f172a] inline-flex items-center gap-1 p-0 transition-colors">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                        Different email
                                    </button>
                                    {canResend ? (
                                        <button onClick={handleResend} className="bg-none border-none cursor-pointer font-sans text-[12.5px] font-semibold text-[#10b981] p-0">Resend code</button>
                                    ) : (
                                        <span className="text-[12px] text-[#94a3b8] font-medium">Resend in {resendCountdown}s</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'success' && (
                        <div className="px-[26px] py-12 text-center">
                            <div className="w-[68px] h-[68px] rounded-full bg-[#10b981] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_28px_rgba(16,185,129,0.32)]">
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-[26px] font-bold text-[#0f172a] tracking-[-.02em] mb-2">You&apos;re in!</h2>
                            <p className="text-[14px] text-[#64748b] font-normal leading-[1.6] mb-6">Signed in as <strong className="text-[#0f172a]">{email}</strong>. Taking you to your dashboard…</p>
                            <div className="flex items-center justify-center gap-[7px]">
                                <Loader2 size={14} className="animate-spin text-[#10b981]" />
                                <span className="text-[13px] font-semibold text-[#10b981]">Redirecting to dashboard…</span>
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-3.5 text-[11.5px] leading-[1.5] text-[#94a3b8] text-center font-normal">
                    By signing in you agree to our{' '}
                    <a href="https://safeeely.com/terms" className="text-[#475569] font-semibold no-underline border-b border-[#cbd5e1]">Terms</a>
                    {' '}&amp;{' '}
                    <a href="https://safeeely.com/privacy" className="text-[#475569] font-semibold no-underline border-b border-[#cbd5e1]">Privacy Policy</a>
                </p>
            </div>

            <style jsx global>{`
                @keyframes ckBobA { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(3deg); } }
                @keyframes ckBobB { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(-3deg); } }
            `}</style>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#10b981]" /></div>}>
            <LoginContent />
        </Suspense>
    );
}
