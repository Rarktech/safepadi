'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { OtpInput, focusOtpBox } from '@/components/auth/OtpInput';

type Mode = 'deactivate' | 'activate';
type InputType = 'email' | 'safetag';
type Step = 'input' | 'otp' | 'success';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AccountBlockContent() {
    const searchParams = useSearchParams();
    const initialMode: Mode = searchParams.get('mode') === 'activate' ? 'activate' : 'deactivate';
    const initialSafetag = searchParams.get('safetag') || '';

    const [mode, setMode] = useState<Mode>(initialMode);
    const [inputType, setInputType] = useState<InputType>(initialSafetag ? 'safetag' : 'email');
    const [inputValue, setInputValue] = useState(initialSafetag);
    const [inputError, setInputError] = useState('');
    const [step, setStep] = useState<Step>('input');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [requestId, setRequestId] = useState('');
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const isDe = mode === 'deactivate';
    const purpose = isDe ? 'block_account' : 'unblock_account';

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

    const resetForm = (nextMode: Mode) => {
        setMode(nextMode);
        setStep('input');
        setInputValue('');
        setInputError('');
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
    };

    const validateInput = () => {
        const v = inputValue.trim();
        if (!v) return inputType === 'email' ? 'Please enter your email address' : 'Please enter your safetag';
        if (inputType === 'email' && !EMAIL_RE.test(v)) return 'Please enter a valid email address';
        if (inputType === 'safetag' && v.length < 2) return 'Please enter a valid safetag';
        return '';
    };

    const handleSendOtp = async () => {
        const err = validateInput();
        if (err) { setInputError(err); return; }

        setSending(true);
        setInputError('');
        const v = inputValue.trim();
        try {
            const body = inputType === 'email' ? { email: v, purpose } : { safetag: v.startsWith('@') ? v : `@${v}`, purpose };
            const res = await api.post<{ masked_email: string; request_id: string }>('/auth/account-otp/send', body);
            setMaskedEmail(res.data.masked_email);
            setRequestId(res.data.request_id);
            setStep('otp');
            startResendTimer();
            setTimeout(() => focusOtpBox(0), 100);
        } catch (err) {
            setInputError(apiErrorMessage(err, 'Account not found. Please check and try again.'));
        } finally {
            setSending(false);
        }
    };

    const handleResend = async () => {
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setSending(true);
        const v = inputValue.trim();
        try {
            const body = inputType === 'email' ? { email: v, purpose } : { safetag: v.startsWith('@') ? v : `@${v}`, purpose };
            const res = await api.post<{ request_id: string }>('/auth/account-otp/send', body);
            setRequestId(res.data.request_id);
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
            await api.post('/auth/account-otp/verify', { request_id: requestId, code, purpose });
            setStep('success');
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
            <div
                className="pointer-events-none absolute -top-[220px] left-1/2 -translate-x-1/2 w-[920px] h-[560px] z-0"
                style={{ background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${isDe ? 'rgba(225,29,72,.12)' : 'rgba(16,185,129,.14)'} 0%, rgba(0,0,0,0) 70%)` }}
            />
            <img src="/uploads/padlock.webp" alt="" className="hidden sm:block pointer-events-none absolute top-[120px] -left-[55px] w-[200px] z-[1] opacity-85 animate-[abBobA_7s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 24px 32px rgba(15,23,42,.12))' }} />
            <img src="/assets/coin-whatsapp.webp" alt="" className="hidden sm:block pointer-events-none absolute bottom-[90px] -right-[42px] w-[140px] z-[1] opacity-70 animate-[abBobB_8.6s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.12))' }} />

            <div className="relative z-10 flex flex-col items-center pt-11 px-[22px] pb-[60px] max-w-[480px] mx-auto">
                <Link href="/" className="flex items-center gap-2 no-underline">
                    <div className="w-7 h-7 rounded-[8px] bg-[#0f172a] flex items-center justify-center">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                    </div>
                    <span className="font-['Inter_Tight',sans-serif] text-[20px] font-black text-[#0f172a] tracking-[-.03em]">Safeeely</span>
                </Link>

                <div className={`inline-flex items-center gap-[7px] mt-4 px-[13px] py-[6px] rounded-full border ${isDe ? 'bg-[#fff1f2] border-[#fecdd3]' : 'bg-[#f0fdf4] border-[#d1fae5]'}`}>
                    {isDe ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth={2.2}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.2}><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    <span className={`text-[11px] font-bold tracking-[.1em] uppercase whitespace-nowrap ${isDe ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
                        {isDe ? 'Block / Deactivate Account' : 'Unblock / Reactivate Account'}
                    </span>
                </div>

                <div className="flex items-center gap-[3px] mt-3 p-1 bg-[#f7f8f9] rounded-full border border-[#edeff3]">
                    <button onClick={() => resetForm('deactivate')} className={`px-4 py-[7px] rounded-full border-none cursor-pointer font-sans font-semibold text-[12.5px] transition-all ${isDe ? 'bg-[#0f172a] text-white' : 'bg-transparent text-[#64748b]'}`}>Block account</button>
                    <button onClick={() => resetForm('activate')} className={`px-4 py-[7px] rounded-full border-none cursor-pointer font-sans font-semibold text-[12.5px] transition-all ${!isDe ? 'bg-[#0f172a] text-white' : 'bg-transparent text-[#64748b]'}`}>Unblock account</button>
                </div>

                <div className="w-full mt-5 bg-white border border-[#edeff3] rounded-[26px] shadow-[0_24px_60px_rgba(15,23,42,0.08)] overflow-hidden">

                    {step === 'input' && (
                        <>
                            <div className={`px-[26px] pt-6 pb-[22px] border-b border-[#f1f3f6] ${isDe ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                                <span className={`text-[11px] font-bold tracking-[.13em] uppercase ${isDe ? 'text-[#e11d48]' : 'text-[#a4adba]'}`}>{isDe ? 'Account Security' : 'Account Recovery'}</span>
                                <h1 className="font-['Inter_Tight',sans-serif] text-[26px] font-bold text-[#0f172a] tracking-[-.02em] leading-[1.15] mt-2.5 mb-1.5">{isDe ? 'Block your account' : 'Unblock your account'}</h1>
                                <p className={`text-[13.5px] font-normal leading-[1.55] m-0 ${isDe ? 'text-[#7f1d1d]' : 'text-[#64748b]'}`}>
                                    {isDe
                                        ? 'Instantly freeze all account activity. No transactions or logins will be allowed until you unblock.'
                                        : 'Restore full access to your Safeeely account. All your data and history will remain intact.'}
                                </p>
                            </div>

                            <div className="px-[26px] pt-[22px] flex flex-col gap-4">
                                <div className="flex items-center gap-[3px] bg-[#f7f8f9] rounded-full p-[3px] border border-[#edeff3] w-fit">
                                    <button onClick={() => { setInputType('email'); setInputValue(''); setInputError(''); }} className={`px-3.5 py-[5px] rounded-full border-none cursor-pointer font-sans font-semibold text-[12px] transition-all ${inputType === 'email' ? 'bg-[#0f172a] text-white' : 'bg-transparent text-[#64748b]'}`}>Email</button>
                                    <button onClick={() => { setInputType('safetag'); setInputValue(''); setInputError(''); }} className={`px-3.5 py-[5px] rounded-full border-none cursor-pointer font-sans font-semibold text-[12px] transition-all ${inputType === 'safetag' ? 'bg-[#0f172a] text-white' : 'bg-transparent text-[#64748b]'}`}>Safetag</button>
                                </div>

                                <div>
                                    <div className="flex items-center gap-[7px] mb-2">
                                        <span className="w-[22px] h-[22px] rounded-[7px] bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                                            {inputType === 'email' ? (
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2.2} strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                            ) : (
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2.2} strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            )}
                                        </span>
                                        <p className="m-0 text-[11px] font-bold tracking-[.08em] text-[#a4adba] uppercase">{inputType === 'email' ? 'Email address' : 'Safetag'}</p>
                                    </div>
                                    <input
                                        type={inputType === 'email' ? 'email' : 'text'}
                                        placeholder={inputType === 'email' ? 'you@example.com' : '@yoursafetag'}
                                        value={inputValue}
                                        autoComplete={inputType === 'email' ? 'email' : 'username'}
                                        onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                                        className={`w-full h-[50px] px-4 bg-[#f7f8f9] border-[1.5px] rounded-[13px] font-medium text-[14.5px] text-[#0f172a] outline-none transition-all placeholder:text-[#b0bac6] placeholder:font-normal focus:border-[#10b981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:bg-white ${inputError ? 'border-[#e11d48] shadow-[0_0_0_3px_rgba(225,29,72,0.08)]' : 'border-[#edeff3]'}`}
                                    />
                                    {inputError && (
                                        <p className="text-[11.5px] text-[#e11d48] font-semibold mt-1.5 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            {inputError}
                                        </p>
                                    )}
                                </div>

                                <div className={`flex items-center gap-2.5 p-3.5 px-4 rounded-[14px] border ${isDe ? 'bg-[#fff1f2] border-[#fecdd3]' : 'bg-[#f0fdf4] border-[#d1fae5]'}`}>
                                    <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${isDe ? 'bg-[#fff1f2]' : 'bg-[#ecfdf5]'}`}>
                                        {isDe ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth={2} strokeLinecap="round"><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </span>
                                    <div>
                                        <p className={`text-[13px] font-bold mb-0.5 ${isDe ? 'text-[#9f1239]' : 'text-[#15803d]'}`}>{isDe ? 'This will freeze your account immediately' : 'Your account will be fully restored'}</p>
                                        <p className={`text-[12px] font-normal m-0 leading-[1.5] ${isDe ? 'text-[#e11d48]' : 'text-[#3f9d63]'}`}>
                                            {isDe ? 'You can reactivate at any time from the unblock page.' : 'All trades, messages and funds will be accessible again.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-[26px] pt-[22px] pb-[26px]">
                                <button
                                    onClick={handleSendOtp}
                                    disabled={sending}
                                    className={`flex items-center justify-center gap-2.5 w-full text-white border-none rounded-full py-4 font-['Inter_Tight',sans-serif] font-bold text-[16px] cursor-pointer transition-all hover:not-disabled:-translate-y-0.5 active:not-disabled:scale-[.98] disabled:opacity-[.42] disabled:cursor-not-allowed ${isDe ? 'bg-[#e11d48] shadow-[0_12px_26px_rgba(225,29,72,0.22)]' : 'bg-[#0f172a] shadow-[0_12px_26px_rgba(15,23,42,0.2)]'}`}
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={17} className="animate-spin" />
                                            Sending code…
                                        </>
                                    ) : (
                                        isDe ? '🔒 Block my account' : '🔓 Unblock my account'
                                    )}
                                </button>
                                <p className="mt-3.5 text-[12px] leading-[1.5] text-[#94a3b8] text-center font-normal">
                                    We&apos;ll send a verification code to the email linked to your account.
                                </p>
                            </div>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <div className="px-[26px] pt-6 pb-[22px] border-b border-[#f1f3f6]">
                                <span className="text-[11px] font-bold tracking-[.13em] text-[#a4adba] uppercase">Verification</span>
                                <h1 className="font-['Inter_Tight',sans-serif] text-[26px] font-bold text-[#0f172a] tracking-[-.02em] leading-[1.15] mt-2.5">Check your inbox</h1>
                            </div>

                            <div className="px-[26px] pt-[22px] flex flex-col gap-4">
                                <div className="flex items-center gap-2.5 p-3.5 px-4 bg-[#f0fdf4] border border-[#d1fae5] rounded-[14px]">
                                    <span className="w-9 h-9 rounded-[10px] bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                    </span>
                                    <div>
                                        <p className="text-[13px] font-bold text-[#0f172a] mb-0.5 break-all">{maskedEmail}</p>
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
                                    className={`flex items-center justify-center gap-2.5 w-full mb-3.5 text-white border-none rounded-full py-4 font-['Inter_Tight',sans-serif] font-bold text-[16px] cursor-pointer transition-all hover:not-disabled:-translate-y-0.5 active:not-disabled:scale-[.98] disabled:opacity-[.42] disabled:cursor-not-allowed ${isDe ? 'bg-[#e11d48] shadow-[0_12px_26px_rgba(225,29,72,0.22)]' : 'bg-[#0f172a] shadow-[0_12px_26px_rgba(15,23,42,0.2)]'}`}
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 size={17} className="animate-spin" />
                                            Verifying…
                                        </>
                                    ) : (
                                        isDe ? '🔒 Confirm and block account' : '🔓 Confirm and unblock account'
                                    )}
                                </button>
                                <div className="flex items-center justify-between">
                                    <button onClick={goBack} className="bg-none border-none cursor-pointer font-sans text-[12.5px] font-semibold text-[#64748b] hover:text-[#0f172a] inline-flex items-center gap-1 p-0 transition-colors">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                        Back
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
                            <div className={`w-[68px] h-[68px] rounded-full flex items-center justify-center mx-auto mb-5 ${isDe ? 'bg-[#e11d48] shadow-[0_8px_28px_rgba(225,29,72,0.3)]' : 'bg-[#10b981] shadow-[0_8px_28px_rgba(16,185,129,0.32)]'}`}>
                                {isDe ? (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                                ) : (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                                )}
                            </div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-[26px] font-bold text-[#0f172a] tracking-[-.02em] mb-2">{isDe ? 'Account blocked' : 'Account restored!'}</h2>
                            <p className="text-[14px] text-[#64748b] font-normal leading-[1.6] mb-6">
                                {isDe
                                    ? 'Your account has been frozen. No one can sign in or make transactions until you unblock it.'
                                    : 'Welcome back! Your account is fully active again. All your history and funds are safe.'}
                            </p>
                            <Link href="/" className="inline-flex items-center justify-center px-7 py-[13px] rounded-full bg-[#0f172a] text-white no-underline font-sans font-bold text-[14px] mt-1">
                                {isDe ? 'Back to home' : 'Go to dashboard'}
                            </Link>
                        </div>
                    )}
                </div>

                <p className="mt-[18px] text-[11.5px] leading-[1.5] text-[#94a3b8] text-center font-normal">
                    Need help? <a href="mailto:support@safeeely.com" className="text-[#475569] font-semibold no-underline border-b border-[#cbd5e1]">Contact support</a>
                </p>
            </div>

            <style jsx global>{`
                @keyframes abBobA { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-18px) rotate(-6deg); } }
                @keyframes abBobB { 0%,100% { transform: translateY(0) rotate(3deg); } 50% { transform: translateY(-14px) rotate(1deg); } }
            `}</style>
        </div>
    );
}

export default function AccountBlockPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#10b981]" /></div>}>
            <AccountBlockContent />
        </Suspense>
    );
}
