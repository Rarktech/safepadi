'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shield, CreditCard, Lock, CheckCircle, ArrowRight, ShoppingBag, X, Zap, Globe } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PaymentPage() {
    const { id } = useParams();
    const router = useRouter();
    const [txn, setTxn] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMethods, setShowMethods] = useState(false);

    useEffect(() => {
        const fetchTxn = async () => {
            console.log('🔍 Fetching transaction:', id, 'from', API_URL);
            try {
                const res = await axios.get(`${API_URL}/transactions/${id}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });

                // Robust check for ngrok HTML warning page
                if (typeof res.data === 'string' && res.data.includes('ERR_NGROK')) {
                    console.error('🛑 Ngrok Warning Page detected instead of JSON');
                    throw new Error('Ngrok is blocking the API call. Please click the link in your terminal to approve it once.');
                }

                console.log('📦 Transaction data received:', res.data);

                if (!res.data || typeof res.data !== 'object') {
                    throw new Error('Invalid data format received from API');
                }

                setTxn(res.data);
                setError(null);
            } catch (err: any) {
                console.error('❌ Fetch error details:', err.message);
                setError(err.message || 'Transaction not found');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchTxn();
    }, [id]);

    const handleOpayPayment = async () => {
        setInitializing(true);
        setShowMethods(false);
        try {
            console.log('🚀 Initializing OPay payment for:', id);
            const res = await axios.post(`${API_URL}/transactions/${id}/initialize-payment`,
                { platform: 'opay' },
                {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                }
            );

            if (res.data.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            } else {
                throw new Error('Could not initialize payment');
            }
        } catch (err: any) {
            console.error('❌ Payment error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to initialize payment. Please try again.';
            alert(`Payment Error: ${errorMsg}`);
        } finally {
            setInitializing(false);
        }
    };

    const handleAirwallexPayment = async () => {
        setInitializing(true);
        setShowMethods(false);
        try {
            console.log('🚀 Initializing Airwallex payment for:', id);
            const res = await axios.post(`${API_URL}/transactions/${id}/initialize-payment`,
                { platform: 'airwallex' },
                {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                }
            );

            if (res.data.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            } else {
                throw new Error('Could not initialize payment');
            }
        } catch (err: any) {
            console.error('❌ Airwallex Payment error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to initialize payment. Please try again.';
            alert(`Payment Error: ${errorMsg}`);
        } finally {
            setInitializing(false);
        }
    };

    const handleFlutterwavePayment = async () => {
        setInitializing(true);
        setShowMethods(false);
        try {
            console.log('🚀 Initializing Flutterwave payment for:', id);
            const res = await axios.post(`${API_URL}/transactions/${id}/initialize-payment`,
                { platform: 'flutterwave' },
                {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                }
            );

            if (res.data.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            } else {
                throw new Error('Could not initialize payment');
            }
        } catch (err: any) {
            console.error('❌ Flutterwave Payment error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to initialize payment. Please try again.';
            alert(`Payment Error: ${errorMsg}`);
        } finally {
            setInitializing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-medium animate-pulse">Safeeely is securing your connection...</p>
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
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

    return (
        <div className="min-h-screen bg-slate-50 font-inter selection:bg-emerald-100">
            {/* Background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-300 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-300 blur-[120px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-lg mx-auto pt-10 pb-20 px-6">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <img src="/logo-mark.svg" alt="Safeeely" className="w-16 h-16 mb-4 drop-shadow-xl" />
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Safeeely Checkout</h1>
                    <div className="flex items-center gap-2 mt-1 text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">End-to-End Escrow Protection</span>
                    </div>
                </div>

                {/* Transaction Card */}
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-6">
                    <div className="p-8 pb-0">
                        <div className="bg-slate-50 rounded-2xl px-4 py-2 inline-flex items-center gap-2 mb-6">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</span>
                            <span className="text-xs font-bold text-slate-900 font-mono">{txn?.txn_code || '---'}</span>
                        </div>

                        <div className="flex flex-col gap-1 mb-6">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-baseline gap-1">
                                <span className="text-lg font-bold text-slate-400">{txn?.currency === 'USD' ? '$' : txn?.currency === 'EUR' ? '€' : txn?.currency === 'NGN' ? '₦' : ''}</span>
                                {(txn?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            <p className="text-slate-500 font-medium">Payment for <span className="text-slate-900 font-bold">{txn?.product_name || 'Item'}</span></p>
                        </div>

                        <div className="h-px bg-slate-50 w-full mb-8" />

                        <div className="space-y-6 mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                        <ShoppingBag className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Product/Service</p>
                                        <p className="text-sm font-bold text-slate-900">{txn?.product_name || 'Safeeely Order'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Escrow Managed by</p>
                                        <p className="text-sm font-bold text-slate-900">Safeeely Protection</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Platform Fee</p>
                                        <p className="text-sm font-bold text-slate-900">Included ({(txn?.fee_amount || 0).toFixed(2)} {txn?.currency || 'NGN'})</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                        {isPaid ? (
                            <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-bold shadow-lg shadow-emerald-200 animate-in zoom-in-95 duration-300">
                                <CheckCircle className="w-6 h-6" />
                                Payment Already Confirmed
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowMethods(true)}
                                disabled={initializing}
                                className={`w-full h-16 bg-[#10b981] text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${initializing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#059669]'}`}
                            >
                                {initializing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        Pay Now
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        )}

                        <p className="text-center text-[10px] font-medium text-slate-400 mt-6 leading-relaxed">
                            By clicking Pay Now, you agree to Safeeely's <span className="underline cursor-pointer">Buyer Protection Policy</span>. Your funds will be held securely until delivery is confirmed.
                        </p>
                    </div>
                </div>

                {/* Footer Badges */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-1">
                        <Lock className="w-5 h-5 text-emerald-500 mb-1" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Bank-Grade Security</span>
                        <span className="text-[9px] text-slate-500 font-medium">PCI DSS Compliant</span>
                    </div>
                    <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-1">
                        <CheckCircle className="w-5 h-5 text-blue-500 mb-1" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Insured Protection</span>
                        <span className="text-[9px] text-slate-500 font-medium">Up to $50,000 Covered</span>
                    </div>
                </div>
            </main>

            {/* Payment Methods Modal */}
            {showMethods && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Select Payment Method</h3>
                            <button onClick={() => setShowMethods(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <button
                                onClick={handleOpayPayment}
                                className="w-full p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                                        <Zap className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 leading-none mb-1">OPay Express</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instant | Fast | Secure</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                            </button>

                            <button
                                onClick={handleAirwallexPayment}
                                className="w-full p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                                        <Globe className="w-6 h-6 text-sky-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 leading-none mb-1">Global Payment (Airwallex)</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Card | Bank | eWallets</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                            </button>

                            <button
                                onClick={handleFlutterwavePayment}
                                className="w-full p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                                        <CreditCard className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 leading-none mb-1">Card / Bank (Flutterwave)</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cards | Transfer | USSD</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                            </button>

                            <div className="p-4 rounded-xl border border-dashed border-slate-200 opacity-50 flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-400 leading-none mb-1">Direct Bank Wire</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Coming Soon</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 flex items-center justify-center gap-2">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure 256-bit SSL Encryption</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
