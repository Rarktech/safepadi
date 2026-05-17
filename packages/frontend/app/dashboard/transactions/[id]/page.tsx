'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const DELIVERY_STATUSES = ['AWAITING_PROOF', 'COMPLETED_BY_SELLER', 'RETURN_PENDING'];

export default function TransactionRedirectPage() {
    const { id } = useParams();
    const router = useRouter();

    useEffect(() => {
        if (!id) return;
        axios.get(`${API_URL}/transactions/${id}`)
            .then(r => {
                const status: string = r.data.status;
                if (DELIVERY_STATUSES.includes(status)) {
                    router.replace(`/delivery/${id}`);
                } else {
                    router.replace(`/receipt/${id}`);
                }
            })
            .catch(() => router.replace(`/receipt/${id}`));
    }, [id]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
    );
}
