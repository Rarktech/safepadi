'use client';

import React, { useState } from 'react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from 'sonner';
import api from '@/lib/api';
import {
    ShieldCheck, ArrowRight, X, User, CreditCard, Plus, Clock, Bitcoin, DollarSign,
    CheckCircle2, Search
} from 'lucide-react';

import { NIGERIAN_BANKS, CRYPTO_ASSETS, INTERNATIONAL_BANKS } from '@/lib/constants/payout-data';

const CURRENCY_ICONS: Record<string, React.ReactNode> = {
    USD: <img src="/assets/images/usd-flag.png" alt="USD" className="w-full h-full object-cover rounded-full" />,
    NGN: <img src="/assets/images/ngn-flag.png" alt="NGN" className="w-full h-full object-cover rounded-full" />,
    BTC: <div className="w-full h-full bg-[#f7931a] rounded-lg flex items-center justify-center"><Bitcoin size={20} className="text-white" /></div>,
    USDT: <img src="/assets/images/usdt-logo.png" alt="USDT" className="w-full h-full object-contain" />,
};

export const SheetWithdrawal = ({
    isOpen,
    onClose,
    balances,
    safetag,
    onSuccess,
    preselectedCurrency = 'USD'
}: {
    isOpen: boolean,
    onClose: () => void,
    balances: any[],
    safetag: string,
    onSuccess: (data: any) => void,
    preselectedCurrency?: string
}) => {
    const [step, setStep] = useState(1);
    const [selectedCurrency, setSelectedCurrency] = useState(preselectedCurrency);
    const [amount, setAmount] = useState('');
    const [withdrawalType, setWithdrawalType] = useState<'bank' | 'crypto'>('bank');

    // Added payout selection state
    const [selectedMethod, setSelectedMethod] = useState<any>(null);
    const [saveForFuture, setSaveForFuture] = useState(true);

    // Bank state
    const [showBankPicker, setShowBankPicker] = useState(false);
    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    // Crypto state
    const [showCryptoPicker, setShowCryptoPicker] = useState(false);
    const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
    const [cryptoChain, setCryptoChain] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [pickerSearch, setPickerSearch] = useState('');

    const [loading, setLoading] = useState(false);
    const [savedMethods, setSavedMethods] = useState<any[]>([]);
    const [isRefreshingMethods, setIsRefreshingMethods] = useState(false);

    const formatWithCommas = (value: string) => {
        const num = value.replace(/,/g, '');
        if (!num || isNaN(Number(num))) return '';
        return new Intl.NumberFormat().format(Number(num));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '');
        if (val === '' || !isNaN(Number(val))) {
            setAmount(formatWithCommas(val));
        }
    };

    const handleWithdraw = async () => {
        setLoading(true);
        try {
            const rawAmount = Number(amount.replace(/,/g, ''));
            const methodDetails = selectedMethod ? selectedMethod.details : (
                withdrawalType === 'bank'
                    ? { bank_id: selectedBank.code, bank_name: selectedBank.name, account_number: accountNumber, account_name: accountName, logo: selectedBank.logo }
                    : { asset: selectedCrypto.name, symbol: selectedCrypto.symbol, chain: cryptoChain, address: walletAddress, logo: selectedCrypto.logo }
            );

            // 1. Save method if new and checkbox checked
            if (!selectedMethod && saveForFuture) {
                await api.post(`/profiles/${safetag}/payout-methods`, {
                    type: withdrawalType,
                    details: methodDetails
                });
            }

            // 2. Create withdrawal record
            await api.post(`/withdrawals/${safetag}`, {
                amount: rawAmount,
                currency: selectedCurrency,
                payout_method_id: selectedMethod?.id || null,
                details: methodDetails
            });

            toast.success('Withdrawal request submitted successfully!');
            onSuccess({ amount: rawAmount, currency: selectedCurrency, type: withdrawalType });
            reset(); // This will also call onClose() via reset logic if adjusted
        } catch (error: any) {
            console.error('❌ Withdrawal failed:', error);
            toast.error(error.response?.data?.error || 'Failed to process withdrawal');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setAmount('');
        setSelectedMethod(null);
        setSelectedBank(null);
        setAccountNumber('');
        setAccountName('');
        setSelectedCrypto(null);
        setCryptoChain('');
        setWalletAddress('');
        onClose();
    };

    const fetchSavedMethods = async () => {
        try {
            setIsRefreshingMethods(true);
            const res = await api.get(`/profiles/${safetag}/payout-methods`);
            setSavedMethods(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('❌ Failed to fetch payout methods:', error);
        } finally {
            setIsRefreshingMethods(false);
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            fetchSavedMethods();
            setSelectedCurrency(preselectedCurrency);
            setWithdrawalType(['BTC', 'ETH', 'USDT'].includes(preselectedCurrency) ? 'crypto' : 'bank');
        }
    }, [isOpen, preselectedCurrency]);

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && reset()}>
            <SheetContent className="sm:max-w-md w-full border-none p-0 bg-white overflow-y-auto">
                <SheetHeader className="sr-only">
                    <SheetTitle>Withdrawal Portal</SheetTitle>
                    <SheetDescription>Securely withdraw your funds to a bank account or crypto wallet.</SheetDescription>
                </SheetHeader>
                {step < 4 ? (
                    <div className="flex flex-col h-full bg-slate-50/30">
                        <div className="p-8 pt-10 flex-1">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Withdraw Funds</h2>
                                    <p className="text-sm font-medium text-slate-400">Securely transfer your earnings.</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                    <ShieldCheck size={28} />
                                </div>
                            </div>

                            {/* Step Indicator */}
                            <div className="flex items-center gap-2 mb-10">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-[#10b981]' : 'bg-slate-200'}`} />
                                ))}
                            </div>

                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select currency</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {balances.map((b) => (
                                                <button
                                                    key={b.currency}
                                                    onClick={() => {
                                                        setSelectedCurrency(b.currency);
                                                        setWithdrawalType(['USDT', 'BTC', 'ETH'].includes(b.currency) ? 'crypto' : 'bank');
                                                    }}
                                                    className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-4 text-left ${selectedCurrency === b.currency ? 'border-[#10b981] bg-emerald-50/50 shadow-lg shadow-emerald-500/5' : 'border-white bg-white hover:border-slate-100 shadow-sm'}`}
                                                >
                                                    <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center p-2 ${selectedCurrency === b.currency ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                                                        {CURRENCY_ICONS[b.currency] || <DollarSign size={20} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{b.currency} balance</span>
                                                        <span className="text-base font-black text-slate-900 leading-none">{b.amount.toLocaleString()}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 tracking-wider">Amount to withdraw</Label>
                                        <div className="relative">
                                            <Input
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                className="h-16 bg-white border-none rounded-[24px] px-6 text-2xl font-black focus:ring-2 focus:ring-[#10b981] transition-all shadow-sm"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <button
                                                    onClick={() => {
                                                        const bal = balances.find(b => b.currency === selectedCurrency)?.amount || 0;
                                                        setAmount(formatWithCommas(bal.toString()));
                                                    }}
                                                    className="px-4 py-2 bg-[#10b981] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                                                >
                                                    MAX
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => setStep(2)}
                                        disabled={!amount || Number(amount.replace(/,/g, '')) <= 0}
                                        className="w-full h-16 bg-[#10b981] hover:bg-[#059669] text-white rounded-[24px] text-lg font-black shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2"
                                    >
                                        Continue
                                        <ArrowRight size={20} />
                                    </Button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-6">
                                        <Label className="text-xs font-bold text-slate-400 tracking-wider">Payment method</Label>

                                        <div className="space-y-3">
                                            {savedMethods.filter(m => m.type === withdrawalType).map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => {
                                                        setSelectedMethod(m);
                                                        setWithdrawalType(m.type);
                                                    }}
                                                    className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between text-left ${selectedMethod?.id === m.id ? 'border-[#10b981] bg-emerald-50/30' : 'border-white bg-white hover:border-slate-100 shadow-sm'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-2">
                                                            <img src={m.details.logo} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-900 leading-tight">{m.details.account_name || m.details.symbol}</span>
                                                            <span className="text-xs text-slate-400 font-bold">
                                                                {m.type === 'bank' ? `${m.details.bank_name} • ${m.details.account_number.slice(0, 4)}****${m.details.account_number.slice(-4)}` : `${m.details.symbol} • ${m.details.address.slice(0, 6)}...`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMethod?.id === m.id ? 'border-[#10b981] bg-[#10b981]' : 'border-slate-200'}`}>
                                                        {selectedMethod?.id === m.id && <CheckCircle2 size={16} className="text-white" />}
                                                    </div>
                                                </button>
                                            ))}

                                            <button
                                                onClick={() => {
                                                    setSelectedMethod(null);
                                                    if (withdrawalType === 'bank') {
                                                        setShowBankPicker(true);
                                                    } else {
                                                        setShowCryptoPicker(true);
                                                    }
                                                }}
                                                className="w-full p-5 rounded-3xl border-2 border-dashed border-slate-200 bg-white hover:border-[#10b981] hover:bg-emerald-50/20 transition-all flex items-center gap-4 group"
                                            >
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#10b981] group-hover:bg-emerald-50">
                                                    <Plus size={24} />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold text-[#10b981]">Add new {withdrawalType === 'bank' ? 'bank' : 'wallet'}</span>
                                                    <span className="text-xs text-slate-400">{withdrawalType === 'bank' ? 'Search from bank details' : 'Select asset and chain'}</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {!selectedMethod && selectedBank && withdrawalType === 'bank' && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                            <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-1.5">
                                                    <img src={selectedBank.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="font-black text-slate-900">{selectedBank.name}</span>
                                                <button onClick={() => setSelectedBank(null)} className="ml-auto p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={16} /></button>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-xs font-bold text-slate-400">Account number</Label>
                                                <Input
                                                    placeholder="10-digit number"
                                                    value={accountNumber}
                                                    maxLength={10}
                                                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                                    className="h-14 bg-slate-50 border-none rounded-xl px-4 font-bold"
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-xs font-bold text-slate-400">Account name</Label>
                                                <Input
                                                    placeholder="Full name"
                                                    value={accountName}
                                                    onChange={(e) => setAccountName(e.target.value)}
                                                    className="h-14 bg-slate-50 border-none rounded-xl px-4 font-bold"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="save"
                                                    checked={saveForFuture}
                                                    onChange={(e) => setSaveForFuture(e.target.checked)}
                                                    className="w-5 h-5 rounded-lg border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                                                />
                                                <label htmlFor="save" className="text-xs font-bold text-slate-500">Save for future use</label>
                                            </div>
                                        </div>
                                    )}

                                    {!selectedMethod && selectedCrypto && withdrawalType === 'crypto' && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                            <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-1.5">
                                                    <img src={selectedCrypto.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="font-black text-slate-900">{selectedCrypto.name}</span>
                                                <button onClick={() => setSelectedCrypto(null)} className="ml-auto p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={16} /></button>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-xs font-bold text-slate-400">Select Network</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {selectedCrypto.chains.map((chain: string) => (
                                                        <button
                                                            key={chain}
                                                            onClick={() => setCryptoChain(chain)}
                                                            className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${cryptoChain === chain ? 'border-[#10b981] bg-emerald-50/50 text-[#10b981]' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {chain}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-xs font-bold text-slate-400">Wallet Address</Label>
                                                <Input
                                                    placeholder="Paste address here"
                                                    value={walletAddress}
                                                    onChange={(e) => setWalletAddress(e.target.value)}
                                                    className="h-14 bg-slate-50 border-none rounded-xl px-4 font-bold text-xs font-mono"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="save-crypto"
                                                    checked={saveForFuture}
                                                    onChange={(e) => setSaveForFuture(e.target.checked)}
                                                    className="w-5 h-5 rounded-lg border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                                                />
                                                <label htmlFor="save-crypto" className="text-xs font-bold text-slate-500">Save for future use</label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <Button variant="outline" onClick={() => setStep(1)} className="h-16 flex-1 rounded-[24px] border-slate-100 font-black text-slate-400">Back</Button>
                                        <Button
                                            onClick={() => setStep(3)}
                                            disabled={
                                                !selectedMethod &&
                                                (withdrawalType === 'bank'
                                                    ? (!selectedBank || accountNumber.length < 10 || !accountName)
                                                    : (!selectedCrypto || !cryptoChain || !walletAddress)
                                                )
                                            }
                                            className="h-16 flex-[2] bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] font-black shadow-xl"
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="p-8 bg-white rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                                        <div className="text-center space-y-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total amount</span>
                                            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{amount} <span className="text-sm text-slate-400 uppercase">{selectedCurrency}</span></h3>
                                        </div>

                                        <div className="space-y-4 pt-8 border-t border-slate-50">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-slate-400">Destination</span>
                                                <span className="font-black text-slate-900">{selectedMethod?.details.bank_name || selectedBank?.name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-slate-400">{withdrawalType === 'bank' ? 'Account' : 'Address'}</span>
                                                <span className="font-black text-slate-600">
                                                    {selectedMethod
                                                        ? (withdrawalType === 'bank'
                                                            ? `${selectedMethod.details.account_number.slice(0, 4)}****${selectedMethod.details.account_number.slice(-4)}`
                                                            : `${selectedMethod.details.address.slice(0, 6)}...${selectedMethod.details.address.slice(-4)}`
                                                        )
                                                        : (withdrawalType === 'bank'
                                                            ? `${accountNumber.slice(0, 4)}****${accountNumber.slice(-4)}`
                                                            : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                                                        )
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-slate-400">Fee</span>
                                                <span className="font-black text-emerald-500">Free</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Button variant="outline" onClick={() => setStep(2)} className="h-16 flex-1 rounded-[24px] border-slate-100 font-black text-slate-400">Back</Button>
                                        <Button
                                            onClick={handleWithdraw}
                                            disabled={loading}
                                            className="h-16 flex-[2] bg-[#10b981] hover:bg-[#059669] text-white rounded-[24px] font-black shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm withdrawal'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full items-center justify-center p-10 text-center animate-in zoom-in-95 duration-500 bg-white">
                        <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center text-blue-500 shadow-2xl shadow-blue-100 mb-8 animate-pulse">
                            <Clock size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Processing</h2>
                        <p className="text-slate-400 font-bold mb-10 leading-relaxed max-w-xs">
                            We've received your request! Your withdrawal is being processed and will arrive shortly.
                        </p>
                        <div className="p-6 bg-slate-50 rounded-[32px] w-full mb-10 border border-slate-100">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-slate-400 font-bold">Amount</span>
                                <span className="text-slate-900 font-black">{amount} {selectedCurrency}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold">Ref</span>
                                <span className="text-slate-900 font-mono font-bold tracking-widest text-[10px]">#WD-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                            </div>
                        </div>
                        <Button
                            onClick={reset}
                            className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-lg font-black"
                        >
                            Return to dashboard
                        </Button>
                    </div>
                )}
            </SheetContent>

            {/* Bank Picker Popover/Modal */}
            {/* Bank Picker Modal */}
            <Dialog open={showBankPicker} onOpenChange={setShowBankPicker}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-2 bg-[#1a1c1e] text-white border-none rounded-[40px] overflow-hidden shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Select Bank</DialogTitle>
                        <DialogDescription>Choose a bank from the list.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 pb-4 flex items-center justify-between">
                        <h3 className="text-xl font-black tracking-tight">Select Bank</h3>
                        <button onClick={() => { setShowBankPicker(false); setPickerSearch(''); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all">
                            <X size={20} className="text-white" />
                        </button>
                    </div>

                    <div className="px-8 py-2">
                        <div className="relative mb-6">
                            <Input
                                placeholder="Search Banks"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                                className="bg-white/5 border-none rounded-2xl pl-12 h-14 font-bold text-base focus-visible:ring-1 focus-visible:ring-[#10b981]"
                            />
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>

                        <div className="max-h-[450px] overflow-y-auto space-y-6 pr-2 no-scrollbar pb-10">
                            {pickerSearch ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {NIGERIAN_BANKS.filter(b => b.name.toLowerCase().includes(pickerSearch.toLowerCase())).map(bank => (
                                        <button
                                            key={bank.slug}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedBank(bank);
                                                setShowBankPicker(false);
                                                setPickerSearch('');
                                            }}
                                            className="w-full p-4 flex items-center gap-4 rounded-2xl hover:bg-white/5 transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                <img src={bank.logo} className="w-full h-full object-contain" />
                                            </div>
                                            <span className="font-bold text-slate-200 group-hover:text-white">{bank.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Frequently Used</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {NIGERIAN_BANKS.slice(0, 4).map(bank => (
                                                <button
                                                    key={bank.slug}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBank(bank);
                                                        setShowBankPicker(false);
                                                    }}
                                                    className="p-4 bg-[#242628] rounded-2xl flex items-center gap-3 border border-white/5 hover:border-[#10b981]/30 transition-all text-left"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={bank.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="text-xs font-bold truncate">{bank.name.split(' ')[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Popular Options</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {NIGERIAN_BANKS.filter(b => b.popular).map(bank => (
                                                <button
                                                    key={bank.slug}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBank(bank);
                                                        setShowBankPicker(false);
                                                    }}
                                                    className="w-full p-4 flex items-center gap-4 rounded-2xl bg-[#242628] border border-white/5 hover:border-[#10b981]/30 transition-all text-left group"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={bank.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="font-bold text-slate-200 group-hover:text-white">{bank.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">International Banks</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {INTERNATIONAL_BANKS.map(bank => (
                                                <button
                                                    key={bank.slug}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBank(bank);
                                                        setShowBankPicker(false);
                                                    }}
                                                    className="w-full p-4 flex items-center gap-4 rounded-2xl bg-[#242628] border border-white/5 hover:bg-[#2a2c2e] transition-all text-left group"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={bank.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="font-bold text-slate-200 group-hover:text-white">{bank.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Crypto Picker Popover/Modal */}
            {/* Crypto Picker Modal */}
            <Dialog open={showCryptoPicker} onOpenChange={setShowCryptoPicker}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-2 bg-[#1a1c1e] text-white border-none rounded-[40px] overflow-hidden shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Select Token</DialogTitle>
                        <DialogDescription>Choose a cryptocurrency token.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 pb-4 flex items-center justify-between">
                        <h3 className="text-xl font-black tracking-tight">Select Token</h3>
                        <button onClick={() => { setShowCryptoPicker(false); setPickerSearch(''); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all">
                            <X size={20} className="text-white" />
                        </button>
                    </div>

                    <div className="px-8 py-2">
                        <div className="relative mb-6">
                            <Input
                                placeholder="Search Coins"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                                className="bg-white/5 border-none rounded-2xl pl-12 h-14 font-bold text-lg focus-visible:ring-1 focus-visible:ring-[#10b981]"
                            />
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>

                        <div className="max-h-[450px] overflow-y-auto space-y-6 pr-2 no-scrollbar pb-10">
                            {pickerSearch ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {CRYPTO_ASSETS.filter(c => c.name.toLowerCase().includes(pickerSearch.toLowerCase()) || c.symbol.toLowerCase().includes(pickerSearch.toLowerCase())).map(asset => (
                                        <button
                                            key={asset.symbol}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCrypto(asset);
                                                setShowCryptoPicker(false);
                                                setCryptoChain(asset.chains[0]);
                                                setPickerSearch('');
                                            }}
                                            className="w-full p-4 flex items-center gap-4 rounded-2xl hover:bg-white/5 transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                <img src={asset.logo} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-200 group-hover:text-white leading-tight">{asset.name}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{asset.symbol}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Popular Tokens</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CRYPTO_ASSETS.slice(0, 4).map(asset => (
                                                <button
                                                    key={asset.symbol}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCrypto(asset);
                                                        setShowCryptoPicker(false);
                                                        setCryptoChain(asset.chains[0]);
                                                    }}
                                                    className="p-4 bg-[#242628] rounded-2xl flex items-center gap-3 border border-white/5 hover:border-[#10b981]/30 transition-all text-left"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={asset.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="text-xs font-bold truncate">{asset.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {CRYPTO_ASSETS.map(asset => (
                                            <button
                                                key={asset.symbol}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCrypto(asset);
                                                    setShowCryptoPicker(false);
                                                    setCryptoChain(asset.chains[0]);
                                                }}
                                                className="w-full p-4 flex items-center gap-4 rounded-2xl bg-[#242628] border border-white/5 hover:bg-[#2a2c2e] transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                    <img src={asset.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 group-hover:text-white leading-tight">{asset.name}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{asset.symbol}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
};
