'use client';

import { DollarSign, Bitcoin, Euro, ArrowRightLeft, Activity, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const CURRENCY_ICONS: Record<string, React.ReactNode> = {
    USD: <img src="/assets/images/usd-flag.png" alt="USD" className="w-full h-full object-cover rounded-full" />,
    NGN: <img src="/assets/images/ngn-flag.png" alt="NGN" className="w-full h-full object-cover rounded-full" />,
    BTC: <Bitcoin className="w-5 h-5 text-white" />,
    USDT: <img src="/assets/images/usdt-logo.png" alt="USDT" className="w-full h-full object-contain" />,
};

const CURRENCY_COLORS: Record<string, string> = {
    USD: 'bg-transparent overflow-hidden',
    NGN: 'bg-transparent overflow-hidden border border-slate-100',
    BTC: 'bg-orange-500',
    USDT: 'bg-transparent',
};

const CURRENCY_NAMES: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    BTC: 'Bitcoin',
    USDT: 'Tether (USDT)',
    NGN: 'Nigerian Naira'
};

export const AccountsSection = ({ balances, showBalance = true }: { balances: any[], showBalance?: boolean }) => (
    <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Your Accounts</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {balances.map((b: any, i: number) => (
                <Card key={i} className="min-w-[260px] bg-gradient-to-br from-[#1a1c1e] to-[#0a0a0b] border-none rounded-[24px] shadow-2xl snap-start relative overflow-hidden group p-1">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-semibold text-white/40 uppercase tracking-widest text-[10px]">{CURRENCY_NAMES[b.currency] || b.currency}</CardDescription>
                        <CardTitle className="text-2xl font-black tracking-tight text-white border-none shadow-none mt-1">
                            {showBalance ? (
                                <>
                                    <span className="text-white/40 text-lg mr-1">{b.currency === 'USD' ? '$' : b.currency === 'EUR' ? '€' : b.currency === 'NGN' ? '₦' : ''}</span>
                                    {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </>
                            ) : (
                                <span className="tracking-widest">••••••</span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 flex justify-between items-end">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                                <Activity className="w-4 h-4 text-white/40" />
                            </div>
                        </div>
                        <div className={`w-14 h-14 rounded-[22px] ${CURRENCY_COLORS[b.currency] || 'bg-slate-800'} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 rotate-6`}>
                            <div className="w-8 h-8 flex items-center justify-center">
                                {CURRENCY_ICONS[b.currency] || <DollarSign className="w-6 h-6 text-white" />}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <Card className="min-w-[180px] bg-white border-2 border-dashed border-slate-100 rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all snap-start">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="text-2xl font-light">+</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Card</span>
            </Card>
        </div>
    </section>
);

interface ExchangeWidgetProps {
    balances: any[];
    fromCurrency: string;
    setFromCurrency: (val: string) => void;
    toCurrency: string;
    setToCurrency: (val: string) => void;
    exchangeAmount: string;
    setExchangeAmount: (val: string) => void;
    handleExchange: () => void;
}

export const ExchangeWidget = ({
    balances,
    fromCurrency, setFromCurrency,
    toCurrency, setToCurrency,
    exchangeAmount, setExchangeAmount,
    handleExchange
}: ExchangeWidgetProps) => (
    <Card className="border-slate-200 rounded-2xl shadow-sm h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-lg font-bold text-slate-800 border-none shadow-none">Exchange Money</CardTitle>
            <div className="p-2 bg-slate-50 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-slate-400" /></div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-400">From</label>
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                            <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200 focus:ring-primary"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                {balances.map((b: any) => (
                                    <SelectItem key={b.currency} value={b.currency}>{CURRENCY_NAMES[b.currency] || b.currency}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-400">To</label>
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                            <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200 focus:ring-primary"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">US Dollar</SelectItem>
                                <SelectItem value="EUR">Euro</SelectItem>
                                <SelectItem value="BTC">Bitcoin</SelectItem>
                                <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                <SelectItem value="NGN">Nigerian Naira</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="relative mt-2">
                    <Input type="number" placeholder="Amount" value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)} className="h-14 bg-slate-50 border-slate-200 pr-16 text-lg font-medium focus-visible:ring-primary" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{fromCurrency}</div>
                </div>
                {fromCurrency && toCurrency && (
                    <p className="text-xs text-primary font-bold flex items-center justify-center gap-1 my-1 opacity-80">
                        <Activity className="w-3 h-3" /> Exchange rate: 1 {fromCurrency} = ~1.2 {toCurrency}
                    </p>
                )}
                <Button onClick={handleExchange} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl mt-2 shadow-sm hover:shadow-md active:scale-[0.98]">
                    Continue Exchange
                </Button>
            </div>
        </CardContent>
    </Card>
);

export const WithdrawBanner = ({ onWithdraw }: { onWithdraw?: () => void }) => (
    <section className="bg-gradient-to-br from-[#0a2d1d] to-[#05140b] border border-[#0a2d1d] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">Ready to withdraw?</h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">Secure escrow wallet. Withdraw to bank or crypto instantly.</p>
            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer backdrop-blur-md transition-all border border-white/5 group/item">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform group-hover/item:scale-110"><Wallet className="w-5 h-5 text-emerald-400" /></div>
                    <div className="flex flex-col"><span className="font-semibold text-sm">Crypto Wallet</span><span className="text-xs text-white/40">BTC, USDT, ETH</span></div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer backdrop-blur-md transition-all border border-white/5 group/item">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform group-hover/item:scale-110"><Euro className="w-5 h-5 text-blue-400" /></div>
                    <div className="flex flex-col"><span className="font-semibold text-sm">Bank Wire Transfer</span><span className="text-xs text-white/40">SEPA, SWIFT</span></div>
                </div>
            </div>
            <Button
                onClick={onWithdraw}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
            >
                Withdraw Now
            </Button>
        </div>
    </section>
);

export const TrustScore = ({ score = 92.8, totalTrades = 4250.00 }: { score?: number; totalTrades?: number }) => {
    // We map 0-100 score to 300-900 credit-score scale
    const boundedScore = Math.max(0, Math.min(100, score));
    const displayScore = Math.round(300 + (boundedScore / 100) * 600);

    const numTicks = 41;
    const ticks = Array.from({ length: numTicks }).map((_, i) => {
        const percent = (i / (numTicks - 1)) * 100;
        let color = '#22c55e'; // Green
        if (percent <= 25) color = '#ef4444'; // Red
        else if (percent <= 50) color = '#f97316'; // Orange
        else if (percent <= 75) color = '#3b82f6'; // Blue

        const angle = Math.PI - (i / (numTicks - 1)) * Math.PI;

        const innerRadius = 75;
        const outerRadius = 90; // All needles the same height

        const x1 = +(100 + innerRadius * Math.cos(angle)).toFixed(4);
        const y1 = +(100 - innerRadius * Math.sin(angle)).toFixed(4);
        const x2 = +(100 + outerRadius * Math.cos(angle)).toFixed(4);
        const y2 = +(100 - outerRadius * Math.sin(angle)).toFixed(4);

        return { x1, y1, x2, y2, color };
    });

    const scoreAngle = Math.PI - (boundedScore / 100) * Math.PI;
    const needleOuterR = 110;
    const needleInnerR = 55;

    const needleX1 = +(100 + needleInnerR * Math.cos(scoreAngle)).toFixed(4);
    const needleY1 = +(100 - needleInnerR * Math.sin(scoreAngle)).toFixed(4);
    const needleX2 = +(100 + needleOuterR * Math.cos(scoreAngle)).toFixed(4);
    const needleY2 = +(100 - needleOuterR * Math.sin(scoreAngle)).toFixed(4);

    let badgeText = "Excellent";
    let badgeColor = "text-[#22c55e] bg-[#ecfdf5]";
    if (displayScore < 500) {
        badgeText = "Poor";
        badgeColor = "text-[#ef4444] bg-[#fef2f2]";
    } else if (displayScore < 650) {
        badgeText = "Fair";
        badgeColor = "text-[#f97316] bg-[#fff7ed]";
    } else if (displayScore < 750) {
        badgeText = "Good";
        badgeColor = "text-[#3b82f6] bg-[#eff6ff]";
    }

    return (
        <Card className="border-slate-100 rounded-[32px] shadow-sm h-full overflow-hidden flex flex-col bg-white">
            <CardHeader className="flex flex-row items-baseline justify-between pb-0 pt-6 px-6 relative z-10 w-full">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[#00a6e0] mb-[2px]">
                        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></svg>
                        <span className="font-bold text-[10px] tracking-wide">Safeeely</span>
                    </div>
                    <div className="flex items-center gap-1.5 -ml-1">
                        <div className="relative w-5 h-5 flex items-center justify-center transform scale-[0.8]">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute left-0 bottom-0.5 z-10" />
                            <div className="w-3.5 h-3.5 rounded-full border-[2px] border-slate-900 absolute right-0 top-0" />
                            <div className="w-[6px] h-[2px] bg-slate-900 absolute transform rotate-[45deg]" />
                        </div>
                        <CardTitle className="text-[20px] font-extrabold text-[#111827] border-none shadow-none tracking-tight">
                            Trust score
                        </CardTitle>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-xl px-2.5 py-1 cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="text-[12px] font-bold text-slate-700">Safeeely</span>
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center pt-2 pb-6 px-6">
                <div className="relative w-full max-w-[280px] aspect-[1.8/1] mx-auto mt-4">
                    <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                        {/* Inner Dotted Arc */}
                        <path
                            d="M 40 100 A 60 60 0 0 1 160 100"
                            fill="none"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            strokeDasharray="4 6"
                        />

                        {/* Ticks */}
                        {ticks.map((tick, i) => (
                            <line
                                key={i}
                                x1={tick.x1}
                                y1={tick.y1}
                                x2={tick.x2}
                                y2={tick.y2}
                                stroke={tick.color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        ))}

                        {/* Arc Labels */}
                        <text x="35" y="118" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">300</text>
                        <text x="100" y="32" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">600</text>
                        <text x="165" y="118" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">900</text>

                        {/* Needle / Indicator */}
                        <line
                            x1={needleX1}
                            y1={needleY1}
                            x2={needleX2}
                            y2={needleY2}
                            stroke="#111827"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Needle Circle */}
                        <circle
                            cx={needleX2}
                            cy={needleY2}
                            r="5.5"
                            fill="white"
                            stroke="#111827"
                            strokeWidth="3.5"
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Needle Text "your score" */}
                        <text
                            x={needleX2}
                            y={needleY2 - 12}
                            fontSize="9"
                            fill="#94a3b8"
                            textAnchor="middle"
                            fontWeight="600"
                            className="transition-all duration-1000 ease-out"
                        >
                            your score
                        </text>

                    </svg>

                    {/* Center Score Text */}
                    <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[54px] font-black text-[#111827] leading-[1] tracking-[-0.04em]">
                            {displayScore}
                        </span>
                        <div className={`mt-1.5 ${badgeColor} px-4 py-1 rounded-[12px] font-bold text-[13px] tracking-wide shadow-sm border border-black/5`}>
                            {badgeText}
                        </div>
                    </div>
                </div>

                {/* Footer equivalent of "Next update in 31 days" */}
                <div className="mt-8 flex items-center justify-center gap-1.5 text-slate-400 font-medium text-[11px] mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Updated real-time by reviews</span>
                </div>

                {/* Simulated Cibil Black Button Cut */}
                <div className="mt-2 bg-[#111827] text-white px-5 py-3 rounded-xl font-bold text-[13px] shadow-sm w-[90%] text-center">
                    Total Volume: <span className="text-emerald-400 ml-1">${totalTrades?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
            </CardContent>
        </Card>
    );
};
