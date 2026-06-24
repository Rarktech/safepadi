'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ShieldCheck, Landmark, AlertTriangle } from 'lucide-react';
import posthog from 'posthog-js';
import api from '@/lib/api';
import type { ViewType } from '@/types/view';

function bucketBalance(amount: number): string {
    if (amount <= 0) return '0';
    if (amount < 100) return '<100';
    if (amount < 1000) return '100-999';
    if (amount < 10000) return '1000-9999';
    return '10000+';
}

// Shadcn components
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

// Sub-components
import {
    BalanceHero, PortfolioSection, MobileDashboard,
    TrustScoreCard, QuickStatsGrid,
    CURRENCY_SYMBOLS, type PendingAction,
} from '@/components/withdraw/DashboardSections';
import { LatestTransactions, FullTransactionsTable, TransactionDetailPanel } from '@/components/withdraw/TransactionsView';
import { WithdrawalView } from '@/components/withdraw/WithdrawalView';
import { SheetWithdrawal } from '@/components/withdraw/SheetWithdrawal';
import { ReferralView } from '@/components/withdraw/ReferralView';
import { DisputeDetailsView } from '@/components/withdraw/DisputeDetailsView';
import { MarketplaceManagement } from '@/components/marketplace/MarketplaceManagement';
import { NotificationsView } from '@/components/withdraw/NotificationsView';
import { ContinueTransactionModal } from '@/components/withdraw/ContinueTransactionModal';
import { DisputesListView } from '@/components/disputes/DisputesListView';
import { DisputeChatPage } from '@/components/disputes/DisputeChatPage';
import { ProfileView } from '@/components/profile/ProfileView';

export default function WithdrawDashboard() {
    const { safetag } = useParams() as { safetag: string };
    const searchParams = useSearchParams();
    const decodedSafetag = decodeURIComponent(safetag);
    const router = useRouter();
    const pathname = usePathname();

    const [currentView, setCurrentView] = useState<ViewType>('dashboard');
    const [selectedDispute, setSelectedDispute] = useState<any>(null);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [continueModal, setContinueModal] = useState<{ txnId: string; txnCode: string; txnTitle: string } | null>(null);
    const [balances, setBalances] = useState<any[]>([]);
    const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [filteredTxns, setFilteredTxns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [reviewStats, setReviewStats] = useState<{ average_rating: number, review_count: number }>({ average_rating: 0, review_count: 0 });
    const [payoutMethods, setPayoutMethods] = useState<any[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [referralStats, setReferralStats] = useState<{ earningsByCurrency: any[] }>({ earningsByCurrency: [] });

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
                api.get(`/disputes/transaction/${txn.id}`)
                    .then(res => {
                        if (res.data) {
                            setSelectedDispute(res.data);
                            setCurrentView('dispute_chat');
                        } else {
                            setSelectedTxn(txn);
                            setCurrentView('dispute_details');
                        }
                    })
                    .catch(() => {
                        setSelectedTxn(txn);
                        setCurrentView('dispute_details');
                    });
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

    // Restore simple views (e.g. ?view=notifications, ?view=profile) from the URL.
    // Separate effect (no allTransactions dep) so data reloads don't override user's current view.
    // Excludes dispute_details/dispute_chat, which need extra data and are handled above.
    const SIMPLE_DEEP_LINK_VIEWS: ViewType[] = ['dashboard', 'transactions', 'withdraw', 'referrals', 'marketplace', 'notifications', 'disputes', 'profile'];
    useEffect(() => {
        const viewParam = searchParams.get('view');
        if (SIMPLE_DEEP_LINK_VIEWS.includes(viewParam as ViewType)) {
            setCurrentView(viewParam as ViewType);
        }
    }, [searchParams]);

    // Filters
    const [category, setCategory] = useState('all');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
    const [searchQuery, setSearchQuery] = useState('');

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
    const [activeWalletIndex, setActiveWalletIndex] = useState(0);
    useEffect(() => {
        if (activeWalletIndex >= balances.length) setActiveWalletIndex(0);
    }, [balances, activeWalletIndex]);

    const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
    const [preselectedCurrency, setPreselectedCurrency] = useState('USD');
    const [viewRefreshKey, setViewRefreshKey] = useState(0);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Verify session belongs to this dashboard's safetag
            const meRes = await api.get('/auth/me').catch(() => null);
            if (meRes?.data?.safetag && meRes.data.safetag.toLowerCase() !== decodedSafetag.toLowerCase()) {
                router.replace('/login?reason=forbidden');
                return;
            }

            console.log('🔄 Loading Dashboard Data for:', decodedSafetag);

            const [balRes, profRes, txnsRes, statsRes, payoutRes, disputesRes, referralRes] = await Promise.all([
                api.get(`/profiles/${decodedSafetag}/balance`),
                api.get(`/profiles/by_safetag/${decodedSafetag}`),
                api.get(`/transactions?safetag=${decodedSafetag}`),
                api.get(`/reviews/stats/${decodedSafetag}`),
                api.get(`/profiles/${decodedSafetag}/payout-methods`).catch(() => ({ data: [] })),
                api.get(`/disputes/my-disputes`).catch(() => ({ data: [] })),
                api.get(`/referrals/${decodedSafetag}/stats`).catch(() => ({ data: { earningsByCurrency: [] } })),
            ]);

            console.log('✅ Dashboard Data Loaded Successfully');

            const fetchedBalances = balRes.data?.balances || [];
            if (fetchedBalances.length === 0) {
                fetchedBalances.push({ currency: 'USD', amount: 0 });
            }
            setBalances(fetchedBalances);
            setPendingRefunds(balRes.data?.pending_refunds || []);
            setProfile(profRes.data);
            setAllTransactions(txnsRes.data || []);
            setFilteredTxns(txnsRes.data || []);
            setReviewStats(statsRes.data || { average_rating: 0, review_count: 0 });
            setPayoutMethods(payoutRes.data || []);
            setDisputes(disputesRes.data || []);
            setReferralStats(referralRes.data || { earningsByCurrency: [] });

            setFromCurrency(fetchedBalances[0]?.currency || 'USD');
            setToCurrency(fetchedBalances.length > 1 ? fetchedBalances[1]?.currency : 'BTC');

            posthog.capture('withdrawal_page_viewed', {
                available_balance_bucket: bucketBalance(fetchedBalances[0]?.amount || 0),
                currency: fetchedBalances[0]?.currency,
            });
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

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(t => {
                const counterparty = t.seller?.safetag === decodedSafetag ? t.buyer?.safetag : t.seller?.safetag;
                return (
                    t.product_name?.toLowerCase().includes(q) ||
                    t.txn_code?.toLowerCase().includes(q) ||
                    counterparty?.toLowerCase().includes(q)
                );
            });
        }

        setFilteredTxns(filtered);
    }, [category, dateRange, searchQuery, allTransactions, decodedSafetag]);

    const handleExchange = () => {
        alert(`Exchange request for ${exchangeAmount} ${fromCurrency} to ${toCurrency} submitted.`);
        setExchangeAmount('');
    };

    const handleSelectTxn = async (txn: any) => {
        if (!txn) {
            setSelectedTxn(null);
            return;
        }
        if (txn.status === 'DISPUTED' || txn.status?.includes('DISPUTE')) {
            try {
                const res = await api.get(`/disputes/transaction/${txn.id}`);
                if (res.data) {
                    setSelectedDispute(res.data);
                    setCurrentView('dispute_chat');
                    return;
                }
            } catch {}
            // Fallback: old view
            setSelectedTxn(txn);
            setCurrentView('dispute_details');
            return;
        }
        setSelectedTxn(txn);
    };

    // Derived dashboard stats (Phase 1 redesign)
    const primaryCurrency = balances[0]?.currency || 'USD';
    const primarySymbol = CURRENCY_SYMBOLS[primaryCurrency] || '';
    const finalizedTxns = allTransactions.filter((t: any) => t.status === 'FINALIZED');
    const completedCount = finalizedTxns.length;
    const totalTxnCount = allTransactions.length;
    const totalVolume = finalizedTxns
        .filter((t: any) => t.currency === primaryCurrency)
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const openDisputeCount = disputes.filter((d: any) => d.status !== 'RESOLVED').length;
    const ongoingTxnCount = allTransactions.filter((t: any) => ['PENDING_SELLER_ACCEPTANCE', 'ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(t.status)).length;
    const disputedTxnCount = allTransactions.filter((t: any) => t.status === 'DISPUTED').length;
    const referralEntry = referralStats.earningsByCurrency?.find((e: any) => e.currency === primaryCurrency) || referralStats.earningsByCurrency?.[0];
    const referralEarning = referralEntry?.totalEarned || 0;
    const referralSymbol = CURRENCY_SYMBOLS[referralEntry?.currency || primaryCurrency] || '';
    const kycVerified = profile?.kyc_status === 'VERIFIED';

    const pendingActions: PendingAction[] = [];
    if (!kycVerified) {
        pendingActions.push({
            key: 'kyc',
            title: 'Complete KYC verification',
            subtitle: profile?.kyc_status === 'PENDING' ? 'Your documents are under review' : 'Verify your identity to unlock withdrawals',
            icon: <ShieldCheck className="w-[15px] h-[15px] text-[#16a34a]" />,
            iconBg: 'bg-[#f0fdf4]',
            action: () => router.push('/kyc'),
        });
    }
    if (payoutMethods.length === 0) {
        pendingActions.push({
            key: 'payout_method',
            title: 'Add a payout method',
            subtitle: 'Connect a bank to withdraw your earnings',
            icon: <Landmark className="w-[15px] h-[15px] text-[#d97706]" />,
            iconBg: 'bg-[#fffbeb]',
            cardBorder: 'border-[#fde68a]',
            action: () => { setPreselectedCurrency(primaryCurrency); setIsWithdrawSheetOpen(true); },
        });
    }
    if (pendingRefunds.length > 0) {
        pendingActions.push({
            key: 'pending_refund',
            title: 'Pending refund',
            subtitle: `${pendingRefunds[0].currency} ${Number(pendingRefunds[0].amount).toLocaleString()} owed from a resolved dispute`,
            icon: <AlertTriangle className="w-[15px] h-[15px] text-[#e11d48]" />,
            iconBg: 'bg-[#fff1f2]',
            cardBorder: 'border-[#fecdd3]',
            action: () => setCurrentView('withdraw'),
        });
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <SidebarProvider style={{ '--sidebar-width': '228px' } as CSSProperties}>
            <AppSidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                userName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.safetag : ''}
                userEmail={profile?.email}
                userSafetag={profile?.safetag}
                userAvatarUrl={profile?.avatar_url}
            />
            <SidebarInset className="bg-[#f1f5f9] w-full overflow-x-hidden">
                <AppHeader
                    currentView={currentView}
                    unreadNotifCount={unreadNotifCount}
                    onNotifClick={() => router.push(`${pathname}?view=notifications`)}
                    firstName={profile?.first_name}
                    safetag={profile?.safetag}
                    avatarUrl={profile?.avatar_url}
                    searchValue={currentView === 'transactions' ? searchQuery : undefined}
                    onSearchChange={currentView === 'transactions' ? setSearchQuery : undefined}
                />

                <main className="flex flex-1 flex-col md:gap-8 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {currentView === 'dashboard' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Mobile: new overlapping panel design */}
                            <div className="md:hidden">
                                <MobileDashboard
                                    balances={balances}
                                    showBalance={showBalance}
                                    activeWalletIndex={activeWalletIndex}
                                    onCycleWallet={setActiveWalletIndex}
                                    allTransactions={allTransactions}
                                    onWithdraw={() => setCurrentView('withdraw')}
                                    onCreate={() => setCurrentView('marketplace')}
                                    onShowAll={() => setCurrentView('transactions')}
                                    onSelectTxn={handleSelectTxn}
                                    onToggleBalance={() => setShowBalance(v => !v)}
                                    decodedSafetag={decodedSafetag}
                                    trustScore={profile?.trust_score ?? 50}
                                    totalVolume={totalVolume}
                                    volumeSymbol={primarySymbol}
                                    completedCount={completedCount}
                                    referralEarning={referralEarning}
                                    referralSymbol={referralSymbol}
                                    disputeCount={openDisputeCount}
                                    onViewDisputes={() => setCurrentView('disputes')}
                                    pendingActions={pendingActions}
                                />
                            </div>
                            {/* Desktop: card grid layout */}
                            <div className="hidden md:flex flex-col gap-5">
                                <div className="grid grid-cols-[1fr_340px] gap-[18px]">
                                    <BalanceHero
                                        balances={balances}
                                        showBalance={showBalance}
                                        onWithdraw={() => setCurrentView('withdraw')}
                                        onCreate={() => setCurrentView('marketplace')}
                                        onToggleBalance={() => setShowBalance(v => !v)}
                                    />
                                    <div className="flex flex-col gap-[14px]">
                                        <TrustScoreCard trustScore={profile?.trust_score ?? 50} completedTrades={completedCount} />
                                        {pendingRefunds.length > 0 && (
                                            <div className="bg-white rounded-2xl border-l-[3px] border-l-[#f59e0b] border-y border-r border-y-[#e9eaec] border-r-[#e9eaec] p-[18px_20px]">
                                                <div className="flex items-start gap-[11px]">
                                                    <div className="w-8 h-8 rounded-lg bg-[#fffbeb] flex items-center justify-center shrink-0 mt-px">
                                                        <AlertTriangle className="w-[14px] h-[14px] text-[#d97706]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[12.5px] font-bold text-[#92400e] mb-1">Pending refund</p>
                                                        <p className="text-[11.5px] text-[#b45309] leading-[1.55] mb-2.5">Refunds owed from resolved disputes will be processed by our team.</p>
                                                        {pendingRefunds.map((r: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between">
                                                                <span className="text-[11.5px] text-[#78350f] font-medium">{r.currency}</span>
                                                                <span className="font-['Inter_Tight',sans-serif] text-lg font-bold text-[#92400e] tracking-[-.02em]">
                                                                    {CURRENCY_SYMBOLS[r.currency] || ''}{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <QuickStatsGrid
                                    totalVolume={totalVolume}
                                    volumeSymbol={primarySymbol}
                                    completedCount={completedCount}
                                    totalCount={totalTxnCount}
                                    disputeCount={openDisputeCount}
                                    referralEarning={referralEarning}
                                    referralSymbol={referralSymbol}
                                />

                                <div className="grid grid-cols-[1fr_360px] gap-[18px]">
                                    <LatestTransactions
                                        transactions={allTransactions}
                                        onShowAll={() => setCurrentView('transactions')}
                                        onSelectTxn={handleSelectTxn}
                                        decodedSafetag={decodedSafetag}
                                    />
                                    <PortfolioSection
                                        balances={balances}
                                        allTransactions={allTransactions}
                                    />
                                </div>
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
                                totalCount={allTransactions.length}
                                completedCount={completedCount}
                                ongoingCount={ongoingTxnCount}
                                disputedCount={disputedTxnCount}
                                totalVolume={totalVolume}
                                volumeSymbol={primarySymbol}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
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
                                profile={profile}
                                onUnreadCountChange={setUnreadNotifCount}
                                onProfileUpdate={loadData}
                            />
                        </div>
                    ) : currentView === 'profile' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-7 pb-24 md:pb-7">
                            <ProfileView
                                profile={profile}
                                safetag={decodedSafetag}
                                onUpdated={loadData}
                            />
                        </div>
                    ) : currentView === 'disputes' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                            <DisputesListView
                                safetag={decodedSafetag}
                                onSelectDispute={(d) => { setSelectedDispute(d); setCurrentView('dispute_chat'); }}
                            />
                        </div>
                    ) : currentView === 'dispute_chat' && selectedDispute ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                            <DisputeChatPage
                                dispute={selectedDispute}
                                safetag={decodedSafetag}
                                onBack={() => { setSelectedDispute(null); setCurrentView('disputes'); }}
                            />
                        </div>
                    ) : currentView === 'dispute_details' && selectedDispute ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                            <DisputeChatPage
                                dispute={selectedDispute}
                                safetag={decodedSafetag}
                                onBack={() => {
                                    setSelectedDispute(null);
                                    setSelectedTxn(null);
                                    setCurrentView('transactions');
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

            {currentView !== 'dispute_details' && currentView !== 'dispute_chat' && (
                <TransactionDetailPanel
                    selectedTxn={selectedTxn}
                    setSelectedTxn={handleSelectTxn}
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
                    posthog.capture('withdrawal_submitted_web', { amount: data.amount, currency: data.currency });
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
            <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} />

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
