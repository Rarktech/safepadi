'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Lock, CheckCircle, ArrowRight, X, Globe, Package, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import posthog from 'posthog-js';
import { usePaymentSession, PaymentModal } from '@chainrails/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦', USD: '$', EUR: '€', GBP: '£',
    BTC: '₿', USDT: '₮', ETH: 'Ξ', USDC: '$',
};

const CRYPTO_CURRENCIES = new Set(['USDT', 'BTC', 'ETH', 'USDC', 'SOL']);

function getPaymentGroup(currency: string): 'ngn' | 'international' | 'crypto' {
    if (CRYPTO_CURRENCIES.has(currency)) return 'crypto';
    if (currency === 'NGN') return 'ngn';
    return 'international';
}

export default function PaymentPage() {
    const { id } = useParams();
    const [txn, setTxn] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMethods, setShowMethods] = useState(false);
    const [crSuccess, setCrSuccess] = useState(false);

    const cr = usePaymentSession({
        session_url: `${API_URL}/transactions/${id}/chainrails-session`,
        onSuccess: () => {
            setShowMethods(false);
            setCrSuccess(true);
        },
        onCancel: () => {},
    });

    useEffect(() => {
        const fetchTxn = async () => {
            try {
                const res = await axios.get(`${API_URL}/transactions/${id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (typeof res.data === 'string' && res.data.includes('ERR_NGROK')) {
                    throw new Error('Ngrok is blocking the API call. Please click the link in your terminal to approve it once.');
                }
                if (!res.data || typeof res.data !== 'object') {
                    throw new Error('Invalid data format received from API');
                }
                setTxn(res.data);
                posthog.capture('payment_page_viewed', {
                    transaction_id: res.data.id,
                    amount: res.data.total_amount,
                    currency: res.data.currency,
                    txn_status: res.data.status,
                });
            } catch (err: any) {
                setError(err.message || 'Transaction not found');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchTxn();
    }, [id]);

    useEffect(() => {
        if (!txn) return;
        const isPaidNow = txn.status === 'PAID' || txn.status === 'FINALIZED' || txn.status === 'COMPLETED_BY_SELLER';
        if (isPaidNow || crSuccess) {
            posthog.capture('payment_page_paid_render', { transaction_id: txn.id });
        }
    }, [txn, crSuccess]);

    const initPayment = async (platform: string) => {
        setInitializing(true);
        try {
            const res = await axios.post(
                `${API_URL}/transactions/${id}/initialize-payment`,
                { platform },
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );
            if (res.data.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            } else {
                throw new Error('Could not initialize payment');
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to initialize payment. Please try again.';
            alert(`Payment Error: ${errorMsg}`);
            setInitializing(false);
            setShowMethods(true);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-medium animate-pulse">Safeeely is securing your connection...</p>
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Link Invalid</h1>
                <p className="text-slate-500 mb-8 max-w-md">This payment link might be expired or the transaction doesn't exist. Please contact the seller for a new link.</p>
                <button onClick={() => window.history.back()} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all">
                    Go Back
                </button>
            </div>
        );
    }

    const isPaid = txn.status === 'PAID' || txn.status === 'FINALIZED' || txn.status === 'COMPLETED_BY_SELLER';
    const currencySymbol = CURRENCY_SYMBOLS[txn?.currency] ?? txn?.currency ?? '';
    const paymentGroup = getPaymentGroup(txn?.currency);
    const amountStr = (txn?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const feeStr = `Included (${(txn?.fee_amount || 0).toFixed(2)} ${txn?.currency || 'NGN'})`;

    return (
        <div className="relative min-h-screen bg-white font-['Inter',sans-serif] overflow-hidden">
            {/* top brand glow */}
            <div
                className="absolute top-[-220px] left-1/2 -translate-x-1/2 w-[920px] h-[560px] pointer-events-none z-0"
                style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,185,129,.15) 0%, rgba(16,185,129,0) 70%)' }}
            />

            {/* floating brand coins */}
            <img
                src="/assets/coin-whatsapp.webp" alt=""
                className="absolute z-[1] pointer-events-none animate-[ckBobA_7.5s_ease-in-out_infinite] w-[138px] top-[74px] left-[-48px] sm:w-[220px] sm:top-[120px] sm:left-[-58px]"
                style={{ filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.16))' }}
            />
            <img
                src="/assets/coin-telegram.webp" alt=""
                className="absolute z-[1] pointer-events-none animate-[ckBobB_8.6s_ease-in-out_infinite] w-[116px] bottom-[68px] right-[-42px] sm:w-[172px] sm:bottom-[80px] sm:right-[-52px]"
                style={{ filter: 'drop-shadow(0 24px 32px rgba(4,120,87,.16))' }}
            />

            <main className="relative z-10 flex flex-col items-center max-w-[480px] mx-auto px-[22px] pt-11 pb-14">
                {/* logo + secure pill */}
                <img src="/assets/safeeely-logo.png" alt="Safeeely" className="h-6 w-auto object-contain" />
                <div className="inline-flex items-center gap-[7px] mt-4 px-[13px] py-[6px] bg-[#f0fdf4] border border-[#d1fae5] rounded-full">
                    <ShieldCheck size={12} strokeWidth={2.2} className="text-[#059669]" />
                    <span className="text-[11px] font-bold tracking-[.1em] text-[#059669] uppercase whitespace-nowrap">Secure escrow checkout</span>
                </div>

                {/* main card */}
                <div className="w-full mt-[26px] bg-white border border-[#edeff3] rounded-[26px] shadow-[0_24px_60px_rgba(15,23,42,.08)] overflow-hidden ph-no-capture">
                    {/* header band */}
                    <div className="px-[26px] pt-6 pb-[22px] border-b border-[#f1f3f6]">
                        <div className="flex items-center justify-between gap-3 mb-[18px]">
                            <span className="text-[11px] font-bold tracking-[.13em] text-[#a4adba] uppercase whitespace-nowrap">Amount due</span>
                            <span className="inline-flex items-center gap-[7px] bg-[#f4f6f8] rounded-full px-[11px] py-[5px]">
                                <span className="text-[10px] font-bold tracking-[.08em] text-[#94a3b8] uppercase">TXN</span>
                                <span className="font-['Inter_Tight',sans-serif] text-xs font-semibold text-[#475569] tracking-[.01em]">{txn?.txn_code || '---'}</span>
                            </span>
                        </div>
                        <div className="flex items-start gap-1">
                            <span className="font-['Inter_Tight',sans-serif] text-[26px] font-semibold text-[#64748b] mt-[7px]">{currencySymbol}</span>
                            <span className="font-['Inter_Tight',sans-serif] text-[50px] font-bold leading-none tracking-[-.03em] text-[#0f172a]">{amountStr}</span>
                        </div>
                        <p className="mt-3 text-[14.5px] text-[#64748b] font-normal">Payment for <span className="text-[#0f172a] font-bold">{txn?.product_name || 'Item'}</span></p>
                    </div>

                    {/* detail rows */}
                    <div className="px-[26px] pt-5 pb-1 flex flex-col gap-[18px]">
                        <div className="flex items-center gap-[14px]">
                            <span className="w-[42px] h-[42px] rounded-xl bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                                <Package size={20} strokeWidth={1.9} className="text-[#059669]" />
                            </span>
                            <div className="flex-1">
                                <p className="text-[11px] font-bold tracking-[.08em] text-[#a4adba] uppercase">Product / Service</p>
                                <p className="mt-[3px] text-[15px] font-bold text-[#0f172a]">{txn?.product_name || 'Safeeely Order'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-[14px]">
                            <span className="w-[42px] h-[42px] rounded-xl bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                                <Shield size={20} strokeWidth={1.9} className="text-[#047857]" />
                            </span>
                            <div className="flex-1">
                                <p className="text-[11px] font-bold tracking-[.08em] text-[#a4adba] uppercase">Escrow managed by</p>
                                <p className="mt-[3px] text-[15px] font-bold text-[#0f172a] flex items-center gap-[6px]">
                                    Safeeely Protection
                                    <CheckCircle size={14} className="text-[#10b981] fill-[#10b981]" style={{ color: '#fff' }} />
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-[14px]">
                            <span className="w-[42px] h-[42px] rounded-xl bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                                <CreditCard size={20} strokeWidth={1.9} className="text-[#64748b]" />
                            </span>
                            <div className="flex-1">
                                <p className="text-[11px] font-bold tracking-[.08em] text-[#a4adba] uppercase">Platform fee</p>
                                <p className="mt-[3px] text-[15px] font-bold text-[#0f172a]">{feeStr}</p>
                            </div>
                        </div>
                    </div>

                    {/* escrow stepper panel */}
                    <div className="mx-[26px] mt-[18px] px-[18px] pt-[18px] pb-4 bg-[#f0fdf4] border border-[#d9f5e3] rounded-2xl">
                        <p className="mb-4 text-xs font-semibold text-[#15803d] leading-[1.45]">Your funds are protected — released only when you confirm delivery.</p>
                        <div className="relative flex items-start justify-between">
                            <div className="absolute top-[13px] left-[16%] right-[16%] h-[2px] bg-[#bbe9cb]" />
                            <div className="relative flex flex-col items-center gap-2 w-1/3">
                                <span className="w-[27px] h-[27px] rounded-full bg-[#10b981] text-white text-xs font-extrabold flex items-center justify-center shadow-[0_0_0_4px_#f0fdf4]">1</span>
                                <span className="text-[11px] font-bold text-[#15803d] text-center leading-[1.25]">You pay</span>
                            </div>
                            <div className="relative flex flex-col items-center gap-2 w-1/3">
                                <span className="w-[27px] h-[27px] rounded-full bg-white border-2 border-[#bbe9cb] text-[#15803d] text-xs font-extrabold flex items-center justify-center shadow-[0_0_0_4px_#f0fdf4]">2</span>
                                <span className="text-[11px] font-semibold text-[#3f9d63] text-center leading-[1.25]">Held in escrow</span>
                            </div>
                            <div className="relative flex flex-col items-center gap-2 w-1/3">
                                <span className="w-[27px] h-[27px] rounded-full bg-white border-2 border-[#bbe9cb] text-[#15803d] text-xs font-extrabold flex items-center justify-center shadow-[0_0_0_4px_#f0fdf4]">3</span>
                                <span className="text-[11px] font-semibold text-[#3f9d63] text-center leading-[1.25]">Released on delivery</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="px-[26px] pt-5 pb-6">
                        {isPaid || crSuccess ? (
                            <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-bold shadow-lg shadow-emerald-200 animate-in zoom-in-95 duration-300">
                                <CheckCircle className="w-6 h-6" />
                                {crSuccess ? 'Crypto Payment Submitted — Confirming on Chain...' : 'Payment Already Confirmed'}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowMethods(true)}
                                disabled={initializing}
                                className={`flex items-center justify-center gap-[10px] w-full rounded-full px-4 py-4 font-['Inter_Tight',sans-serif] font-bold text-[16.5px] text-white bg-[#0f172a] shadow-[0_12px_26px_rgba(15,23,42,.22)] transition-all whitespace-nowrap active:scale-[0.98] ${initializing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1e293b] hover:-translate-y-0.5'}`}
                            >
                                {initializing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Lock size={16} strokeWidth={2.2} />
                                        Pay {currencySymbol}{amountStr}
                                    </>
                                )}
                            </button>
                        )}
                        <p className="mt-[14px] text-xs leading-[1.5] text-[#94a3b8] text-center font-normal">
                            By paying, you agree to Safeeely&apos;s <span className="text-[#475569] font-semibold underline cursor-pointer">Buyer Protection Policy</span>. Funds are held securely until delivery is confirmed.
                        </p>
                    </div>
                </div>

                {/* trust badges */}
                <div className="w-full mt-[14px] grid grid-cols-3 gap-[10px]">
                    <div className="bg-white border border-[#edeff3] rounded-2xl py-[15px] px-3 flex flex-col items-center justify-center text-center gap-1">
                        <Lock size={18} strokeWidth={1.9} className="text-[#475569] mb-[3px]" />
                        <p className="text-[11.5px] font-bold text-[#0f172a] tracking-[.02em]">Bank-grade</p>
                        <p className="text-[10.5px] text-[#94a3b8] font-medium">PCI DSS compliant</p>
                    </div>
                    <div className="bg-white border border-[#edeff3] rounded-2xl py-[15px] px-3 text-center">
                        <Shield size={18} strokeWidth={1.9} className="text-[#047857] mb-[7px] mx-auto" />
                        <p className="text-[11.5px] font-bold text-[#0f172a] tracking-[.02em]">Insured protection</p>
                        <p className="mt-[3px] text-[10.5px] text-[#94a3b8] font-medium">Up to $50,000 covered</p>
                    </div>
                    <div className="bg-white border border-[#edeff3] rounded-2xl py-[15px] px-3 text-center">
                        <ShieldCheck size={18} strokeWidth={1.9} className="text-[#0d9488] mb-[7px] mx-auto" />
                        <p className="text-[11.5px] font-bold text-[#0f172a] tracking-[.02em]">Escrow backed</p>
                        <p className="mt-[3px] text-[10.5px] text-[#94a3b8] font-medium">Released on delivery</p>
                    </div>
                </div>

                <div className="flex items-center gap-[6px] mt-[22px]">
                    <span className="text-xs text-[#a4adba] font-medium">Powered by</span>
                    <img src="/assets/safeeely-logo.png" alt="Safeeely" className="h-[15px] w-auto opacity-55" />
                </div>
            </main>

            <div className="ph-no-capture"><PaymentModal {...cr} /></div>

            {/* Payment Methods Modal — currency-aware */}
            {showMethods && (
                <div
                    onClick={() => !initializing && setShowMethods(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-[22px] bg-[rgba(15,23,42,.45)] backdrop-blur-[5px] animate-in fade-in duration-200 ph-no-capture"
                >
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_30px_80px_rgba(15,23,42,.28)] px-7 pt-[34px] pb-7 animate-in zoom-in-95 duration-300">
                        {initializing ? (
                            <div className="text-center">
                                <div className="w-[54px] h-[54px] rounded-full border-4 border-[#e2e8f0] border-t-[#10b981] mx-auto mb-5 animate-spin" />
                                <p className="mb-[6px] font-['Inter_Tight',sans-serif] font-bold text-lg text-[#0f172a]">Securing your payment</p>
                                <p className="text-sm text-[#64748b] font-normal leading-[1.5]">Encrypting and moving your funds into Safeeely escrow…</p>
                            </div>
                        ) : (
                            <div className="text-left">
                                <div className="flex items-start justify-between gap-3 mb-5">
                                    <div>
                                        <p className="font-['Inter_Tight',sans-serif] font-bold text-[19px] text-[#0f172a] tracking-[-.01em] whitespace-nowrap">Select payment method</p>
                                        <p className="mt-1 text-[11px] font-bold tracking-[.1em] text-[#a4adba] uppercase">
                                            {paymentGroup === 'ngn' ? 'Nigerian Naira options' : paymentGroup === 'international' ? 'International payment' : 'Crypto payment'}
                                        </p>
                                    </div>
                                    <button onClick={() => setShowMethods(false)} aria-label="Close" className="w-8 h-8 rounded-[10px] bg-[#f4f6f8] flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#e9edf1]">
                                        <X size={15} strokeWidth={2.4} className="text-[#64748b]" />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-[11px]">
                                    {paymentGroup === 'ngn' && (
                                        <>
                                            <MethodButton onClick={() => initPayment('opay')} iconBg="#ffffff" icon={<img src="/assets/opay-logo.webp" alt="OPay" className="w-[30px] h-auto object-contain" />} title="OPay Express" subtitle="Instant · Mobile money · USSD" />
                                            <MethodButton onClick={() => initPayment('flutterwave')} iconBg="#ffffff" icon={<img src="/assets/flutterwave-icon.png" alt="Flutterwave" className="w-[28px] h-auto object-contain" />} title="Card / Bank Transfer" subtitle="Debit card · Bank · USSD" />
                                        </>
                                    )}
                                    {paymentGroup === 'international' && (
                                        <>
                                            <MethodButton onClick={() => initPayment('airwallex')} iconBg="#eff6ff" icon={<Globe size={22} strokeWidth={1.9} className="text-[#2563eb]" />} title="International Card (Airwallex)" subtitle="Visa · Mastercard · Wire" />
                                            <MethodButton onClick={() => initPayment('flutterwave')} iconBg="#ffffff" icon={<img src="/assets/flutterwave-icon.png" alt="Flutterwave" className="w-[28px] h-auto object-contain" />} title="International Card (Flutterwave)" subtitle="Visa · Mastercard · Amex" />
                                        </>
                                    )}
                                    {paymentGroup === 'crypto' && (
                                        <MethodButton onClick={() => { setShowMethods(false); cr.open(); }} iconBg="#f8f9fb" icon={<img src="/assets/chainrails-logo.svg" alt="ChainRails" className="w-[32px] h-auto object-contain" />} title={`Pay with ${txn?.currency}`} subtitle="Multi-chain · ChainRails" />
                                    )}
                                </div>

                                <div className="flex items-center justify-center gap-[7px] mt-5">
                                    <Lock size={12} strokeWidth={2} className="text-[#a4adba]" />
                                    <span className="text-[10.5px] font-bold tracking-[.08em] text-[#a4adba] uppercase">Secure 256-bit SSL encryption</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes ckBobA { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(3deg); } }
                @keyframes ckBobB { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(-3deg); } }
            `}</style>
        </div>
    );
}

function MethodButton({ onClick, iconBg, icon, title, subtitle }: { onClick: () => void; iconBg: string; icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-[14px] w-full text-left px-[15px] py-[14px] border border-[#eceef2] rounded-2xl bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(15,23,42,.10)] hover:border-[#dde2e9] group"
        >
            <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                {icon}
            </span>
            <span className="flex-1">
                <span className="block font-['Inter_Tight',sans-serif] font-bold text-base text-[#0f172a]">{title}</span>
                <span className="block mt-[2px] text-[10.5px] font-bold tracking-[.05em] text-[#94a3b8] uppercase">{subtitle}</span>
            </span>
            <ArrowRight size={18} strokeWidth={2.4} className="text-[#b4bcc8] group-hover:text-[#64748b] group-hover:translate-x-1 transition-all" />
        </button>
    );
}
