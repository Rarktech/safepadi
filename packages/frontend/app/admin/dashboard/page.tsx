"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight, 
    Bell,
    Search,
    Filter,
    Download,
    MoreHorizontal,
    Globe,
    MessageCircle,
    Zap,
    Users as UsersIcon,
    DollarSign,
    ShoppingCart,
    Coins,
    ChevronDown,
    Activity,
    ShieldAlert
} from "lucide-react";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const CURRENCY_CONFIG: Record<string, { symbol: string, color: string, bg: string, img?: string }> = {
    "USDT": { symbol: "$", color: "text-emerald-500", bg: "bg-emerald-50", img: "/assets/images/usdt-logo.png" },
    "NGN": { symbol: "₦", color: "text-blue-500", bg: "bg-blue-50" },
    "USD": { symbol: "$", color: "text-blue-600", bg: "bg-blue-50" },
    "GBP": { symbol: "£", color: "text-purple-500", bg: "bg-purple-50" }
};

const chartConfig = {
    value: {
        label: "Volume",
        color: "#10b981",
    },
} satisfies ChartConfig;

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [volCurrency, setVolCurrency] = useState("USDT");
    const [profitCurrency, setProfitCurrency] = useState("USDT");
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_URL}/admin/stats`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                setStats(res.data);
                
                // Set default currencies if available in data
                const availableVol = Object.keys(res.data.volume_by_currency);
                if (availableVol.length > 0) setVolCurrency(availableVol[0]);
                
                const availableProfit = Object.keys(res.data.profit_by_currency);
                if (availableProfit.length > 0) setProfitCurrency(availableProfit[0]);
                
            } catch (err) {
                console.error("Failed to fetch admin stats:", err);
            } finally {
                setLoading(false);
            }
        };

        const setupRealtime = () => {
            console.log('🔌 Initializing Real-time Handlers...');
            
            // 1. Transactions & Payments Listener
            const txnChannel = supabase.channel('admin-tx-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
                    const newTx = payload.new;
                    addNotification({
                        id: `tx-init-${newTx.id}-${Date.now()}`,
                        type: 'transaction',
                        title: 'Transaction Initiated',
                        message: `Order #${newTx.txn_code} created by ${newTx.currency}${newTx.total_amount}. Awaiting payment.`,
                        time: new Date(),
                        icon: ShoppingCart,
                        color: 'text-blue-500',
                        bg: 'bg-blue-50'
                    });
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, payload => {
                    const newTx = payload.new;
                    // Trigger specifically when status changes to PAID
                    if (newTx.status === 'PAID') {
                        addNotification({
                            id: `tx-paid-${newTx.id}-${Date.now()}`,
                            type: 'payment',
                            title: 'Payment Received!',
                            message: `Order #${newTx.txn_code} has been FUNDED. Escrow is now active.`,
                            time: new Date(),
                            icon: Activity,
                            color: 'text-emerald-500',
                            bg: 'bg-emerald-100/50'
                        });
                    } else if (newTx.status === 'DISPUTED') {
                        addNotification({
                            id: `tx-disp-${newTx.id}-${Date.now()}`,
                            type: 'dispute',
                            title: '⚠️ Dispute Incident',
                            message: `Order #${newTx.txn_code} has entered DISPUTE mode. Review required.`,
                            time: new Date(),
                            icon: ShieldAlert,
                            color: 'text-rose-600',
                            bg: 'bg-rose-100/50'
                        });
                    }
                })
                .subscribe();

            // 2. Disputes Listener
            const disputeChannel = supabase.channel('admin-disputes-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'disputes' }, payload => {
                    const newDispute = payload.new;
                    addNotification({
                        id: `ds-${newDispute.id}-${Date.now()}`,
                        type: 'dispute',
                        title: '⚠️ Dispute Raised',
                        message: `A dispute was just opened. Reason: ${newDispute.reason.substring(0, 40)}...`,
                        time: new Date(),
                        icon: Zap,
                        color: 'text-rose-500',
                        bg: 'bg-rose-50'
                    });
                }).subscribe();

            // 3. Withdrawals (Payouts) Listener
            const withdrawalChannel = supabase.channel('admin-payouts-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawals' }, payload => {
                    const newWd = payload.new;
                    addNotification({
                        id: `wd-${newWd.id}-${Date.now()}`,
                        type: 'payout',
                        title: 'Payout Requested',
                        message: `Withdrawal of ${newWd.currency}${newWd.amount} in progress (Ref: ${newWd.reference})`,
                        time: new Date(),
                        icon: DollarSign,
                        color: 'text-amber-500',
                        bg: 'bg-amber-50'
                    });
                }).subscribe();

            // Confirm Connection
            toast.success("Intelligence Feed Connected", {
                description: "Listening for real-time ecosystem events",
                duration: 3000
            });

            return () => {
                supabase.removeChannel(txnChannel);
                supabase.removeChannel(disputeChannel);
                supabase.removeChannel(withdrawalChannel);
            };
        };

        const addNotification = (notif: any) => {
            setNotifications(prev => [notif, ...prev]);
            toast.custom((t) => (
                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xl flex items-start gap-3 min-w-[300px] animate-in slide-in-from-top duration-300">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", notif.bg, notif.color)}>
                        <notif.icon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-900">{notif.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{notif.message}</p>
                    </div>
                </div>
            ));
        };

        fetchStats();
        const cleanup = setupRealtime();
        return () => {
            cleanup();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 border-8 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        <p className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">Initializing Admin Shell</p>
                    </div>
                </div>
            </div>
        );
    }

    const availableVolCurrencies = Object.keys(stats?.volume_by_currency || {});
    const availableProfitCurrencies = Object.keys(stats?.profit_by_currency || {});

    return (
        <div className="flex flex-col lg:flex-row bg-slate-50 min-h-screen">
            <AdminSidebar />
            
            <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full max-w-[100vw]">
                {/* Top Navigation */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safeeely Ecosystem</span>
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Dashboard</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-[#020617] tracking-tight">System Intelligence</h1>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none hidden xl:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search all systems..." 
                                className="h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold w-[280px] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 ml-auto">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-all shadow-sm relative group">
                                        <Bell className="w-5 h-5" />
                                        {notifications.length > 0 && (
                                            <div className="absolute top-2.5 right-2.5 flex items-center justify-center">
                                                <Badge className="h-4 min-w-4 p-0 px-1 text-[8px] bg-rose-500 hover:bg-rose-600 border-2 border-white ring-0 font-bold flex items-center justify-center rounded-full">
                                                    {notifications.length}
                                                </Badge>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl scale-0 group-hover:scale-100 transition-transform" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 md:w-96 p-0 bg-white border-slate-100 rounded-[32px] shadow-2xl overflow-hidden mt-4" align="end">
                                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Ecosystem Alerts</h3>
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={() => setNotifications([])}
                                                className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
                                            >
                                                Flush All
                                            </button>
                                        )}
                                    </div>
                                    <ScrollArea className="h-[400px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full p-12 text-center opacity-50">
                                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                                                    <Bell className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All protocols nominal</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {notifications.map((n) => (
                                                    <div key={n.id} className="p-6 hover:bg-slate-50/50 transition-all cursor-pointer group">
                                                        <div className="flex items-start gap-4">
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", n.bg, n.color)}>
                                                                <n.icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{n.title}</p>
                                                                    <span className="text-[9px] font-bold text-slate-400">
                                                                        {formatDistanceToNow(n.time, { addSuffix: true })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed truncate">
                                                                    {n.message}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                    <div className="p-4 bg-slate-50/50 border-t border-slate-50">
                                        <Button className="w-full bg-white text-slate-900 hover:bg-white border border-slate-200 rounded-2xl h-11 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                                            Open Intelligence Center
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=d1d5db" className="w-full h-full object-cover" alt="Admin" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Header Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                    <CurrencyStatCard 
                        title="Total Volume" 
                        value={stats?.volume_by_currency?.[volCurrency] || 0}
                        currency={volCurrency}
                        availableCurrencies={availableVolCurrencies}
                        onCurrencyChange={setVolCurrency}
                        trend="+12.4%" 
                        isUp={true}
                    />
                    <CurrencyStatCard 
                        title="Safeeely Profit" 
                        value={stats?.profit_by_currency?.[profitCurrency] || 0}
                        currency={profitCurrency}
                        availableCurrencies={availableProfitCurrencies}
                        onCurrencyChange={setProfitCurrency}
                        trend="+8.2%" 
                        isUp={true}
                    />
                    <HeroStatCard 
                        title="New Customers" 
                        value={stats?.new_customers_today || 0}
                        trend="+15.1%" 
                        icon={UsersIcon}
                        color="text-purple-600"
                        bg="bg-purple-50"
                    />
                    <HeroStatCard 
                        title="Total Orders" 
                        value={stats?.total_transactions || 0}
                        trend="+4.3%" 
                        icon={ShoppingCart}
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
                    {/* Growth Chart Container */}
                    <Card className="lg:col-span-2 rounded-[32px] md:rounded-[40px] border-slate-100 shadow-sm relative overflow-hidden group">
                        <CardHeader className="p-6 md:p-10 pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-black text-[#020617] tracking-tight mb-1">Revenue Trajectory</CardTitle>
                                <CardDescription className="text-xs font-bold text-slate-400">Monthly breakdown of transacted volume across all channels.</CardDescription>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-slate-900 shadow-sm flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Volume
                                </button>
                                <button className="px-5 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 transition-all">Growth</button>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="px-6 md:px-10 pb-6 md:pb-10 pt-4">
                            <ChartContainer config={chartConfig} className="h-[300px] md:h-[360px] w-full">
                                <AreaChart
                                    accessibilityLayer
                                    data={stats?.chart_data || []}
                                    margin={{
                                        left: 0,
                                        right: 0,
                                        top: 10,
                                        bottom: 0
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="6 6" stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false} 
                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '800'}}
                                        dy={15}
                                        tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" hideLabel />}
                                    />
                                    <Area
                                        dataKey="value"
                                        type="linear"
                                        fill="url(#chartGradient)"
                                        fillOpacity={1}
                                        stroke="var(--color-value)"
                                        strokeWidth={5}
                                        activeDot={{ r: 8, stroke: 'white', strokeWidth: 4, fill: 'var(--color-value)' }}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                        <CardFooter className="px-6 md:px-10 pb-6 md:pb-10 pt-0">
                            <div className="flex w-full items-start gap-2 text-sm">
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2 leading-none font-bold text-emerald-600 text-xs tracking-tight">
                                        Trending up by 15.2% this month <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-2 leading-none text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                        Ecosystem performance log
                                    </div>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>

                    {/* Regional / Market Intelligence */}
                    <div className="bg-[#1e293b] rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-emerald-400" /> Market Reach
                                </h3>
                                <button className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors">Details</button>
                            </div>
                            
                            <div className="mb-8 md:mb-12">
                                <div className="flex items-end gap-2 mb-2">
                                    <p className="text-3xl md:text-4xl font-black">{(stats?.total_customers || 0).toLocaleString()}</p>
                                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 mb-2">
                                        <TrendingUp className="w-3" /> 24%
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Active ecosystem nodes</p>
                            </div>

                            <div className="space-y-6 md:space-y-8 flex-1">
                                {Object.keys(stats?.platform_stats || {}).length > 0 ? (
                                    Object.entries(stats?.platform_stats || {}).map(([platform, count]: any) => (
                                        <ChannelBar 
                                            key={platform}
                                            platform={platform}
                                            count={count}
                                            total={stats?.total_customers || 1}
                                        />
                                    ))
                                ) : (
                                    <>
                                        <LocationBar name="Nigeria" count={18432} total={42000} flag="🇳🇬" />
                                        <LocationBar name="United States" count={12628} total={42000} flag="🇺🇸" />
                                        <LocationBar name="United Kingdom" count={6628} total={42000} flag="🇬🇧" />
                                    </>
                                )}
                            </div>
                            
                            <Button className="w-full mt-10 h-14 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black rounded-[24px] shadow-xl shadow-emerald-900/40">
                                Expand Network
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Ledger / Recent Activity */}
                <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden mb-12">
                    <div className="p-6 md:p-10 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Recent Trade Ledger</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1">Audit log of the latest ecosystem transactions.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button variant="outline" className="h-12 px-4 md:px-6 rounded-2xl border-slate-100 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-50 flex-1 sm:flex-none">
                                <Filter className="w-4 h-4" /> Filter
                            </Button>
                            <Button className="h-12 px-4 md:px-6 rounded-2xl bg-[#020617] text-white font-bold flex items-center gap-2 hover:bg-slate-800 flex-1 sm:flex-none">
                                <Download className="w-4 h-4" /> Export
                            </Button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction ID</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Escrow Parties</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Valuation</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Flow Status</th>
                                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats?.recent_transactions?.map((tx: any) => (
                                    <tr 
                                        key={tx.id} 
                                        onClick={() => router.push(`/admin/transactions/${tx.id}`)}
                                        className="hover:bg-slate-50/70 transition-all duration-300 cursor-pointer group"
                                    >
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                                <code className="text-xs font-black text-[#020617]">{tx.txn_code}</code>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                                                    {tx.buyer?.safetag?.[1]?.toUpperCase() || 'B'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900">{tx.buyer?.safetag}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">Seller: {tx.seller?.safetag}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-[#020617]">{tx.currency} {tx.total_amount.toLocaleString()}</span>
                                                <span className="text-[9px] font-bold text-emerald-500">Fee: {tx.fee_amount}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={cn(
                                                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border",
                                                getStatusStyle(tx.status)
                                            )}>
                                                {tx.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button className="w-10 h-10 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all ml-auto">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

function HeroStatCard({ title, value, trend, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer ring-1 ring-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500", bg, color)}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600">{trend}</span>
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
            <h4 className="text-2xl md:text-3xl font-black text-[#020617] tracking-tighter">{value.toLocaleString()}</h4>
        </div>
    );
}

function CurrencyStatCard({ title, value, currency, availableCurrencies, onCurrencyChange, trend, isUp }: any) {
    const config = CURRENCY_CONFIG[currency] || { symbol: currency, color: "text-slate-600", bg: "bg-slate-50" };

    return (
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer ring-1 ring-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm", config.bg, config.color)}>
                    {config.img ? (
                        <img src={config.img} alt={currency} className="w-7 h-7 object-contain" />
                    ) : (
                        <Coins className="w-6 h-6 md:w-7 md:h-7" />
                    )}
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl">
                            {currency} <ChevronDown className="w-3 h-3" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-32">
                        {availableCurrencies.map((c: string) => (
                            <DropdownMenuItem 
                                key={c} 
                                onClick={() => onCurrencyChange(c)}
                                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer mb-1 last:mb-0"
                            >
                                {c}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
            <h4 className="text-2xl md:text-3xl font-black text-[#020617] tracking-tighter flex items-center gap-1">
                <span className="text-slate-300 font-medium">{config.symbol}</span>
                {Math.round(value).toLocaleString()}
            </h4>

            <div className="mt-4 flex items-center gap-1">
                <span className={cn(
                    "text-[10px] font-black flex items-center gap-0.5",
                    isUp ? "text-emerald-500" : "text-rose-500"
                )}>
                    {isUp ? <TrendingUp className="w-3" /> : <TrendingUp className="w-3 rotate-180" />}
                    {trend}
                </span>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">Growth</span>
            </div>
        </div>
    );
}

function ChannelBar({ platform, count, total }: any) {
    const percentage = Math.round((count / total) * 100);
    const platformConfig: any = {
        telegram: { color: "bg-[#229ED9]", icon: MessageCircle },
        discord: { color: "bg-[#5865F2]", icon: Activity },
        whatsapp: { color: "bg-[#25D366]", icon: MessageCircle },
    };
    const cfg = platformConfig[platform.toLowerCase()] || { color: "bg-emerald-400", icon: MessageCircle };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", cfg.color + "/20")}>
                        <cfg.icon className={cn("w-3.5 h-3.5", cfg.color.replace('bg-', 'text-'))} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/70 capitalize">{platform}</span>
                </div>
                <span className="text-sm font-black text-white">{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                    className={cn("h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]", cfg.color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function LocationBar({ flag, name, count, total }: any) {
    const percentage = Math.round((count / total) * 100);
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg">{flag}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-white/70">{name}</span>
                </div>
                <span className="text-sm font-black text-white">{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_#10b981]"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function getStatusStyle(status: string) {
    switch (status) {
        case 'FINALIZED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-100';
        case 'PENDING_PAYMENT': return 'bg-amber-50 text-amber-700 border-amber-100';
        case 'DISPUTED': return 'bg-purple-50 text-purple-700 border-purple-100';
        default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
}
