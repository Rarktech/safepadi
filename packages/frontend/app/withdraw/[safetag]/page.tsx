'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Activity, Home, Send, Settings, User, Users, ShoppingBag, Bell } from 'lucide-react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import api from '@/lib/api';

// Shadcn components
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Sub-components
import { SidebarContent } from '@/components/withdraw/Sidebar';
import { AccountsSection, ExchangeWidget, WithdrawBanner, TrustScore, BalanceHero, PortfolioSection, MobileDashboard } from '@/components/withdraw/DashboardSections';
import { LatestTransactions, FullTransactionsTable, TransactionDetailModal } from '@/components/withdraw/TransactionsView';
import { WithdrawalView } from '@/components/withdraw/WithdrawalView';
import { SheetWithdrawal } from '@/components/withdraw/SheetWithdrawal';
import { ReferralView } from '@/components/withdraw/ReferralView';
import { DisputeDetailsView } from '@/components/withdraw/DisputeDetailsView';
import { MarketplaceManagement } from '@/components/marketplace/MarketplaceManagement';
import { NotificationsView } from '@/components/withdraw/NotificationsView';
import { ContinueTransactionModal } from '@/components/withdraw/ContinueTransactionModal';

export default function WithdrawDashboard() {
    const { safetag } = useParams() as { safetag: string };
    const searchParams = useSearchParams();
    const decodedSafetag = decodeURIComponent(safetag);
    const router = useRouter();
    const pathname = usePathname();

    const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'withdraw' | 'referrals' | 'dispute_details' | 'marketplace' | 'notifications'>('dashboard');
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [continueModal, setContinueModal] = useState<{ txnId: string; txnCode: string; txnTitle: string } | null>(null);
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

    // Handle deep links for specific views like dispute details and continue-transaction modal
    useEffect(() => {
        const viewParam = searchParams.get('view');
        const txnIdParam = searchParams.get('txnId');
        const continueParam = searchParams.get('continue');
        const txnCodeParam = searchParams.get('txnCode');
        const txnTitleParam = searchParams.get('txnTitle');

        if (viewParam === 'dispute_details' && txnIdParam && allTransactions.length > 0) {
            const txn = allTransactions.find(t => t.id === txnIdParam);
            if (txn) {
                console.log('🔗 Deep Linking to Dispute Details:', txn.txn_code);
                setSelectedTxn(txn);
                setCurrentView('dispute_details');
            }
        }

        if (continueParam) {
            setContinueModal({
                txnId: continueParam,
                txnCode: txnCodeParam || '',
                txnTitle: txnTitleParam ? decodeURIComponent(txnTitleParam) : '',
            });
            // Strip ?continue params so modal does not re-open when user presses browser back
            router.replace(pathname);
        }
    }, [searchParams, allTransactions]);

    // Restore notifications view when URL has ?view=notifications
    // Separate effect (no allTransactions dep) so data reloads don't override user's current view
    useEffect(() => {
        if (searchParams.get('view') === 'notifications') {
            setCurrentView('notifications');
        }
    }, [searchParams]);

    // Filters
    const [category, setCategory] = useState('all');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

    // Selected Txn for Modal
    const [selectedTxn, setSelectedTxn] = useState<any>(null);

    // Exchange state
    const [fromCurrency, setFromCurrency] = useState('');
    const [toCurrency, setToCurrency] = useState('');
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [showBalance, setShowBalance] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('safeeely_show_balance') !== 'false';
        }
        return true;
    });
    useEffect(() => {
        localStorage.setItem('safeeely_show_balance', String(showBalance));
    }, [showBalance]);

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

    // Fetch unread notification count for badge
    useEffect(() => {
        if (!decodedSafetag) return;
        api.get(`/notifications/${encodeURIComponent(decodedSafetag)}?limit=1&offset=0`)
            .then(res => setUnreadNotifCount(res.data?.unread_count ?? 0))
            .catch(() => {});
    }, [decodedSafetag]);

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
                <header className="flex h-16 shrink-0 items-center justify-between px-4 sticky top-0 z-40" style={{ backgroundColor: '#F4F7F6' }}>
                    {/* Desktop header */}
                    <div className="hidden md:flex items-center gap-2">
                        <SidebarTrigger className="-ml-1 text-slate-500" />
                        <h1 className="text-lg font-bold text-slate-800">
                            {currentView === 'dashboard' ? 'Dashboard' :
                                currentView === 'transactions' ? 'My Transactions' :
                                currentView === 'marketplace' ? 'Marketplace Management' :
                                currentView === 'notifications' ? 'Notifications' : 'Balance & Withdrawal'}
                        </h1>
                    </div>

                    {/* Mobile header: favicon + greeting */}
                    <div className="md:hidden flex items-center gap-3">
                        <img src="/logo-mark.svg" alt="Safeeely" className="w-10 h-10 object-contain shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[11px] text-slate-400 font-medium">
                                Hello, {(() => { const h = new Date().getHours(); return h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : 'good evening'; })()}!
                            </span>
                            <span className="text-sm font-bold text-slate-900">{profile?.first_name || profile?.safetag || 'User'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push(`${pathname}?view=notifications`)}
                            className="relative p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            <Bell size={18} />
                            {unreadNotifCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                                </span>
                            )}
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

                <main className="flex flex-1 flex-col md:gap-8 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {currentView === 'dashboard' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Mobile: new overlapping panel design */}
                            <div className="md:hidden">
                                <MobileDashboard
                                    balances={balances}
                                    showBalance={showBalance}
                                    allTransactions={allTransactions}
                                    onWithdraw={() => setCurrentView('withdraw')}
                                    onCreate={() => setCurrentView('marketplace')}
                                    onShowAll={() => setCurrentView('transactions')}
                                    onSelectTxn={handleSelectTxn}
                                    onToggleBalance={() => setShowBalance(v => !v)}
                                    decodedSafetag={decodedSafetag}
                                />
                            </div>
                            {/* Desktop: sidebar grid layout */}
                            <div className="hidden md:flex flex-col gap-8">
                                <BalanceHero
                                    balances={balances}
                                    showBalance={showBalance}
                                    onWithdraw={() => setCurrentView('withdraw')}
                                    onCreate={() => setCurrentView('marketplace')}
                                />
                                <PortfolioSection
                                    balances={balances}
                                    showBalance={showBalance}
                                    onToggleBalance={() => setShowBalance(v => !v)}
                                    allTransactions={allTransactions}
                                />
                                <LatestTransactions
                                    transactions={allTransactions}
                                    onShowAll={() => setCurrentView('transactions')}
                                    onSelectTxn={handleSelectTxn}
                                    decodedSafetag={decodedSafetag}
                                />
                            </div>
                        </div>
                    ) : currentView === 'transactions' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-0 pb-24 md:pb-0">
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
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-0 pb-24 md:pb-0">
                            <ReferralView profile={profile} />
                        </div>
                    ) : currentView === 'marketplace' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-0 pb-24 md:pb-0">
                             <MarketplaceManagement />
                        </div>
                    ) : currentView === 'notifications' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                            <NotificationsView
                                safetag={decodedSafetag}
                                onBack={() => { setCurrentView('dashboard'); router.replace(pathname); }}
                                onUnreadCountChange={setUnreadNotifCount}
                            />
                        </div>
                    ) : currentView === 'dispute_details' && selectedTxn ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-0 pb-24 md:pb-0">
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
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-0 pb-24 md:pb-0">
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

            {/* Continue Transaction Modal */}
            {continueModal && (
                <ContinueTransactionModal
                    txnId={continueModal.txnId}
                    txnCode={continueModal.txnCode}
                    txnTitle={continueModal.txnTitle}
                    safetag={decodedSafetag}
                    onClose={() => setContinueModal(null)}
                />
            )}

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                <nav className="bg-gradient-to-b from-[#0a2d1d] to-[#05140b] rounded-[32px] shadow-2xl border border-white/5 p-2 flex items-center justify-between backdrop-blur-xl">
                    <button
                        onClick={() => setCurrentView('dashboard')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'dashboard' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'dashboard' ? 'bg-[#10b981] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Home size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('transactions')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'transactions' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'transactions' ? 'bg-[#10b981] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Activity size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('marketplace')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'marketplace' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'marketplace' ? 'bg-[#10b981] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <ShoppingBag size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('withdraw')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'withdraw' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'withdraw' ? 'bg-[#10b981] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Send size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('referrals')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'referrals' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${currentView === 'referrals' ? 'bg-[#10b981] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Users size={20} className="text-white" />
                        </div>
                    </button>
                    <button
                        onClick={() => router.push(`${pathname}?view=notifications`)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 ${currentView === 'notifications' ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <div className={`relative p-2 rounded-full transition-colors ${currentView === 'notifications' ? 'bg-[#10b981] shadow-lg shadow-emerald-500/20' : ''}`}>
                            <Bell size={20} className="text-white" />
                            {unreadNotifCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                                </span>
                            )}
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
