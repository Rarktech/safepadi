'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity, ArrowRightLeft, Calendar as CalendarIcon, ExternalLink, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export const LatestTransactions = ({ transactions, onShowAll, onSelectTxn, decodedSafetag }: any) => (
    <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Latest Transactions</h2>
            <span className="text-sm font-semibold text-primary cursor-pointer hover:underline" onClick={onShowAll}>View all</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <Table>
                <TableBody>
                    {transactions.slice(0, 5).map((tx: any) => (
                        <TableRow key={tx.id} className="cursor-pointer hover:bg-slate-50 border-slate-100" onClick={() => onSelectTxn(tx)}>
                            <TableCell className="py-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.seller?.safetag === decodedSafetag ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {tx.seller?.safetag === decodedSafetag ? <ArrowRightLeft className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{tx.product_name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{format(new Date(tx.created_at), 'PPP')}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                                <p className={cn("font-bold text-sm", tx.seller?.safetag === decodedSafetag ? 'text-emerald-600' : 'text-slate-900')}>
                                    {tx.seller?.safetag === decodedSafetag ? '+' : '-'} {tx.amount.toLocaleString()} {tx.currency}
                                </p>
                                <p className="text-xs text-slate-400 font-medium">{tx.status.replace(/_/g, ' ')}</p>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </section>
);

export const FullTransactionsTable = ({
    category, setCategory,
    dateRange, setDateRange,
    filteredTxns, onSelectTxn,
    decodedSafetag, getStatusColor
}: any) => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Tabs value={category} onValueChange={setCategory} className="w-full">
                <TabsList className="bg-white border border-slate-200 rounded-xl p-1 h-auto w-full flex overflow-x-auto no-scrollbar justify-start sm:justify-center">
                    <TabsTrigger value="all" className="flex-1 min-w-[80px] rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">All</TabsTrigger>
                    <TabsTrigger value="ongoing" className="flex-1 min-w-[100px] rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Ongoing</TabsTrigger>
                    <TabsTrigger value="completed" className="flex-1 min-w-[110px] rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Completed</TabsTrigger>
                    <TabsTrigger value="disputed" className="flex-1 min-w-[100px] rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white">Disputed</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-11 px-4 border-slate-200 text-slate-600 flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50">
                            <CalendarIcon className="w-4 h-4" />
                            {dateRange.from ? (
                                dateRange.to ? (
                                    <>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}</>
                                ) : (
                                    format(dateRange.from, "LLL dd")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
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
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-white border border-slate-200 text-slate-400" onClick={() => { setCategory('all'); setDateRange({ from: undefined, to: undefined }); }}>
                    <Activity className="w-4 h-4" />
                </Button>
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="min-w-[800px] lg:min-w-full">
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Name/Product</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Date</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Transaction ID</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Amount</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead>
                            <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTxns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-20 text-center text-slate-400 font-medium">No transactions found for this selection.</TableCell>
                            </TableRow>
                        ) : (
                            filteredTxns.map((tx: any) => (
                                <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-5 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                                                {tx.seller?.first_name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{tx.product_name}</p>
                                                <p className="text-xs text-slate-400 font-medium">@{tx.seller?.safetag}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-bold text-sm text-slate-800">{format(new Date(tx.created_at), 'dd MMM yyyy')}</p>
                                        <p className="text-xs text-slate-400 font-medium">At {format(new Date(tx.created_at), 'p')}</p>
                                    </TableCell>
                                    <TableCell>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-500">{tx.txn_code}</code>
                                    </TableCell>
                                    <TableCell>
                                        <p className={cn("font-bold text-sm", tx.seller?.safetag === decodedSafetag ? 'text-emerald-600' : 'text-slate-900')}>
                                            {tx.seller?.safetag === decodedSafetag ? '' : '-'} ${tx.amount.toLocaleString()} {tx.currency}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(tx.status))}>
                                            {tx.status.replace(/_/g, ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="outline" size="sm" className="rounded-lg h-9 border-slate-200 text-slate-600 font-bold hover:bg-slate-100" onClick={() => onSelectTxn(tx)}>Details</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    </div>
);

export const TransactionDetailModal = ({ selectedTxn, setSelectedTxn, getStatusColor, decodedSafetag }: any) => {
    const [proofCount, setProofCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchProofs = async () => {
            if (!selectedTxn) {
                setProofCount(null);
                return;
            }
            try {
                const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const res = await fetch(`${api_url}/transactions/${selectedTxn.id}/proofs`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await res.json();
                setProofCount(Array.isArray(data) ? data.length : 0);
            } catch (err) {
                console.error('Failed to fetch proof count:', err);
                setProofCount(0);
            }
        };
        fetchProofs();
    }, [selectedTxn]);

    const isBuyer = selectedTxn?.buyer?.safetag === decodedSafetag;
    const isSeller = selectedTxn?.seller?.safetag === decodedSafetag;

    return (
    <Dialog open={!!selectedTxn} onOpenChange={() => setSelectedTxn(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-primary/5 p-6 border-b border-primary/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" /> Transaction Details
                    </DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Code: <span className="font-mono text-primary">{selectedTxn?.txn_code}</span>
                    </DialogDescription>
                </DialogHeader>
            </div>

            <ScrollArea className="max-h-[60vh]">
                <div className="p-6 space-y-6">
                    {['COMPLETED_BY_SELLER', 'FINALIZED'].includes(selectedTxn?.status) && (
                        <div className={cn(
                            "p-5 rounded-3xl border flex items-center justify-between shadow-sm animate-in zoom-in duration-300",
                            proofCount === 0 ? "bg-amber-50 border-amber-100" : (proofCount === null ? "bg-slate-50 border-slate-100 animate-pulse" : "bg-green-50 border-green-100")
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                                    proofCount === 0 ? "bg-amber-100" : (proofCount === null ? "bg-slate-100" : "bg-green-100")
                                )}>
                                    <FileText className={cn("w-5 h-5", proofCount === 0 ? "text-amber-600" : (proofCount === null ? "text-slate-400" : "text-green-600"))} />
                                </div>
                                <div>
                                    <p className={cn(
                                        "text-[10px] uppercase tracking-widest font-black leading-none mb-1",
                                        proofCount === 0 ? "text-amber-700" : (proofCount === null ? "text-slate-400" : "text-green-700")
                                    )}>
                                        Delivery Proof
                                    </p>
                                    <p className={cn(
                                        "text-xs font-bold leading-none",
                                        proofCount === 0 ? "text-amber-900" : (proofCount === null ? "text-slate-500" : "text-green-900")
                                    )}>
                                        {proofCount === null ? "Checking for documents..." : (proofCount === 0 ? "Seller didn't attach a proof" : "Proof of delivery attached")}
                                    </p>
                                </div>
                            </div>
                            {proofCount !== 0 && (
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase h-8 px-4 rounded-xl shadow-sm"
                                    onClick={() => window.open(`/delivery/${selectedTxn.id}`, '_blank')}
                                >
                                    View Proof
                                </Button>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Buyer</p>
                            <p className="text-sm font-bold text-slate-800">{isBuyer ? 'You' : selectedTxn?.buyer?.safetag}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Seller</p>
                            <p className="text-sm font-bold text-slate-800">{isSeller ? 'You' : selectedTxn?.seller?.safetag}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Product</p>
                            <p className="text-sm font-bold text-slate-800">{selectedTxn?.product_name}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Status</p>
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", getStatusColor(selectedTxn?.status))}>
                                {selectedTxn?.status?.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-500">Amount</span>
                            <span className="text-sm font-bold text-slate-900">${selectedTxn?.amount?.toLocaleString()} {selectedTxn?.currency}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-500">Date</span>
                            <span className="text-sm font-bold text-slate-900">{selectedTxn?.created_at && format(new Date(selectedTxn.created_at), 'PPPp')}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-2xl text-white">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Description</p>
                        <p className="text-xs leading-relaxed opacity-90">{selectedTxn?.description || 'No description provided.'}</p>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-6 bg-slate-50 mt-auto border-t border-slate-100 flex gap-3">
                <Button className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold" onClick={() => setSelectedTxn(null)}>Close</Button>
                <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-200"><ExternalLink className="w-4 h-4" /></Button>
            </div>
        </DialogContent>
    </Dialog>
);
};
