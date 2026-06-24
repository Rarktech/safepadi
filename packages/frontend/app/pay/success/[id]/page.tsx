'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Shield, ArrowRight, MessageSquare } from 'lucide-react';
import axios from 'axios';
import posthog from 'posthog-js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PaymentSuccessPage() {
    const { id } = useParams();
    const router = useRouter();
    const [txn, setTxn] = useState<any>(null);

    useEffect(() => {
        if (id) posthog.capture('payment_success', { transaction_id: id });
    }, [id]);

    useEffect(() => {
        const fetchTxn = async () => {
            try {
                const res = await axios.get(`${API_URL}/transactions/${id}`);
                setTxn(res.data);
            } catch (err) {
                console.error('Fetch error:', err);
            }
        };
        if (id) fetchTxn();
    }, [id]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-inter">
            <div className="max-w-md w-full text-center">
                <div className="relative mb-8 flex justify-center">
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 animate-in zoom-in duration-500">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                </div>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Payment Secured!</h1>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">
                    Your funds are now held securely by Safeeely. The seller has been notified to fulfill your order.
                </p>

                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-10 text-left">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</span>
                        <span className="text-sm font-bold text-slate-900 font-mono">{txn?.txn_code || '...'}</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm font-medium text-slate-600">Payment confirmed & secured</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-sm font-medium text-slate-600">Awaiting seller delivery</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-sm font-medium text-slate-600">Buyer confirms receipt</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => window.close()} // Assuming they came from a bot link
                        className="w-full h-14 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                    >
                        Return to Messenger
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-center gap-2 text-slate-400">
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Safeeely Protected</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
