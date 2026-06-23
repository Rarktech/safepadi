'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Download,
    FileText,
    Shield,
    ArrowLeft,
    CheckCircle,
    Loader2,
    Clock,
    Star,
    RotateCcw,
    Package,
} from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '@/lib/apiError';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Txn {
    id: string;
    txn_code: string;
    product_name: string;
    total_amount: number;
    currency: string;
    status: string;
    dispute_id?: string;
    seller?: { safetag?: string };
}

interface Proof {
    id: string;
    file_name?: string;
    file_size?: number;
    file_url: string;
    mime_type?: string;
}

function formatAmount(amount: number, currency: string) {
    if (currency === 'USDT' || currency === 'BTC') return `${amount} ${currency}`;
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
        return `${amount} ${currency}`;
    }
}

function statusTag(status: string): { label: string; bg: string; color: string } {
    switch (status) {
        case 'FINALIZED': return { label: 'Finalized', bg: 'bg-[#f0fdf4]', color: 'text-[#16a34a]' };
        case 'RETURN_PENDING': return { label: 'Return in progress', bg: 'bg-[#fffbeb]', color: 'text-[#d97706]' };
        case 'COMPLETED_BY_SELLER': return { label: 'Awaiting your confirmation', bg: 'bg-[#eff6ff]', color: 'text-[#2563eb]' };
        default: return { label: (status || '').replace(/_/g, ' '), bg: 'bg-[#f1f5f9]', color: 'text-[#475569]' };
    }
}

export default function DeliveryPortalPage() {
    const { id } = useParams();
    const [txn, setTxn] = useState<Txn | null>(null);
    const [proofs, setProofs] = useState<Proof[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [txnRes, proofsRes] = await Promise.all([
                    axios.get(`${API_URL}/transactions/${id}`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    axios.get(`${API_URL}/transactions/${id}/proofs`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                ]);
                setTxn(txnRes.data);
                setProofs(proofsRes.data);
            } catch (err) {
                console.error('❌ Fetch error:', err);
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
        } catch (err) {
            alert(apiErrorMessage(err, 'Failed to confirm. Please try again.'));
        } finally {
            setReturnConfirming(false);
        }
    };

    const handleConfirmReceipt = async () => {
        if (!window.confirm('Are you sure you want to confirm receipt and release funds to the seller? This action cannot be undone.')) return;

        setConfirming(true);
        try {
            await axios.patch(`${API_URL}/transactions/${id}/status`, { status: 'confirm_receipt' }, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
                withCredentials: true
            });
            setConfirmed(true);
        } catch {
            alert('Failed to confirm delivery. Please try again.');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            </div>
        );
    }

    if (!txn) {
        return (
            <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Transaction Not Found</h1>
                <Button onClick={() => window.close()}>Close Tab</Button>
            </div>
        );
    }

    if (confirmed) {
        const reviewsUrl = typeof window !== 'undefined' ? (window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin) : 'http://localhost:3001';
        const receiptUrl = `${API_URL}/receipts/${txn.txn_code}.png?type=completed&role=buyer&v=${Date.now()}`;

        return (
            <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#10b981] rounded-full flex items-center justify-center mb-6 shadow-[0_8px_28px_rgba(16,185,129,0.28)]">
                    <CheckCircle className="w-10 h-10 text-white" />
                </div>

                <h1 className="font-['Inter_Tight',sans-serif] text-[32px] font-black text-[#0f172a] tracking-tight mb-2">Deal secured!</h1>
                <p className="text-[#64748b] max-w-md mx-auto mb-8 font-medium">
                    Funds have been released to <span className="text-[#0f172a] font-bold">{txn.seller?.safetag}</span>. Your transaction is now officially complete.
                </p>

                <div className="bg-white p-4 rounded-[32px] border border-[#e9eaec] mb-10 max-w-[400px] w-full">
                    <img src={receiptUrl} alt="Transaction Receipt" className="w-full h-auto rounded-[20px]" />
                    <div className="mt-4 flex items-center justify-center gap-2 py-2">
                        <Shield className="w-4 h-4 text-[#16a34a]" />
                        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Verified by Safeeely Protocol</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-sm">
                    <Button
                        onClick={() => window.open(`${reviewsUrl}/reviews/${txn.id}`, '_blank')}
                        className="bg-[#10b981] hover:bg-[#0ea271] text-white font-bold px-8 h-[52px] rounded-full shadow-[0_4px_18px_rgba(16,185,129,0.28)] flex items-center gap-2 flex-1 w-full"
                    >
                        <Star className="w-4 h-4 fill-white" />
                        Leave a Review
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.close()}
                        className="text-[#64748b] font-semibold h-[52px] px-8 rounded-full border-[#e9eaec] flex-1 w-full"
                    >
                        Back to Chat
                    </Button>
                </div>
            </div>
        );
    }

    const isFinalized = txn.status === 'FINALIZED';
    const isReturnPending = txn.status === 'RETURN_PENDING';
    const canConfirm = txn.status === 'COMPLETED_BY_SELLER';
    const showConfirmPanel = !isFinalized && !isReturnPending;
    const tag = statusTag(txn.status);

    return (
        <div className="min-h-screen bg-[#F7F7F5] flex flex-col font-sans">
            <nav className="bg-white border-b border-[#e9eaec] px-6 h-[60px] flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2.5">
                    <img src="/logo-main.svg" alt="Safeeely" className="h-5" />
                    <div className="w-px h-4 bg-[#e2e8f0]" />
                    <span className="text-[11.5px] font-semibold text-[#94a3b8]">Delivery Portal</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#16a34a]">
                    <Shield className="w-[13px] h-[13px]" />
                    <span className="text-[11px] font-bold tracking-[.04em]">Escrow protected</span>
                </div>
            </nav>

            <main className="flex-1 max-w-[680px] w-full mx-auto px-5 pt-7 pb-20">
                <div className="mb-[22px]">
                    <div className={`inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full text-[11px] font-bold ${tag.bg} ${tag.color}`}>
                        {isFinalized ? <CheckCircle size={11} /> : isReturnPending ? <RotateCcw size={11} /> : <Clock size={11} />}
                        {tag.label}
                    </div>
                    <h1 className="font-['Inter_Tight',sans-serif] text-[24px] font-black text-[#0f172a] tracking-[-.03em] mb-1.5">Review delivery proof</h1>
                    <p className="text-[13.5px] text-[#64748b]">
                        Delivery for <strong className="text-[#0f172a]">{txn.product_name}</strong> from <strong className="text-[#0f172a]">{txn.seller?.safetag}</strong>
                    </p>
                </div>

                <div className="bg-white rounded-[20px] border border-[#e9eaec] px-[22px] py-[18px] flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10.5px] font-semibold text-[#94a3b8] mb-1">Transaction ID</p>
                        <code className="text-[13px] font-bold text-[#0f172a]">{txn.txn_code}</code>
                    </div>
                    <div className="text-right">
                        <p className="text-[10.5px] font-semibold text-[#94a3b8] mb-1">Amount in escrow</p>
                        <p className="font-['Inter_Tight',sans-serif] text-[20px] font-extrabold text-[#0f172a]">{formatAmount(txn.total_amount, txn.currency)}</p>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[15px] font-extrabold text-[#0f172a]">Proof of delivery</h2>
                        <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[10.5px] font-bold bg-[#f1f5f9] text-[#475569]">{proofs.length} file{proofs.length === 1 ? '' : 's'}</span>
                    </div>

                    {proofs.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-[20px] py-12 px-6 text-center">
                            <FileText className="w-9 h-9 text-[#cbd5e1] mx-auto mb-3" />
                            <p className="text-[14px] font-bold text-[#0f172a] mb-1">No proofs uploaded yet</p>
                            <p className="text-[12px] text-[#94a3b8]">The seller hasn&apos;t submitted delivery proof yet. You&apos;ll be notified when they do.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {proofs.map((proof) => {
                                const isImage = (proof.mime_type || '').startsWith('image/');
                                return (
                                    <div key={proof.id} className="rounded-2xl border border-[#e9eaec] bg-white overflow-hidden hover:shadow-[0_6px_24px_rgba(15,23,42,0.08)] transition-shadow">
                                        {isImage && (
                                            <div className="w-full aspect-[16/10] bg-[#f7f8f9]" style={{ backgroundImage: `url(${proof.file_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                        )}
                                        <div className="flex items-center gap-3 px-4 py-3.5">
                                            <div className="w-10 h-10 bg-[#f7f8f9] rounded-xl flex items-center justify-center shrink-0">
                                                <FileText size={16} className="text-[#94a3b8]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-[#0f172a] truncate">{proof.file_name || 'Untitled document'}</p>
                                                <p className="text-[11px] text-[#94a3b8] mt-0.5">{((proof.file_size || 0) / 1024 / 1024).toFixed(2)} MB {isImage ? '· Image' : '· File'}</p>
                                            </div>
                                            <a
                                                href={proof.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-[38px] h-[38px] bg-[#0f172a] rounded-[10px] flex items-center justify-center text-white shrink-0 hover:bg-[#10b981] transition-colors"
                                            >
                                                <Download size={14} />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {isReturnPending && (
                    <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[20px] p-[22px] mb-4">
                        <div className="flex items-start gap-3 mb-[18px]">
                            <div className="w-[38px] h-[38px] rounded-[10px] bg-[#fef3c7] flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-[#d97706]" />
                            </div>
                            <div>
                                <p className="text-[13.5px] font-extrabold text-[#92400e] mb-1">Return of goods in progress</p>
                                <p className="text-[12px] text-[#b45309] leading-[1.55]">The mediator has ruled the buyer must return the goods before a refund is issued. Confirm your role below.</p>
                            </div>
                        </div>

                        {returnDone ? (
                            <div className="bg-[#10b981] rounded-2xl px-5 py-4 flex items-center gap-2.5 text-white">
                                <CheckCircle className="w-[18px] h-[18px]" />
                                <p className="text-[13px] font-bold">{returnDone === 'BUYER' ? 'Shipping confirmed! Awaiting seller receipt confirmation.' : 'Receipt confirmed! Buyer\'s refund has been credited.'}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleConfirmReturn('BUYER')}
                                    disabled={returnConfirming}
                                    className="flex items-center justify-center gap-2 h-[52px] rounded-full bg-[#d97706] text-white font-bold text-[14px] shadow-[0_4px_18px_rgba(217,119,6,0.2)] disabled:opacity-50"
                                >
                                    {returnConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : '📦 I\'m the buyer — I\'ve shipped the goods back'}
                                </button>
                                <button
                                    onClick={() => handleConfirmReturn('SELLER')}
                                    disabled={returnConfirming}
                                    className="flex items-center justify-center gap-2 h-[52px] rounded-full bg-white text-[#d97706] border border-[#fde68a] font-bold text-[14px] disabled:opacity-50"
                                >
                                    {returnConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ I\'m the seller — I\'ve received the goods back'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {showConfirmPanel && (
                    <div className="bg-white border border-[#e9eaec] rounded-[20px] p-[22px] mb-4">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-[38px] h-[38px] rounded-[10px] bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
                                <Shield className="w-4 h-4 text-[#16a34a]" />
                            </div>
                            <div>
                                <p className="text-[13.5px] font-extrabold text-[#0f172a] mb-1">Satisfied with the delivery?</p>
                                <p className="text-[12px] text-[#64748b] leading-[1.55]">
                                    {canConfirm
                                        ? 'If you have reviewed the documents and received your order, you can confirm receipt here. This will instantly release the payment to the seller.'
                                        : 'Once the seller uploads the final delivery documents, you will be able to confirm receipt and release funds here.'}
                                </p>
                            </div>
                        </div>

                        {canConfirm ? (
                            <button
                                onClick={handleConfirmReceipt}
                                disabled={confirming}
                                className="w-full flex items-center justify-center gap-2 h-[52px] rounded-full bg-[#10b981] text-white font-bold text-[14px] shadow-[0_4px_18px_rgba(16,185,129,0.28)] disabled:opacity-50"
                            >
                                {confirming ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Confirming…
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-[15px] h-[15px]" />
                                        Confirm receipt and release funds
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 py-4 bg-[#f7f8f9] rounded-2xl text-[#94a3b8]">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[12.5px] font-semibold">Awaiting seller submission</span>
                            </div>
                        )}
                    </div>
                )}

                {isFinalized && (
                    <div className="bg-[#0f172a] rounded-[20px] p-6 flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-[14px] bg-[#10b981]/[0.15] flex items-center justify-center shrink-0">
                            <CheckCircle className="w-[22px] h-[22px] text-[#10b981]" />
                        </div>
                        <div>
                            <p className="text-[15px] font-extrabold text-white mb-0.5">Payment released</p>
                            <p className="text-[12px] text-white/45">This transaction is complete and funds have been sent to the seller.</p>
                        </div>
                    </div>
                )}

                <div className="text-center pt-2">
                    <button
                        onClick={() => window.close()}
                        className="bg-none border-none cursor-pointer text-[13px] font-semibold text-[#94a3b8] hover:text-[#0f172a] inline-flex items-center gap-1.5 transition-colors"
                    >
                        <ArrowLeft className="w-[13px] h-[13px]" />
                        Back to chat
                    </button>
                </div>
            </main>
        </div>
    );
}
