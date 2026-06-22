'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity, ArrowRightLeft, Calendar as CalendarIcon, RotateCcw, X, FileText, ChevronRight, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
    FINALIZED: { bg: '#f0fdf4', color: '#16a34a', label: 'Finalized' },
    COMPLETED_BY_SELLER: { bg: '#eff6ff', color: '#2563eb', label: 'Delivered' },
    PAID: { bg: '#fffbeb', color: '#d97706', label: 'Paid' },
    ACCEPTED: { bg: '#fffbeb', color: '#d97706', label: 'Accepted' },
    AWAITING_PROOF: { bg: '#fffbeb', color: '#d97706', label: 'Awaiting proof' },
    PENDING_SELLER_ACCEPTANCE: { bg: '#f1f5f9', color: '#475569', label: 'Pending' },
    DISPUTED: { bg: '#fff1f2', color: '#e11d48', label: 'Disputed' },
    CANCELLED: { bg: '#f1f5f9', color: '#94a3b8', label: 'Cancelled' },
    REFUNDED: { bg: '#fdf4ff', color: '#9333ea', label: 'Refunded' },
};
const statusMeta = (status: string) => STATUS_META[status] || { bg: '#f1f5f9', color: '#475569', label: status?.replace(/_/g, ' ') || '—' };

interface TransactionsViewProps {
    currentView: 'dashboard' | 'transactions';
    setCurrentView: (v: 'dashboard' | 'transactions') => void;
    allTransactions: any[];
    filteredTxns: any[];
    category: string;
    setCategory: (v: string) => void;
    dateRange: { from: Date | undefined; to: Date | undefined };
    setDateRange: (range: any) => void;
    setSelectedTxn: (txn: any) => void;
    decodedSafetag: string;
    getStatusColor: (status: string) => string;
}

const STATUS_CHIP: Record<string, string> = {
    FINALIZED: 'bg-[#f0fdf4] text-[#16a34a]',
    COMPLETED_BY_SELLER: 'bg-[#f0fdf4] text-[#16a34a]',
    PAID: 'bg-[#eff6ff] text-[#2563eb]',
    ACCEPTED: 'bg-[#fffbeb] text-[#d97706]',
    AWAITING_PROOF: 'bg-[#fffbeb] text-[#d97706]',
    DISPUTED: 'bg-[#fff1f2] text-[#e11d48]',
};
const statusChipClass = (status: string) => STATUS_CHIP[status] || 'bg-[#f1f5f9] text-[#475569]';

export const LatestTransactions = ({ transactions, onShowAll, onSelectTxn, decodedSafetag }: any) => (
    <div className="bg-white rounded-2xl border border-[#e9eaec] p-[26px]">
        <div className="flex items-start justify-between mb-5">
            <div>
                <h2 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a] tracking-[-.01em]">Recent transactions</h2>
                <p className="text-xs text-[#94a3b8] mt-[3px]">Your last {Math.min(5, transactions.length)} of {transactions.length} trade{transactions.length !== 1 ? 's' : ''}</p>
            </div>
            <button
                onClick={onShowAll}
                className="flex items-center gap-1 text-[12.5px] font-semibold text-[#0f172a] bg-[#f7f8f9] border border-[#e9eaec] rounded-lg px-[13px] py-[7px]"
            >
                View all <ChevronRight className="w-2.5 h-2.5" />
            </button>
        </div>
        {transactions.length === 0 ? (
            <p className="text-center text-[#94a3b8] text-sm py-10">No transactions yet</p>
        ) : (
            <>
                <div className="grid grid-cols-[1fr_1fr_1fr_120px] gap-3 pb-[10px] border-b border-[#f3f4f6] mb-1">
                    <p className="text-[11px] font-medium text-[#94a3b8]">Transaction</p>
                    <p className="text-[11px] font-medium text-[#94a3b8]">Date</p>
                    <p className="text-[11px] font-medium text-[#94a3b8]">Amount</p>
                    <p className="text-[11px] font-medium text-[#94a3b8] text-right">Status</p>
                </div>
                {transactions.slice(0, 5).map((tx: any) => {
                    const isSeller = tx.seller?.safetag === decodedSafetag;
                    return (
                        <div
                            key={tx.id}
                            onClick={() => onSelectTxn(tx)}
                            className="grid grid-cols-[1fr_1fr_1fr_120px] gap-3 items-center py-[13px] border-b border-[#f3f4f6] last:border-b-0 last:pb-0 cursor-pointer hover:opacity-70 transition-opacity"
                        >
                            <div className="flex items-center gap-[11px]">
                                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${isSeller ? 'bg-[#f0fdf4]' : 'bg-[#fff1f2]'}`}>
                                    {isSeller
                                        ? <ArrowRightLeft className="w-[13px] h-[13px] text-[#16a34a]" />
                                        : <Activity className="w-[13px] h-[13px] text-[#e11d48]" />}
                                </div>
                                <p className="text-[13.5px] font-semibold text-[#0f172a] truncate">{tx.product_name}</p>
                            </div>
                            <p className="text-[12.5px] text-[#64748b]">{format(new Date(tx.created_at), 'PPP')}</p>
                            <p className={cn("font-['Inter_Tight',sans-serif] text-sm font-bold", isSeller ? 'text-[#10b981]' : 'text-[#0f172a]')}>
                                {isSeller ? '+' : '-'}{Number(tx.amount)?.toLocaleString()} {tx.currency}
                            </p>
                            <div className="text-right">
                                <span className={`inline-flex px-[9px] py-[3px] rounded-full text-[11px] font-semibold ${statusChipClass(tx.status)}`}>
                                    {tx.status.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </>
        )}
    </div>
);

const CATEGORY_TABS = [
    { key: 'all', label: 'All' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'completed', label: 'Completed' },
    { key: 'disputed', label: 'Disputed' },
];

const StatCard = ({ icon, iconBg, label, value, compact }: { icon: React.ReactNode; iconBg: string; label: string; value: string | number; compact?: boolean }) => (
    <div className="bg-white rounded-2xl border border-[#e9eaec] p-[14px_16px] md:p-[18px_22px] flex items-center gap-[10px] md:gap-[13px]">
        <div className={`w-[34px] h-[34px] md:w-[38px] md:h-[38px] rounded-[9px] md:rounded-[10px] flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        <div>
            <p className="text-[10px] md:text-[11px] font-medium text-[#94a3b8] mb-0.5 md:mb-[3px]">{label}</p>
            <p className={`font-['Inter_Tight',sans-serif] font-extrabold text-[#0f172a] tracking-[-.02em] leading-none ${compact ? 'text-[17px] md:text-[22px]' : 'text-[20px] md:text-[22px]'}`}>{value}</p>
        </div>
    </div>
);

export const FullTransactionsTable = ({
    category, setCategory,
    dateRange, setDateRange,
    filteredTxns, onSelectTxn,
    decodedSafetag,
    totalCount = 0, completedCount = 0, ongoingCount = 0, disputedCount = 0,
    totalVolume = 0, volumeSymbol = '',
    searchQuery = '', setSearchQuery,
}: any) => {
    const isFiltered = category !== 'all' || !!dateRange.from || !!searchQuery.trim();
    const resetFilters = () => { setCategory('all'); setDateRange({ from: undefined, to: undefined }); setSearchQuery?.(''); };
    const fmtVolume = totalVolume >= 1_000_000 ? `${(totalVolume / 1_000_000).toFixed(1)}M` : totalVolume >= 1_000 ? `${(totalVolume / 1_000).toFixed(1)}K` : totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const counts: Record<string, number> = { all: totalCount, ongoing: ongoingCount, completed: completedCount, disputed: disputedCount };

    const statCards = (
        <>
            <StatCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>} iconBg="bg-[#f0fdf4]" label="Completed" value={completedCount} />
            <StatCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} iconBg="bg-[#fffbeb]" label="Ongoing" value={ongoingCount} />
            <StatCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth={2.2}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>} iconBg="bg-[#fff1f2]" label="Disputed" value={disputedCount} />
            <StatCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} iconBg="bg-[#f0fdf4]" label="Total volume" value={`${volumeSymbol}${fmtVolume}`} compact />
        </>
    );

    return (
        <div className="flex flex-col gap-[14px] md:gap-[18px]">
            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] md:gap-3">{statCards}</div>

            {/* Mobile search */}
            {setSearchQuery && (
                <div className="md:hidden flex items-center gap-[7px] bg-white border border-[#e9eaec] rounded-[11px] px-[14px] py-[10px]">
                    <Search className="w-[14px] h-[14px] text-[#94a3b8]" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions…"
                        className="flex-1 text-[13px] text-[#0f172a] bg-transparent outline-none placeholder:text-[#94a3b8]"
                    />
                </div>
            )}

            {/* Desktop: filter bar + table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
                <div className="p-[16px_24px] border-b border-[#f3f4f6] flex items-center justify-between gap-[14px] flex-wrap">
                    <div className="flex items-center gap-[6px] bg-[#f7f8f9] rounded-[11px] p-1">
                        {CATEGORY_TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setCategory(t.key)}
                                className={cn(
                                    "flex items-center gap-[6px] px-[14px] py-2 rounded-[8px] font-semibold text-[12.5px] whitespace-nowrap transition-colors",
                                    category === t.key ? 'bg-[#0f172a] text-white' : 'bg-transparent text-[#64748b] hover:text-[#0f172a]'
                                )}
                            >
                                {t.label}
                                <span className={cn(
                                    "inline-flex items-center px-[6px] py-px rounded-full text-[10px] font-extrabold",
                                    category === t.key ? 'bg-white/20 text-white' : 'bg-[#e9eaec] text-[#475569]'
                                )}>{counts[t.key]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-[6px] bg-white border border-[#e9eaec] rounded-[9px] px-[13px] py-[7px] text-[12px] font-medium text-[#64748b]">
                                    <CalendarIcon className="w-[13px] h-[13px] text-[#94a3b8]" />
                                    {dateRange.from ? (
                                        dateRange.to ? <>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}</> : format(dateRange.from, "LLL dd")
                                    ) : 'All time'}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    selected={{ from: dateRange.from, to: dateRange.to }}
                                    onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        <button onClick={resetFilters} className="w-9 h-9 rounded-[9px] border border-[#e9eaec] bg-white flex items-center justify-center text-[#94a3b8]">
                            <RotateCcw className="w-[13px] h-[13px]" />
                        </button>
                    </div>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1.1fr_.9fr_100px_90px] gap-3 px-6 py-[10px] bg-[#fafafa] border-b border-[#f3f4f6]">
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Product / Party</p>
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Date</p>
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Transaction ID</p>
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Amount</p>
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em]">Status</p>
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em] text-right">Action</p>
                </div>

                {filteredTxns.length === 0 ? (
                    <div className="py-16 px-6 text-center flex flex-col items-center gap-2.5">
                        <div className="w-12 h-12 rounded-[13px] bg-[#f8f9fa] flex items-center justify-center">
                            <Activity className="w-5 h-5 text-[#94a3b8]" />
                        </div>
                        <p className="text-sm font-bold text-[#0f172a]">{isFiltered ? 'No transactions match' : 'No transactions yet'}</p>
                        <p className="text-xs text-[#94a3b8]">{isFiltered ? 'Try a different filter, date range, or search.' : 'Your transaction history will appear here once you start buying or selling.'}</p>
                    </div>
                ) : (
                    filteredTxns.map((tx: any) => {
                        const isSeller = tx.seller?.safetag === decodedSafetag;
                        const isBuyer = tx.buyer?.safetag === decodedSafetag;
                        const counterparty = isSeller ? tx.buyer?.safetag : tx.seller?.safetag;
                        const meta = statusMeta(tx.status);
                        const isDisputed = tx.status === 'DISPUTED';
                        return (
                            <div
                                key={tx.id}
                                onClick={() => onSelectTxn(tx)}
                                className="grid grid-cols-[2fr_1fr_1.1fr_.9fr_100px_90px] gap-3 items-center px-6 py-[14px] border-b border-[#f3f4f6] last:border-b-0 cursor-pointer hover:bg-[#fafbfc] transition-colors"
                            >
                                <div className="flex items-center gap-[11px] min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSeller ? 'bg-[#f0fdf4]' : 'bg-[#f1f5f9]'}`}>
                                        {isSeller
                                            ? <ArrowRightLeft className="w-4 h-4 text-[#16a34a]" />
                                            : <Activity className="w-4 h-4 text-[#475569]" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-[#0f172a] truncate">{tx.product_name}</p>
                                        <p className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">{isSeller ? `Selling to @${counterparty}` : `Buying from @${counterparty}`}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[12.5px] font-semibold text-[#0f172a]">{format(new Date(tx.created_at), 'd MMM yyyy')}</p>
                                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">{format(new Date(tx.created_at), 'p')}</p>
                                </div>
                                <div>
                                    <code className="bg-[#f7f8f9] border border-[#e9eaec] rounded-[6px] px-2 py-[3px] text-[10.5px] font-bold text-[#475569]">{tx.txn_code}</code>
                                </div>
                                <div>
                                    <p className={cn("font-['Inter_Tight',sans-serif] text-sm font-bold", isSeller ? 'text-[#10b981]' : 'text-[#0f172a]')}>
                                        {isSeller ? '+' : '-'}{Number(tx.amount)?.toLocaleString()}
                                    </p>
                                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">{tx.currency}</p>
                                </div>
                                <div>
                                    <span className="inline-flex px-[10px] py-[3px] rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectTxn(tx); }}
                                        className={cn(
                                            "h-[34px] px-[14px] rounded-[9px] border font-bold text-[12px]",
                                            isDisputed ? 'bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]' : 'bg-white text-[#64748b] border-[#e9eaec]'
                                        )}
                                    >
                                        {isDisputed ? 'Dispute' : 'Details'}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Mobile: filter pills + card list */}
            <div className="md:hidden flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {CATEGORY_TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setCategory(t.key)}
                            className={cn(
                                "flex items-center gap-[5px] px-[14px] py-2 rounded-full border font-semibold text-[12px] whitespace-nowrap shrink-0",
                                category === t.key ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-[#64748b] border-[#e9eaec]'
                            )}
                        >
                            {t.label} ({counts[t.key]})
                        </button>
                    ))}
                </div>

                {filteredTxns.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center gap-2.5">
                        <p className="text-sm font-bold text-[#0f172a]">{isFiltered ? 'No transactions' : 'No transactions yet'}</p>
                        <p className="text-xs text-[#94a3b8]">{isFiltered ? 'Nothing matches your filter.' : 'Start buying or selling to see history here.'}</p>
                    </div>
                ) : (
                    <div className="bg-[#e9eaec] rounded-[18px] overflow-hidden flex flex-col gap-px">
                        {filteredTxns.map((tx: any) => {
                            const isSeller = tx.seller?.safetag === decodedSafetag;
                            const counterparty = isSeller ? tx.buyer?.safetag : tx.seller?.safetag;
                            const meta = statusMeta(tx.status);
                            return (
                                <div key={tx.id} onClick={() => onSelectTxn(tx)} className="flex items-center gap-[13px] p-4 bg-white cursor-pointer">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSeller ? 'bg-[#f0fdf4]' : 'bg-[#f1f5f9]'}`}>
                                        {isSeller
                                            ? <ArrowRightLeft className="w-[17px] h-[17px] text-[#16a34a]" />
                                            : <Activity className="w-[17px] h-[17px] text-[#475569]" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13.5px] font-bold text-[#0f172a] truncate">{tx.product_name}</p>
                                        <p className="text-[11px] text-[#94a3b8] mt-0.5">@{counterparty} · {format(new Date(tx.created_at), 'd MMM')}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn("font-['Inter_Tight',sans-serif] text-sm font-bold", isSeller ? 'text-[#10b981]' : 'text-[#0f172a]')}>
                                            {isSeller ? '+' : '-'}{Number(tx.amount)?.toLocaleString()} {tx.currency}
                                        </p>
                                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: meta.color }}>{meta.label}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailBody = ({ selectedTxn, proofCount, isBuyer, isSeller, compact }: any) => {
    const meta = statusMeta(selectedTxn?.status);
    const showProofBar = selectedTxn && ['COMPLETED_BY_SELLER', 'FINALIZED'].includes(selectedTxn.status);
    const hasProof = proofCount !== null && proofCount > 0;
    return (
        <>
            <div className={`bg-[#f7f8f9] border border-[#e9eaec] rounded-2xl text-center ${compact ? 'p-[18px] mb-4' : 'p-[22px] mb-[18px]'}`}>
                <p className="text-[11px] font-semibold text-[#94a3b8] mb-1.5">{isSeller ? 'Selling · you are the seller' : 'Buying · you are the buyer'}</p>
                <p className={`font-['Inter_Tight',sans-serif] font-extrabold leading-none tracking-[-.04em] ${compact ? 'text-[34px]' : 'text-[40px]'}`} style={{ color: isSeller ? '#10b981' : '#0f172a' }}>
                    {isSeller ? '+' : '-'} {Number(selectedTxn?.amount)?.toLocaleString()}
                </p>
                <p className="text-xs text-[#94a3b8] mt-[5px]">{selectedTxn?.currency}</p>
            </div>

            {showProofBar && (
                <div
                    className="flex items-center justify-between gap-[10px] p-[13px_14px] rounded-[13px] mb-[14px] border"
                    style={{ background: hasProof ? '#f0fdf4' : '#fffbeb', borderColor: hasProof ? '#bbf7d0' : '#fde68a' }}
                >
                    <div className="flex items-center gap-[11px] min-w-0">
                        <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: hasProof ? '#dcfce7' : '#fef3c7' }}>
                            <FileText className="w-4 h-4" style={{ color: hasProof ? '#16a34a' : '#d97706' }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-[.06em]" style={{ color: hasProof ? '#15803d' : '#92400e' }}>DELIVERY PROOF</p>
                            <p className="text-[12.5px] font-bold text-[#0f172a] mt-0.5">{proofCount === null ? 'Checking for documents…' : (hasProof ? 'Proof of delivery attached' : "Seller didn't attach a proof yet")}</p>
                        </div>
                    </div>
                    {hasProof && (
                        <button
                            onClick={() => window.open(`/delivery/${selectedTxn.id}`, '_blank')}
                            className="bg-[#16a34a] text-white font-bold text-[11px] rounded-[8px] px-[14px] py-2 whitespace-nowrap shrink-0"
                        >
                            View proof
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-[10px] mb-[14px]">
                <div className="bg-white border border-[#e9eaec] rounded-[13px] p-[14px]">
                    <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.06em] mb-2">BUYER</p>
                    <p className="text-[12.5px] font-bold text-[#0f172a]">{isBuyer ? 'You' : (selectedTxn?.buyer ? `${selectedTxn.buyer.first_name || ''} ${selectedTxn.buyer.last_name || ''}`.trim() : 'Buyer')}</p>
                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">@{selectedTxn?.buyer?.safetag || '—'}</p>
                </div>
                <div className="bg-white border border-[#e9eaec] rounded-[13px] p-[14px]">
                    <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.06em] mb-2">SELLER</p>
                    <p className="text-[12.5px] font-bold text-[#0f172a]">{isSeller ? 'You' : (selectedTxn?.seller ? `${selectedTxn.seller.first_name || ''} ${selectedTxn.seller.last_name || ''}`.trim() : 'Seller')}</p>
                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">@{selectedTxn?.seller?.safetag || '—'}</p>
                </div>
            </div>

            <div className="rounded-[14px] border border-[#e9eaec] overflow-hidden mb-[14px]">
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#f3f4f6]">
                    <span className="text-xs text-[#64748b] font-medium">Product</span>
                    <span className="text-[12.5px] font-bold text-[#0f172a] text-right max-w-[200px]">{selectedTxn?.product_name}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#f3f4f6]">
                    <span className="text-xs text-[#64748b] font-medium">Date &amp; time</span>
                    <span className="text-[12.5px] font-bold text-[#0f172a]">{selectedTxn?.created_at && format(new Date(selectedTxn.created_at), 'PPPp')}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#f3f4f6]">
                    <span className="text-xs text-[#64748b] font-medium">Platform fee</span>
                    <span className="text-[12.5px] font-bold text-[#10b981]">Free</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-[#64748b] font-medium">Status</span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                </div>
            </div>

            <div className="bg-[#0f172a] rounded-[14px] p-[16px_18px]">
                <p className="text-[10px] font-bold text-white/35 tracking-[.06em] mb-[7px]">DESCRIPTION</p>
                <p className="text-[13px] text-white/70 leading-[1.65]">{selectedTxn?.description || 'No description provided.'}</p>
            </div>
        </>
    );
};

export const TransactionDetailPanel = ({ selectedTxn, setSelectedTxn, decodedSafetag }: any) => {
    const [proofCount, setProofCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchProofs = async () => {
            if (!selectedTxn) {
                setProofCount(null);
                return;
            }
            try {
                const res = await api.get(`/transactions/${selectedTxn.id}/proofs`);
                setProofCount(Array.isArray(res.data) ? res.data.length : 0);
            } catch (err) {
                console.error('Failed to fetch proof count:', err);
                setProofCount(0);
            }
        };
        fetchProofs();
    }, [selectedTxn]);

    if (!selectedTxn) return null;

    const isBuyer = selectedTxn?.buyer?.safetag === decodedSafetag;
    const isSeller = selectedTxn?.seller?.safetag === decodedSafetag;
    const isDisputed = selectedTxn?.status === 'DISPUTED';
    const meta = statusMeta(selectedTxn?.status);
    const close = () => setSelectedTxn(null);
    const viewDispute = () => setSelectedTxn(selectedTxn);
    const shareReceipt = () => window.open(`/receipt/${selectedTxn.id}`, '_blank');

    return (
        <>
            {/* Desktop slide-in panel */}
            <div className="hidden md:block">
                <div className="fixed inset-0 bg-[#0f172a]/[.22] backdrop-blur-[1px] z-50" onClick={close} />
                <div className="fixed top-0 right-0 bottom-0 w-[480px] max-w-[100vw] bg-white z-[60] flex flex-col border-l border-[#e9eaec] shadow-[-24px_0_60px_rgba(15,23,42,.1)]">
                    <div className="px-6 pt-[22px] flex-shrink-0">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-[5px]">
                                    <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: isSeller ? '#f0fdf4' : '#f1f5f9' }}>
                                        <Activity className="w-3.5 h-3.5" style={{ color: isSeller ? '#16a34a' : '#475569' }} />
                                    </div>
                                    <h2 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[#0f172a] tracking-[-.02em]">Transaction details</h2>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <code className="bg-[#f1f5f9] rounded-[6px] px-[9px] py-[3px] text-[11px] font-bold text-[#475569]">{selectedTxn.txn_code}</code>
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                </div>
                            </div>
                            <button onClick={close} className="w-9 h-9 rounded-[9px] border border-[#e9eaec] bg-[#f7f8f9] flex items-center justify-center shrink-0 ml-3">
                                <X className="w-3.5 h-3.5 text-[#64748b]" />
                            </button>
                        </div>
                        <div className="h-px bg-[#f1f5f9] -mx-6" />
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <DetailBody selectedTxn={selectedTxn} proofCount={proofCount} isBuyer={isBuyer} isSeller={isSeller} />
                    </div>

                    <div className="p-[14px_24px_20px] border-t border-[#f1f5f9] flex-shrink-0 flex gap-2.5">
                        <button onClick={close} className="flex-1 h-[46px] rounded-full border border-[#e9eaec] bg-[#f7f8f9] text-[#64748b] font-semibold text-sm">Close</button>
                        {isDisputed ? (
                            <button onClick={viewDispute} className="flex-[2] h-[46px] rounded-full bg-[#fff1f2] text-[#e11d48] font-bold text-sm flex items-center justify-center gap-[7px]">
                                <Activity className="w-3.5 h-3.5" /> View dispute
                            </button>
                        ) : (
                            <button onClick={shareReceipt} className="flex-[2] h-[46px] rounded-full bg-[#0f172a] text-white font-bold text-sm">Share receipt</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile bottom sheet */}
            <div className="md:hidden">
                <div className="fixed inset-0 bg-[#0f172a]/[.22] backdrop-blur-[1px] z-[55]" onClick={close} />
                <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-[60] max-h-[88vh] flex flex-col shadow-[0_-16px_40px_rgba(15,23,42,.14)]">
                    <div className="px-6 pt-[14px] flex-shrink-0">
                        <div className="w-10 h-1 rounded-full bg-[#e9eaec] mx-auto mb-4" />
                        <div className="flex items-start justify-between mb-[14px]">
                            <div>
                                <h3 className="font-['Inter_Tight',sans-serif] text-[17px] font-extrabold text-[#0f172a] mb-1">Transaction details</h3>
                                <div className="flex items-center gap-1.5">
                                    <code className="bg-[#f1f5f9] rounded-[6px] px-2 py-0.5 text-[10.5px] font-bold text-[#475569]">{selectedTxn.txn_code}</code>
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                </div>
                            </div>
                            <button onClick={close} className="w-[34px] h-[34px] rounded-[9px] border border-[#e9eaec] bg-[#f7f8f9] flex items-center justify-center shrink-0">
                                <X className="w-3.5 h-3.5 text-[#64748b]" />
                            </button>
                        </div>
                        <div className="h-px bg-[#f1f5f9] -mx-6" />
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-[18px]">
                        <DetailBody selectedTxn={selectedTxn} proofCount={proofCount} isBuyer={isBuyer} isSeller={isSeller} compact />
                        <div className="flex gap-2.5 mt-4">
                            <button onClick={close} className="flex-1 h-12 rounded-full border border-[#e9eaec] bg-[#f7f8f9] text-[#64748b] font-semibold text-sm">Close</button>
                            {isDisputed ? (
                                <button onClick={viewDispute} className="flex-[2] h-12 rounded-full bg-[#fff1f2] text-[#e11d48] font-bold text-sm">View dispute</button>
                            ) : (
                                <button onClick={shareReceipt} className="flex-[2] h-12 rounded-full bg-[#0f172a] text-white font-bold text-sm">Share receipt</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
