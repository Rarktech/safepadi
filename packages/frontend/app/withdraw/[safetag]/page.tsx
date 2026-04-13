'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Activity, Eye, EyeOff, Home, Wallet, Send, Settings, User, Users, ShoppingBag } from 'lucide-react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import api from '@/lib/api';

// Shadcn components
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

// Sub-components
import { SidebarContent } from '@/components/withdraw/Sidebar';
import { AccountsSection, ExchangeWidget, WithdrawBanner, TrustScore } from '@/components/withdraw/DashboardSections';
import { LatestTransactions, FullTransactionsTable, TransactionDetailModal } from '@/components/withdraw/TransactionsView';
import { WithdrawalView } from '@/components/withdraw/WithdrawalView';
import { SheetWithdrawal } from '@/components/withdraw/SheetWithdrawal';
import { ReferralView } from '@/components/withdraw/ReferralView';
import { DisputeDetailsView } from '@/components/withdraw/DisputeDetailsView';
import { MarketplaceManagement } from '@/components/marketplace/MarketplaceManagement';

export default function WithdrawDashboard() {
    const { safetag } = useParams() as { safetag: string };
    const searchParams = useSearchParams();
    const decodedSafetag = decodeURIComponent(safetag);

    const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'withdraw' | 'referrals' | 'dispute_details' | 'marketplace'>('dashboard');
    const [balances, setBalances] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [filteredTxns, setFilteredTxns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [reviewStats, setReviewStats] = useState<{ average_rating: number, review_count: number }>({ average_rating: 0, review_count: 0 });

    // Deep link initialization
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash === '#referrals') {
            setCurrentView('referrals');
        }
    }, []);

    // Handle deep links for specific views like dispute details
    useEffect(() => {
        const viewParam = searchParams.get('view');
        const txnIdParam = searchParams.get('txnId');

        if (viewParam === 'dispute_details' && txnIdParam && allTransactions.length > 0) {
            const txn = allTransactions.find(t => t.id === txnIdParam);
            if (txn) {
                console.log('🔗 Deep Linking to Dispute Details:', txn.txn_code);
                setSelectedTxn(txn);
                setCurrentView('dispute_details');
            }
        }
    }, [searchParams, allTransactions]);

    // Filters
    const [category, setCategory] = useState('all');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

    // Selected Txn for Modal
    const [selectedTxn, setSelectedTxn] = useState<any>(null);

    // Exchange state
    const [fromCurrency, setFromCurrency] = useState('');
    const [toCurrency, setToCurrency] = useState('');
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [showBalance, setShowBalance] = useState(true);
    const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
    const [preselectedCurrency, setPreselectedCurrency] = useState('USD');
    const [viewRefreshKey, setViewRefreshKey] = useState(0);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            console.log('🔄 Loading Dashboard Data for:', decodedSafetag);

            const [balRes, profRes, txnsRes, statsRes] = await Promise.all([
                api.get(`/profiles/${decodedSafetag}/balance`),
                api.get(`/profiles/by_safetag/${decodedSafetag}`),
                api.get(`/transactions?safetag=${decodedSafetag}`),
                api.get(`/reviews/stats/${decodedSafetag}`)
            ]);

            console.log('✅ Dashboard Data Loaded Successfully');

            const fetchedBalances = balRes.data?.balances || [];
            if (fetchedBalances.length === 0) {
                fetchedBalances.push({ currency: 'USD', amount: 0 });
            }
            setBalances(fetchedBalances);
            setProfile(profRes.data);
            setAllTransactions(txnsRes.data || []);
            setFilteredTxns(txnsRes.data || []);
            setReviewStats(statsRes.data || { average_rating: 0, review_count: 0 });

            setFromCurrency(fetchedBalances[0]?.currency || 'USD');
            setToCurrency(fetchedBalances.length > 1 ? fetchedBalances[1]?.currency : 'BTC');
        } catch (e: any) {
            console.error('❌ Dashboard Load Error:', e.message);
            console.error('🔗 Failed URL:', e.config?.url);
            console.error('📦 Response Data:', e.response?.data);
        } finally {
            setLoading(false);
        }
    }, [decodedSafetag]);

    useEffect(() => { loadData(); }, [loadData]);

    // Filtering Logic
    useEffect(() => {
        let filtered = [...allTransactions];

        if (category !== 'all') {
            if (category === 'ongoing') {
                filtered = filtered.filter(t => ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status));
            } else if (category === 'completed') {
                filtered = filtered.filter(t => t.status === 'FINALIZED');
            } else if (category === 'disputed') {
                filtered = filtered.filter(t => t.status === 'DISPUTED');
            }
        }

        if (dateRange.from && dateRange.to) {
            filtered = filtered.filter(t => {
                const date = new Date(t.created_at);
                return isWithinInterval(date, {
                    start: startOfDay(dateRange.from!),
                    end: endOfDay(dateRange.to!)
                });
            });
        }

        setFilteredTxns(filtered);
    }, [category, dateRange, allTransactions]);

    const handleExchange = () => {
        alert(`Exchange request for ${exchangeAmount} ${fromCurrency} to ${toCurrency} submitted.`);
        setExchangeAmount('');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'FINALIZED': return 'text-emerald-500 bg-emerald-50';
            case 'DISPUTED': return 'text-rose-600 bg-rose-100';
            case 'PAID': return 'text-blue-500 bg-blue-50';
            case 'ACCEPTED': return 'text-amber-500 bg-amber-50';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    const handleSelectTxn = (txn: any) => {
        if (!txn) {
            setSelectedTxn(null);
            return;
        }
        setSelectedTxn(txn);
        if (txn.status === 'DISPUTED' || txn.status.includes('DISPUTE')) {
            setCurrentView('dispute_details');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <SidebarProvider>
            <AppSidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                userName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.safetag : ''}
                userEmail={profile?.email}
            />
            <SidebarInset className="bg-slate-50 w-full overflow-x-hidden">
                <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/80 backdrop-blur-xl px-4 sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <div className="md:hidden flex items-center gap-2 mr-2">
                            <img src="/favicon.ico.png" alt="Safeeely Logo" className="w-12 h-12 rounded-lg shadow-sm object-cover" />
                        </div>
                        <SidebarTrigger className="-ml-1 text-slate-500 hidden md:flex" />
                        <Separator orientation="vertical" className="mr-2 h-4 hidden md:flex" />
                        <h1 className="text-lg font-bold text-slate-800">
                            <span className="md:inline hidden">
                                {currentView === 'dashboard' ? 'Dashboard' :
                                    currentView === 'transactions' ? 'My Transactions' : 
                                    currentView === 'marketplace' ? 'Marketplace Management' : 'Balance & Withdrawal'}
                            </span>
                            <span className="md:hidden inline">Welcome, {profile?.first_name || 'User'}</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowBalance(!showBalance)}
                            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>

                        <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {profile?.first_name?.[0] || profile?.safetag?.[1]?.toUpperCase() || 'S'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold leading-none text-slate-900">{profile?.safetag}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                    {currentView === 'dashboard' ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
                            <AccountsSection balances={balances} showBalance={showBalance} />

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                                {(() => {
                                    // Calculate total volume from finalized transactions
                                    const totalVolume = allTransactions
                                        .filter(t => t.status === 'FINALIZED')
                                        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

                                    // Calculate trust score percentage
                                    // If 0 reviews, we show a default or 0? Let's use 100 for "Clean Slate" or real avg.
                                    const calculatedTrustScore = reviewStats.review_count > 0
                                        ? (reviewStats.average_rating / 5) * 100
                                        : 100;

                                    return (
                                        <TrustScore
                                            score={calculatedTrustScore}
                                            totalTrades={totalVolume}
                                        />
                                    );
                                })()}
                                <ExchangeWidget
                                    balances={balances}
                                    fromCurrency={fromCurrency} setFromCurrency={setFromCurrency}
                                    toCurrency={toCurrency} setToCurrency={setToCurrency}
                                    exchangeAmount={exchangeAmount} setExchangeAmount={setExchangeAmount}
                                    handleExchange={handleExchange}
                                />
                                <WithdrawBanner onWithdraw={() => setCurrentView('withdraw')} />
                            </div>

                            <LatestTransactions
                                transactions={allTransactions}
                                onShowAll={() => setCurrentView('transactions')}
                                onSelectTxn={handleSelectTxn}
                                decodedSafetag={decodedSafetag}
                            />
                        </div>
                    ) : currentView === 'transactions' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <FullTransactionsTable
                                category={category} setCategory={setCategory}
                                dateRange={dateRange} setDateRange={setDateRange}
                                filteredTxns={filteredTxns}
                                onSelectTxn={handleSelectTxn}
                                decodedSafetag={decodedSafetag}
                                getStatusColor={getStatusColor}
                            />
                        </div>
                    ) : currentView === 'referrals' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ReferralView profile={profile} />
                        </div>
                    ) : currentView === 'marketplace' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <MarketplaceManagement />
                        </div>
                    ) : currentView === 'dispute_details' && selectedTxn ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DisputeDetailsView
                                txn={selectedTxn}
                                decodedSafetag={decodedSafetag}
                                onBack={() => {
                                    setCurrentView('transactions');
                                    setSelectedTxn(null);
                                    loadData();
                                }}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <WithdrawalView
                                profile={profile}
                                balances={balances}
                                onInternalWithdraw={(currency: string) => {
                                    setPreselectedCurrency(currency || 'USD');
                                    setIsWithdrawSheetOpen(true);
                                }}
                                refreshTrigger={viewRefreshKey}
                            />
                        </div>
                    )}
                </main>
            </SidebarInset>

            {currentView !== 'dispute_details' && (
                <TransactionDetailModal
                    selectedTxn={selectedTxn}
                    setSelectedTxn={handleSelectTxn}
                    getStatusColor={getStatusColor}
                    decodedSafetag={decodedSafetag}
                />
            )}

            <SheetWithdrawal
                isOpen={isWithdrawSheetOpen}
                onClose={() => setIsWithdrawSheetOpen(false)}
                balances={balances}
                safetag={decodedSafetag}
                preselectedCurrency={preselectedCurrency}
                onSuccess={(data) => {
                    console.log('✅ Withdrawal Success:', data);
                    loadData(); // Refresh balances and profile
                    setViewRefreshKey(prev => prev + 1); // Signal WithdrawalView to refresh history
                }}
            />

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                <nav className="bg-gradient-to-b from-[#0a2d1d] to-[#05140b] rounded-[32px] shadow-2xl border border-white/5 p-2 flex items-center justify-between backdrop-blur-xl">
                    <button
                        onClick={() => setCurrentView('dashboard')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'dashboard' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'dashboard' ? 'bg-[#16a34a] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Home size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('transactions')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'transactions' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'transactions' ? 'bg-[#16a34a] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Activity size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('marketplace')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'marketplace' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'marketplace' ? 'bg-[#16a34a] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <ShoppingBag size={20} className="text-white" />
                        </div>
                    </button>
                    <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Wallet size={20} className="text-white/40" />
                        </div>
                    </div>
                    <button
                        onClick={() => setCurrentView('withdraw')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'withdraw' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'withdraw' ? 'bg-[#16a34a] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Send size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('referrals')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'referrals' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'referrals' ? 'bg-[#16a34a] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Users size={20} className="text-white" />
                        </div>
                    </button>
                </nav>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `
            }} />
        </SidebarProvider>
    );
}
