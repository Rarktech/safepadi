
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Download,
    FileText,
    Shield,
    LayoutDashboard,
    ArrowLeft,
    CheckCircle,
    Loader2,
    Lock,
    Star,
    Clock,
    RotateCcw
} from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function DeliveryPortalPage() {
    const { id } = useParams();
    const [txn, setTxn] = useState<any>(null);
    const [proofs, setProofs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadData = async () => {
            try {
                console.log(`🔗 Loading Delivery Data for ID/Code: ${id}`);
                const [txnRes, proofsRes] = await Promise.all([
                    axios.get(`${API_URL}/transactions/${id}`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    axios.get(`${API_URL}/transactions/${id}/proofs`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                ]);
                console.log('✅ Found Transaction:', txnRes.data.txn_code);
                console.log('✅ Found Proofs:', proofsRes.data.length);
                setTxn(txnRes.data);
                setProofs(proofsRes.data);
            } catch (err: any) {
                console.error('❌ Fetch error:', err.message);
                if (err.response) {
                    console.error('📦 API Error Response:', err.response.data);
                    console.error('🔢 Status Code:', err.response.status);
                }
            } finally {
                setLoading(false);
            }
        };
        if (id) loadData();
    }, [id]);

    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [returnConfirming, setReturnConfirming] = useState(false);
    const [returnDone, setReturnDone] = useState<'BUYER' | 'SELLER' | null>(null);

    const handleConfirmReturn = async (role: 'BUYER' | 'SELLER') => {
        if (!txn?.dispute_id) { alert('No dispute found for this transaction.'); return; }
        setReturnConfirming(true);
        try {
            await axios.post(`${API_URL}/disputes/${txn.dispute_id}/confirm-return`, { role }, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
                withCredentials: true
            });
            setReturnDone(role);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to confirm. Please try again.');
        } finally {
            setReturnConfirming(false);
        }
    };

    const handleConfirmReceipt = async () => {
        if (!window.confirm('Are you sure you want to confirm receipt and release funds to the seller? This action cannot be undone.')) return;

        setConfirming(true);
        try {
            const res = await axios.patch(`${API_URL}/transactions/${id}/status`, {
                status: 'confirm_receipt'
            }, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
                withCredentials: true
            });
            console.log('✅ Confirmation response:', res.data);
            setConfirmed(true);
        } catch (err: any) {
            console.error('Confirmation failed:', err);
            alert('Failed to confirm delivery. Please try again.');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            </div>
        );
    }

    if (!txn) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Transaction Not Found</h1>
                <Button onClick={() => window.close()}>Close Tab</Button>
            </div>
        );
    }

    if (confirmed) {
        const reviewsUrl = typeof window !== 'undefined' ? (window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin) : 'http://localhost:3001';
        const receiptUrl = `${API_URL}/receipts/${txn.txn_code}.png?type=completed&role=buyer&v=${Date.now()}`;

        return (
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#10b981] rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-200">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>
                
                <h1 className="text-4xl font-bold text-slate-900 tracking-tighter mb-2">Deal Secured!</h1>
                <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
                    Funds have been released to <span className="text-slate-900 font-bold">{txn.seller?.safetag}</span>. Your transaction is now officially complete.
                </p>

                {/* Receipt Card */}
                <div className="bg-white p-4 rounded-[40px] shadow-2xl border border-slate-100 mb-10 max-w-[400px] w-full transform hover:scale-[1.02] transition-transform">
                    <img 
                        src={receiptUrl} 
                        alt="Transaction Receipt" 
                        className="w-full h-auto rounded-[32px] shadow-sm"
                        onLoad={() => console.log('Receipt loaded successfully')}
                    />
                    <div className="mt-4 flex items-center justify-center gap-2 py-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified by Safeeely Protocol</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center w-full max-w-sm">
                    <Button
                        onClick={() => window.open(`${reviewsUrl}/reviews/${txn.id}`, '_blank')}
                        className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-16 rounded-2xl shadow-xl shadow-green-100 flex items-center gap-2 flex-1 w-full"
                    >
                        <Star className="w-5 h-5 fill-white" />
                        Leave a Review
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.close()}
                        className="text-slate-600 font-bold h-16 px-8 rounded-2xl border-slate-200 flex-1 w-full"
                    >
                        Back to Chat
                    </Button>
                </div>
                
                <p className="mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                    Thank you for trading safely with us
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-green-100">
            {/* Nav */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/logo-main.svg" alt="Safeeely" className="h-6" />
                        <div className="h-4 w-px bg-slate-200" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Delivery Portal</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Escrow Protected</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto pt-12 pb-24 px-6">
                {/* Hero Header */}
                <div className="mb-12">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${
                        txn.status === 'RETURN_PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                    }`}>
                        {txn.status === 'FINALIZED' ? <CheckCircle className="w-3 h-3" /> : txn.status === 'RETURN_PENDING' ? <RotateCcw className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {txn.status === 'RETURN_PENDING' ? 'Return in Progress' : txn.status.replace(/_/g, ' ')}
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tighter mb-2">Review Delivery Documents</h1>
                    <p className="text-slate-500 font-medium">
                        Delivery for <span className="text-slate-900 font-bold">{txn.product_name}</span> from <span className="text-slate-900 font-bold">{txn.seller?.safetag}</span>
                    </p>
                </div>

                {/* Transaction Snap */}
                <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction ID</p>
                        <p className="text-sm font-bold text-slate-900 font-mono">{txn.txn_code}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-xl font-bold text-slate-900">{txn.total_amount} {txn.currency}</p>
                    </div>
                </div>

                {/* Proof List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Proof of Delivery ({proofs.length})</h2>
                    </div>

                    {proofs.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No documents have been uploaded yet.</p>
                        </div>
                    ) : (
                        proofs.map((proof) => (
                            <div key={proof.id} className="bg-white rounded-[24px] border border-slate-100 p-6 flex items-center gap-6 hover:shadow-lg transition-all group">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-green-50 transition-colors">
                                    <FileText className="w-6 h-6 text-slate-400 group-hover:text-[#10b981] transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate mb-0.5">{proof.file_name || 'Untitled document'}</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">File</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{((proof.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                </div>
                                <a
                                    href={proof.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-12 w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-[#10b981] transition-all shadow-lg shadow-slate-200 hover:shadow-green-100"
                                >
                                    <Download className="w-5 h-5" />
                                </a>
                            </div>
                        ))
                    )}
                </div>

                {/* Return-of-Goods Panel (RETURN_PENDING) */}
                {txn.status === 'RETURN_PENDING' && (
                    <div className="mt-12 p-8 bg-amber-50/50 rounded-[40px] border border-amber-100 flex flex-col gap-6 shadow-sm">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                                <RotateCcw className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-amber-900 mb-1">Return of Goods in Progress</p>
                                <p className="text-sm text-amber-700 leading-relaxed font-medium">
                                    The AI mediator has ruled that the buyer must return the goods to the seller before a refund is issued. Use the button that applies to your role.
                                </p>
                            </div>
                        </div>

                        {returnDone ? (
                            <div className="bg-emerald-500 text-white p-6 rounded-[24px] text-center font-bold flex items-center justify-center gap-3">
                                <CheckCircle className="w-5 h-5" />
                                {returnDone === 'BUYER' ? 'Shipping confirmed! Awaiting seller receipt confirmation.' : 'Receipt confirmed! Buyer\'s refund has been credited.'}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => handleConfirmReturn('BUYER')}
                                    disabled={returnConfirming}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-14 rounded-[24px] flex items-center justify-center gap-3 w-full shadow-lg shadow-amber-100"
                                >
                                    {returnConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <span>📦 I'm the Buyer — I've Shipped the Goods Back</span>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => handleConfirmReturn('SELLER')}
                                    disabled={returnConfirming}
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50 font-bold h-14 rounded-[24px] flex items-center justify-center gap-3 w-full"
                                >
                                    {returnConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <span>✅ I'm the Seller — I've Received the Goods Back</span>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Message & Action */}
                {txn.status !== 'FINALIZED' && txn.status !== 'RETURN_PENDING' && (
                    <div className="mt-12 p-8 bg-blue-50/50 rounded-[40px] border border-blue-100 flex flex-col gap-8 shadow-sm">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-blue-900 mb-1">Satisfied with the delivery?</p>
                                <p className="text-sm text-blue-700 leading-relaxed font-medium">
                                    {txn.status === 'COMPLETED_BY_SELLER'
                                        ? 'If you have reviewed the documents and received your order, you can confirm receipt here. This will instantly release the payment to the seller.'
                                        : 'Once the seller uploads the final delivery documents, you will be able to confirm receipt and release funds here.'}
                                </p>
                            </div>
                        </div>

                        {txn.status === 'COMPLETED_BY_SELLER' ? (
                            <Button
                                onClick={handleConfirmReceipt}
                                disabled={confirming}
                                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold h-16 rounded-[24px] text-lg shadow-xl shadow-green-200 flex items-center gap-3 w-full"
                            >
                                {confirming ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Confirm & Release Funds
                                        <CheckCircle className="w-6 h-6" />
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="bg-slate-200 text-slate-500 p-6 rounded-[24px] text-center font-bold flex items-center justify-center gap-3">
                                <Clock className="w-5 h-5" />
                                Awaiting Seller Completion
                            </div>
                        )}
                    </div>
                )}

                {txn.status === 'FINALIZED' && (
                    <div className="mt-12 p-8 bg-green-50 rounded-[40px] border border-green-100 flex items-center gap-6 shadow-sm">
                        <div className="w-14 h-14 bg-[#10b981] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-100">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-900">Payment Released</p>
                            <p className="text-sm text-green-700 font-medium">This transaction is complete and funds have been sent to the seller.</p>
                        </div>
                    </div>
                )}

                <div className="mt-12 flex justify-center">
                    <Button
                        variant="ghost"
                        onClick={() => window.close()}
                        className="text-slate-400 font-bold hover:text-slate-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Chat
                    </Button>
                </div>
            </main>
        </div>
    );
}
