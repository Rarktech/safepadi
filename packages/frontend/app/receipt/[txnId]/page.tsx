'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function EscrowReceiptPage() {
    const { txnId } = useParams();
    const [txn, setTxn] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!txnId) return;
        axios.get(`${API_URL}/transactions/${txnId}`)
            .then(r => setTxn(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [txnId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!txn) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-slate-500 font-medium">Receipt not found.</p>
            </div>
        );
    }

    const dateStr = new Date(txn.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const buyerTag = txn.buyer?.safetag || 'Buyer';
    const displayBuyer = buyerTag.startsWith('@') ? buyerTag : `@${buyerTag}`;
    const amount = Number(txn.total_amount || txn.amount || 0);
    const currency = txn.currency || 'NGN';

    return (
        <div className="min-h-screen bg-slate-100 flex items-start justify-center py-10 px-4">
            <div className="w-full max-w-[540px] bg-white rounded-2xl overflow-hidden shadow-xl">

                {/* Green header */}
                <div className="bg-emerald-500 px-8 pt-8 pb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-white text-2xl font-black tracking-tight">Escrow Secured</h1>
                        <p className="text-emerald-100 text-sm font-medium mt-1">Your payment is now safe in escrow.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl">
                        <Shield className="w-4 h-4 text-white" />
                        <span className="text-white font-black text-sm">Safeeely</span>
                    </div>
                </div>

                {/* Sub-header */}
                <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-b border-slate-200">
                    <span className="text-slate-600 font-semibold text-sm">Escrow Payment Secured</span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">Complete</span>
                </div>

                {/* Details */}
                <div className="px-8 divide-y divide-slate-100">
                    <div className="py-5">
                        <p className="text-slate-400 text-xs mb-1">Reference ID</p>
                        <p className="text-slate-900 font-semibold text-sm font-mono">{txn.txn_code}</p>
                        <p className="text-slate-400 text-xs mt-1">{dateStr}</p>
                    </div>

                    <div className="py-5">
                        <p className="text-slate-400 text-xs mb-1">Buyer Profile</p>
                        <p className="text-slate-900 font-semibold text-sm">{displayBuyer}</p>
                    </div>

                    <div className="py-5">
                        <p className="text-slate-400 text-xs mb-1">Product / Service</p>
                        <p className="text-slate-900 font-semibold text-sm">{txn.product_name}</p>
                    </div>

                    <div className="py-5">
                        <p className="text-slate-400 text-xs mb-1">Amount Paid into Escrow</p>
                        <p className="text-slate-900 font-black text-2xl tracking-tight">
                            {currency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Note */}
                <div className="px-8 pt-4 pb-6">
                    <p className="text-slate-400 text-xs leading-relaxed">
                        <span className="font-bold text-slate-500">Note:</span> This receipt is computer generated and no signature is required.
                        Funds are securely locked in the Safeeely escrow vault until both parties confirm delivery.
                    </p>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-8 py-5">
                    <p className="text-slate-700 font-bold text-sm">Safeeely Escrow Services</p>
                    <p className="text-slate-400 text-xs mt-0.5">Securing Global Transactions</p>
                    <p className="text-slate-400 text-xs">support@safeeely.com</p>
                </div>
            </div>
        </div>
    );
}
