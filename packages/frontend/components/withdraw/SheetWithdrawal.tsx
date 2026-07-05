'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { OtpInput, focusOtpBox } from '@/components/auth/OtpInput';
import {
    ArrowRight, X, Plus, Clock, Bitcoin, DollarSign,
    CheckCircle2, Search, Loader2, CheckCircle, AlertTriangle, Send
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
    preselectedCurrency = 'NGN'
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

    const [selectedMethod, setSelectedMethod] = useState<any>(null);
    const [saveForFuture, setSaveForFuture] = useState(true);

    // Bank state
    const [showBankList, setShowBankList] = useState(false);
    const [bankListSearch, setBankListSearch] = useState('');
    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [verifyingAccount, setVerifyingAccount] = useState(false);
    const [verifiedAccountName, setVerifiedAccountName] = useState('');
    const [verifyError, setVerifyError] = useState('');

    // Crypto state
    const [showCryptoPicker, setShowCryptoPicker] = useState(false);
    const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
    const [cryptoChain, setCryptoChain] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [pickerSearch, setPickerSearch] = useState('');

    const [loading, setLoading] = useState(false);
    const [savedMethods, setSavedMethods] = useState<any[]>([]);
    const [withdrawalReference, setWithdrawalReference] = useState('');
    const [withdrawalStatus, setWithdrawalStatus] = useState('');

    // Step-up (STEP_UP_REQUIRED) OTP elevation state
    const [stepUpStage, setStepUpStage] = useState<'none' | 'otp'>('none');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isInternationalBank = !!selectedBank && INTERNATIONAL_BANKS.some(b => b.code === selectedBank.code);

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

    // Auto-verify bank account when 10 digits are entered — international banks can't be
    // resolved via Flutterwave's NGN-only lookup, so they skip straight to manual entry.
    useEffect(() => {
        if (!selectedBank || isInternationalBank || accountNumber.length !== 10) {
            setVerifiedAccountName('');
            setVerifyError('');
            return;
        }
        let cancelled = false;
        const verify = async () => {
            setVerifyingAccount(true);
            setVerifiedAccountName('');
            setVerifyError('');
            try {
                const res = await api.post(`/profiles/${safetag}/verify-bank-account`, {
                    bankCode: selectedBank.code,
                    accountNumber,
                });
                if (!cancelled) {
                    setVerifiedAccountName(res.data.accountName);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setVerifyError(err.response?.data?.error || 'Account not found — please check the number');
                }
            } finally {
                if (!cancelled) setVerifyingAccount(false);
            }
        };
        verify();
        return () => { cancelled = true; };
    }, [accountNumber, selectedBank, safetag, isInternationalBank]);

    const startResendTimer = () => {
        if (resendTimerRef.current) clearInterval(resendTimerRef.current);
        setResendCountdown(60);
        setCanResend(false);
        resendTimerRef.current = setInterval(() => {
            setResendCountdown((c) => {
                if (c <= 1) {
                    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
                    setCanResend(true);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    };

    useEffect(() => () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current); }, []);

    const requestWithdrawOtp = async () => {
        setSendingOtp(true);
        setOtpError('');
        try {
            const res = await api.post('/auth/withdraw-otp/send');
            setMaskedEmail(res.data?.masked_email || '');
            setStepUpStage('otp');
            startResendTimer();
            setTimeout(() => focusOtpBox(0), 100);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not send confirmation code — please try again'));
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        await requestWithdrawOtp();
    };

    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) { setOtpError('Please enter the full 6-digit code'); return; }

        setVerifyingOtp(true);
        setOtpError('');
        try {
            await api.post('/auth/withdraw-otp/verify', { code });
            setStepUpStage('none');
            setOtp(['', '', '', '', '', '']);
            await handleWithdraw();
        } catch (err) {
            setOtpError(apiErrorMessage(err, 'Invalid or expired code. Please try again.'));
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleWithdraw = async () => {
        setLoading(true);
        try {
            const rawAmount = Number(amount.replace(/,/g, ''));
            const resolvedAccountName = isInternationalBank ? accountHolderName : verifiedAccountName;
            const methodDetails = selectedMethod ? selectedMethod.details : (
                withdrawalType === 'bank'
                    ? {
                        bank_id: selectedBank.code,
                        bankCode: selectedBank.code,
                        bank_name: selectedBank.name,
                        account_number: accountNumber,
                        account_name: resolvedAccountName,
                        verifiedAccountName: resolvedAccountName,
                        verified: !isInternationalBank,
                        logo: selectedBank.logo,
                    }
                    : {
                        asset: selectedCrypto.name,
                        symbol: selectedCrypto.symbol,
                        chain: cryptoChain,
                        address: walletAddress,
                        logo: selectedCrypto.logo,
                    }
            );

            if (!selectedMethod && saveForFuture) {
                await api.post(`/profiles/${safetag}/payout-methods`, {
                    type: withdrawalType,
                    details: methodDetails,
                });
            }

            const res = await api.post(`/withdrawals/${safetag}`, {
                amount: rawAmount,
                currency: selectedCurrency,
                payout_method_id: selectedMethod?.id || null,
                details: methodDetails,
            });

            setWithdrawalReference(res.data?.reference || '');
            setWithdrawalStatus(res.data?.status || '');
            toast.success('Withdrawal request submitted!');
            onSuccess({ amount: rawAmount, currency: selectedCurrency, type: withdrawalType });
            setStep(4);
        } catch (error: any) {
            const data = error.response?.data;
            if (data?.error === 'STEP_UP_REQUIRED') {
                await requestWithdrawOtp();
            } else {
                toast.error(data?.message || data?.error || 'Failed to process withdrawal');
            }
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setAmount('');
        setSelectedMethod(null);
        setShowBankList(false);
        setBankListSearch('');
        setSelectedBank(null);
        setAccountNumber('');
        setAccountHolderName('');
        setVerifiedAccountName('');
        setVerifyError('');
        setSelectedCrypto(null);
        setCryptoChain('');
        setWalletAddress('');
        setWithdrawalReference('');
        setWithdrawalStatus('');
        setStepUpStage('none');
        setMaskedEmail('');
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        if (resendTimerRef.current) clearInterval(resendTimerRef.current);
        onClose();
    };

    const fetchSavedMethods = async () => {
        try {
            const res = await api.get(`/profiles/${safetag}/payout-methods`);
            setSavedMethods(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('❌ Failed to fetch payout methods:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchSavedMethods();
            setSelectedCurrency(preselectedCurrency);
            setWithdrawalType(['BTC', 'ETH', 'USDT'].includes(preselectedCurrency) ? 'crypto' : 'bank');
        }
    }, [isOpen, preselectedCurrency]);

    const canProceedFromStep2 = selectedMethod || (
        withdrawalType === 'bank'
            ? (selectedBank && (
                isInternationalBank
                    ? accountNumber.trim().length > 0 && accountHolderName.trim().length > 0
                    : accountNumber.length === 10 && !!verifiedAccountName
            ))
            : (selectedCrypto && cryptoChain && walletAddress.length >= 20)
    );

    const filteredPickerBanks = bankListSearch
        ? NIGERIAN_BANKS.filter(b => b.name.toLowerCase().includes(bankListSearch.toLowerCase()))
        : NIGERIAN_BANKS;
    const filteredPickerInternational = bankListSearch
        ? INTERNATIONAL_BANKS.filter(b => b.name.toLowerCase().includes(bankListSearch.toLowerCase()))
        : INTERNATIONAL_BANKS;

    const selectBank = (bank: any) => {
        setSelectedBank(bank);
        setAccountNumber('');
        setAccountHolderName('');
        setVerifiedAccountName('');
        setVerifyError('');
        setShowBankList(false);
        setBankListSearch('');
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && reset()}>
            <SheetContent className="sm:max-w-[460px] w-full border-none p-0 bg-white flex flex-col gap-0 ph-no-capture">
                <SheetHeader className="sr-only">
                    <SheetTitle>Withdrawal Portal</SheetTitle>
                    <SheetDescription>Securely withdraw your funds to a bank account or crypto wallet.</SheetDescription>
                </SheetHeader>
                {step < 4 ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="px-6 pt-7 flex-shrink-0">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="font-['Inter_Tight',sans-serif] text-[19px] font-extrabold text-[#0f172a] tracking-[-.02em]">Withdraw funds</h2>
                                    <p className="text-xs text-[#94a3b8] mt-0.5">Securely transfer your earnings</p>
                                </div>
                                <button onClick={reset} className="w-9 h-9 rounded-[9px] border border-[#e9eaec] bg-[#f7f8f9] flex items-center justify-center flex-shrink-0">
                                    <X size={15} className="text-[#64748b]" />
                                </button>
                            </div>
                            {/* Step indicator */}
                            <div className="flex gap-1 mb-6">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className="h-[3px] flex-1 rounded-full transition-colors" style={{ background: step >= s ? '#10b981' : '#e9eaec' }} />
                                ))}
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-6">
                            {step === 1 && (
                                <div className="flex flex-col gap-5 pb-6 animate-in fade-in duration-300">
                                    <div>
                                        <p className="text-xs font-semibold text-[#64748b] mb-2.5">Select currency</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {balances.map((b) => (
                                                <button
                                                    key={b.currency}
                                                    onClick={() => {
                                                        setSelectedCurrency(b.currency);
                                                        setWithdrawalType(['USDT', 'BTC', 'ETH'].includes(b.currency) ? 'crypto' : 'bank');
                                                    }}
                                                    className="flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border-2 transition-all"
                                                    style={selectedCurrency === b.currency
                                                        ? { borderColor: '#10b981', background: '#f0fdf4' }
                                                        : { borderColor: '#e9eaec', background: '#f7f8f9' }}
                                                >
                                                    <div className="w-6 h-6 mb-1 flex-shrink-0">
                                                        {CURRENCY_ICONS[b.currency] || <DollarSign size={20} className="text-slate-400" />}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-[#0f172a]">{b.currency}</span>
                                                    <span className="text-[10px] text-[#94a3b8] truncate w-full text-center">{Number(b.amount).toLocaleString()}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-[#64748b] mb-2">Amount to withdraw</p>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter_Tight',sans-serif] text-lg font-bold text-[#94a3b8] pointer-events-none">
                                                {{ NGN: '₦', USD: '$', EUR: '€', GBP: '£', BTC: '₿', USDT: '₮', ETH: 'Ξ' }[selectedCurrency] || '$'}
                                            </div>
                                            <Input
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                className="h-[62px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[14px] pl-9 pr-16 font-['Inter_Tight',sans-serif] text-2xl font-bold text-[#0f172a] focus-visible:ring-1 focus-visible:ring-[#10b981]"
                                            />
                                            <button
                                                onClick={() => {
                                                    const bal = balances.find(b => b.currency === selectedCurrency)?.amount || 0;
                                                    setAmount(formatWithCommas(bal.toString()));
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#10b981] rounded-[7px] px-2.5 py-1.5 text-white text-[10px] font-extrabold"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                        <p className="text-[11.5px] text-[#94a3b8] mt-2">
                                            Available: <span className="font-bold text-[#0f172a]">
                                                {Number(balances.find(b => b.currency === selectedCurrency)?.amount || 0).toLocaleString()} {selectedCurrency}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="flex flex-col gap-4 pb-6 animate-in fade-in duration-300">
                                    <div>
                                        <p className="text-xs font-semibold text-[#64748b] mb-2.5">Saved methods</p>
                                        <div className="flex flex-col gap-2">
                                            {savedMethods.filter(m => m.type === withdrawalType).map((m) => (
                                                <div
                                                    key={m.id}
                                                    onClick={() => setSelectedMethod(m)}
                                                    className="flex items-center gap-3 px-4 py-3.5 rounded-[13px] border-2 cursor-pointer transition-all"
                                                    style={selectedMethod?.id === m.id ? { borderColor: '#10b981', background: '#f0fdf4' } : { borderColor: '#f1f5f9', background: '#fff' }}
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm border border-[#e9eaec] flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={m.details.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-bold text-[#0f172a] truncate">{m.details.account_name || m.details.symbol}</p>
                                                        <p className="text-[11px] text-[#94a3b8] truncate">
                                                            {m.type === 'bank' ? `${m.details.bank_name} · ${String(m.details.account_number).slice(0, 4)}****${String(m.details.account_number).slice(-4)}` : `${m.details.symbol} · ${String(m.details.address).slice(0, 6)}...`}
                                                        </p>
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={selectedMethod?.id === m.id ? { borderColor: '#10b981', background: '#10b981' } : { borderColor: '#e2e8f0' }}>
                                                        {selectedMethod?.id === m.id && <CheckCircle2 size={13} className="text-white" />}
                                                    </div>
                                                </div>
                                            ))}

                                            {!showBankList && !(selectedBank && withdrawalType === 'bank') && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMethod(null);
                                                        if (withdrawalType === 'bank') setShowBankList(true);
                                                        else setShowCryptoPicker(true);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-3.5 rounded-[13px] border-2 border-dashed border-[#e9eaec] bg-[#fafafa] hover:border-[#10b981]/40 transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-[10px] bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                                                        <Plus size={16} className="text-[#64748b]" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[13px] font-bold text-[#10b981]">Add {withdrawalType === 'bank' ? 'bank account' : 'new wallet'}</p>
                                                        <p className="text-[11px] text-[#94a3b8]">{withdrawalType === 'bank' ? 'Search from all supported banks' : 'Select asset and chain'}</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline bank search list */}
                                    {showBankList && (
                                        <div className="border border-[#e9eaec] rounded-[14px] overflow-hidden bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3 border-b border-[#f1f5f9] flex items-center gap-2">
                                                <div className="flex-1 flex items-center gap-2 bg-[#f7f8f9] rounded-[9px] px-3.5 py-2.5">
                                                    <Search size={13} className="text-[#94a3b8] flex-shrink-0" />
                                                    <input
                                                        placeholder="Search banks…"
                                                        value={bankListSearch}
                                                        onChange={(e) => setBankListSearch(e.target.value)}
                                                        className="bg-transparent border-none outline-none text-[13px] font-medium text-[#0f172a] w-full"
                                                    />
                                                </div>
                                                <button onClick={() => { setShowBankList(false); setBankListSearch(''); }} className="text-[#94a3b8] flex-shrink-0">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="max-h-[260px] overflow-y-auto">
                                                {filteredPickerBanks.map(bank => (
                                                    <button
                                                        key={bank.slug}
                                                        onClick={() => selectBank(bank)}
                                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                                            <img src={bank.logo} className="w-full h-full object-contain" />
                                                        </div>
                                                        <span className="text-[13px] font-semibold text-[#0f172a]">{bank.name}</span>
                                                    </button>
                                                ))}
                                                {filteredPickerInternational.length > 0 && (
                                                    <>
                                                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#b0bac6]">International banks</p>
                                                        {filteredPickerInternational.map(bank => (
                                                            <button
                                                                key={bank.slug}
                                                                onClick={() => selectBank(bank)}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors text-left"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-white border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                                                    <img src={bank.logo} className="w-full h-full object-contain" />
                                                                </div>
                                                                <span className="text-[13px] font-semibold text-[#0f172a]">{bank.name}</span>
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                                {filteredPickerBanks.length === 0 && filteredPickerInternational.length === 0 && (
                                                    <p className="px-4 py-6 text-center text-xs text-[#94a3b8]">No banks match your search.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bank account entry — auto-verify for NG banks, manual for international */}
                                    {!selectedMethod && selectedBank && withdrawalType === 'bank' && (
                                        <div className="bg-[#f7f8f9] rounded-[13px] p-4 border border-[#e9eaec] animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center gap-2.5 mb-3.5">
                                                <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                                    <img src={selectedBank.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <p className="text-[13px] font-bold text-[#0f172a] flex-1">{selectedBank.name}</p>
                                                <button onClick={() => { setSelectedBank(null); setAccountNumber(''); setAccountHolderName(''); setVerifiedAccountName(''); setVerifyError(''); }} className="text-[#94a3b8] flex-shrink-0">
                                                    <X size={14} />
                                                </button>
                                            </div>

                                            <p className="text-[11.5px] font-semibold text-[#64748b] mb-1.5">{isInternationalBank ? 'Account number / IBAN' : 'Account number'}</p>
                                            <Input
                                                placeholder={isInternationalBank ? 'Account number or IBAN' : '10-digit number'}
                                                value={accountNumber}
                                                maxLength={isInternationalBank ? 34 : 10}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    setAccountNumber(isInternationalBank ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : raw.replace(/\D/g, ''));
                                                    setVerifiedAccountName('');
                                                    setVerifyError('');
                                                }}
                                                className="h-[50px] bg-white border border-[#e9eaec] rounded-[11px] px-4 font-bold tracking-wide"
                                            />

                                            {isInternationalBank ? (
                                                <div className="mt-3.5">
                                                    <p className="text-[11.5px] font-semibold text-[#64748b] mb-1.5">Account holder name</p>
                                                    <Input
                                                        placeholder="Full name on account"
                                                        value={accountHolderName}
                                                        onChange={(e) => setAccountHolderName(e.target.value)}
                                                        className="h-[50px] bg-white border border-[#e9eaec] rounded-[11px] px-4 font-bold"
                                                    />
                                                    <div className="flex items-start gap-2 mt-3 p-3 bg-[#fffbeb] border border-[#fde68a] rounded-[10px]">
                                                        <AlertTriangle size={14} className="text-[#d97706] flex-shrink-0 mt-0.5" />
                                                        <p className="text-[11px] font-semibold text-[#92400e] leading-snug">International accounts can&apos;t be auto-verified — double-check the details before continuing.</p>
                                                    </div>
                                                </div>
                                            ) : accountNumber.length === 10 && (
                                                <div className="mt-3 animate-in fade-in duration-200">
                                                    {verifyingAccount && (
                                                        <div className="flex items-center gap-2.5 p-3 bg-[#eff6ff] rounded-[10px]">
                                                            <Loader2 size={15} className="animate-spin text-[#2563eb]" />
                                                            <span className="text-[12px] font-semibold text-[#2563eb]">Verifying account…</span>
                                                        </div>
                                                    )}
                                                    {verifiedAccountName && !verifyingAccount && (
                                                        <div className="flex items-center gap-2.5 p-3 bg-[#f0fdf4] rounded-[10px] border border-[#bbf7d0]">
                                                            <CheckCircle size={15} className="text-[#16a34a] shrink-0" />
                                                            <div>
                                                                <p className="text-[10px] font-bold text-[#166534] uppercase tracking-wide">Account verified</p>
                                                                <p className="text-[13px] font-bold text-[#0f172a] mt-0.5">{verifiedAccountName}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {verifyError && !verifyingAccount && (
                                                        <div className="flex items-center gap-2.5 p-3 bg-[#fff1f2] rounded-[10px] border border-[#fecdd3]">
                                                            <X size={15} className="text-[#e11d48] shrink-0" />
                                                            <p className="text-[12px] font-semibold text-[#e11d48]">{verifyError}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2.5 mt-4">
                                                <input
                                                    type="checkbox"
                                                    id="save"
                                                    checked={saveForFuture}
                                                    onChange={(e) => setSaveForFuture(e.target.checked)}
                                                    className="w-4 h-4 rounded-md border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                                                />
                                                <label htmlFor="save" className="text-xs font-semibold text-[#64748b]">Save for future use</label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Crypto form */}
                                    {!selectedMethod && selectedCrypto && withdrawalType === 'crypto' && (
                                        <div className="bg-[#f7f8f9] rounded-[13px] p-4 border border-[#e9eaec] animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center gap-2.5 mb-3.5">
                                                <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                                    <img src={selectedCrypto.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <p className="text-[13px] font-bold text-[#0f172a] flex-1">{selectedCrypto.name}</p>
                                                <button onClick={() => setSelectedCrypto(null)} className="text-[#94a3b8] flex-shrink-0"><X size={14} /></button>
                                            </div>

                                            <p className="text-[11.5px] font-semibold text-[#64748b] mb-1.5">Select network</p>
                                            <div className="grid grid-cols-2 gap-2 mb-3.5">
                                                {selectedCrypto.chains.map((chain: string) => (
                                                    <button
                                                        key={chain}
                                                        onClick={() => setCryptoChain(chain)}
                                                        className="px-2.5 py-2 rounded-[9px] border-2 text-[10px] font-bold uppercase tracking-wide transition-all"
                                                        style={cryptoChain === chain ? { borderColor: '#10b981', background: '#f0fdf4', color: '#10b981' } : { borderColor: '#f1f5f9', background: '#fff', color: '#94a3b8' }}
                                                    >
                                                        {chain}
                                                    </button>
                                                ))}
                                            </div>

                                            <p className="text-[11.5px] font-semibold text-[#64748b] mb-1.5">Wallet address</p>
                                            <Input
                                                placeholder="Paste address here"
                                                value={walletAddress}
                                                onChange={(e) => setWalletAddress(e.target.value)}
                                                className="h-[50px] bg-white border border-[#e9eaec] rounded-[11px] px-4 font-bold text-xs font-mono"
                                            />

                                            <div className="flex items-center gap-2.5 mt-4">
                                                <input
                                                    type="checkbox"
                                                    id="save-crypto"
                                                    checked={saveForFuture}
                                                    onChange={(e) => setSaveForFuture(e.target.checked)}
                                                    className="w-4 h-4 rounded-md border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                                                />
                                                <label htmlFor="save-crypto" className="text-xs font-semibold text-[#64748b]">Save for future use</label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="pb-6 animate-in fade-in duration-300">
                                    <div className="bg-[#f7f8f9] rounded-2xl p-5 border border-[#e9eaec] mb-4">
                                        <p className="text-[11.5px] font-semibold text-[#94a3b8] text-center mb-1.5">Withdrawal amount</p>
                                        <p className="font-['Inter_Tight',sans-serif] text-[34px] font-extrabold text-[#0f172a] text-center tracking-[-.03em] leading-none">{amount} <span className="text-sm text-[#94a3b8] uppercase">{selectedCurrency}</span></p>
                                    </div>
                                    <div className="flex flex-col rounded-[13px] border border-[#e9eaec] overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#f3f4f6]">
                                            <span className="text-[12.5px] font-medium text-[#64748b]">Destination</span>
                                            <span className="text-[13px] font-bold text-[#0f172a]">{selectedMethod?.details.bank_name || selectedBank?.name || selectedMethod?.details.symbol || selectedCrypto?.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#f3f4f6]">
                                            <span className="text-[12.5px] font-medium text-[#64748b]">{withdrawalType === 'bank' ? 'Account' : 'Address'}</span>
                                            <span className="text-[13px] font-bold text-[#475569]">
                                                {selectedMethod
                                                    ? (withdrawalType === 'bank'
                                                        ? `${String(selectedMethod.details.account_number).slice(0, 4)}****${String(selectedMethod.details.account_number).slice(-4)}`
                                                        : `${String(selectedMethod.details.address).slice(0, 6)}...${String(selectedMethod.details.address).slice(-4)}`
                                                    )
                                                    : (withdrawalType === 'bank'
                                                        ? `${accountNumber.slice(0, 4)}****${accountNumber.slice(-4)}`
                                                        : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                                                    )
                                                }
                                            </span>
                                        </div>
                                        {withdrawalType === 'bank' && (
                                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#f3f4f6]">
                                                <span className="text-[12.5px] font-medium text-[#64748b]">Account name</span>
                                                <span className="text-[13px] font-bold text-[#0f172a]">{selectedMethod?.details.account_name || verifiedAccountName || accountHolderName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between px-4 py-3.5">
                                            <span className="text-[12.5px] font-medium text-[#64748b]">Transfer fee</span>
                                            <span className="text-[13px] font-bold text-[#10b981]">Free</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 border-t border-[#f1f5f9] flex-shrink-0 flex gap-2.5">
                            {step > 1 && (
                                <button onClick={() => setStep(step - 1)} className="flex-1 h-12 rounded-full border border-[#e9eaec] bg-[#f7f8f9] text-[#64748b] font-semibold text-sm">
                                    Back
                                </button>
                            )}
                            {step === 1 && (
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!amount || Number(amount.replace(/,/g, '')) <= 0}
                                    className="flex-1 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                                    style={(!amount || Number(amount.replace(/,/g, '')) <= 0) ? { background: '#e9eaec', color: '#94a3b8' } : { background: '#0f172a', color: '#fff' }}
                                >
                                    Continue
                                    <ArrowRight size={15} />
                                </button>
                            )}
                            {step === 2 && (
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!canProceedFromStep2 || verifyingAccount}
                                    className="flex-[2] h-12 rounded-full font-bold text-sm disabled:cursor-not-allowed"
                                    style={(!canProceedFromStep2 || verifyingAccount) ? { background: '#e9eaec', color: '#94a3b8' } : { background: '#0f172a', color: '#fff' }}
                                >
                                    Continue
                                </button>
                            )}
                            {step === 3 && (
                                <button
                                    onClick={handleWithdraw}
                                    disabled={loading}
                                    className="flex-[2] h-12 rounded-full bg-[#10b981] text-white font-bold text-sm shadow-[0_4px_14px_rgba(16,185,129,.28)] flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                                        <>
                                            <Send size={14} />
                                            Confirm withdrawal
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Step 4 — success screen */
                    <div className="flex flex-col h-full items-center justify-center p-9 text-center animate-in zoom-in-95 duration-500 bg-white">
                        <div
                            className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-5"
                            style={withdrawalStatus === 'PENDING_APPROVAL' ? { background: '#fffbeb', color: '#d97706' } : { background: '#eff6ff', color: '#2563eb' }}
                        >
                            <Clock size={32} />
                        </div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#0f172a] tracking-[-.02em] mb-1.5">
                            {withdrawalStatus === 'PENDING_APPROVAL' ? 'Pending approval' : 'Processing'}
                        </h2>
                        <p className="text-[13px] text-[#64748b] leading-relaxed max-w-[280px] mb-6">
                            {withdrawalStatus === 'PENDING_APPROVAL'
                                ? "We've received your request. This withdrawal needs a manual review and you'll be notified once it's approved."
                                : "We've received your request! Your withdrawal is being processed and will arrive in your account shortly."}
                        </p>
                        <div className="bg-[#f7f8f9] rounded-[13px] p-4 w-full border border-[#e9eaec] mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[#94a3b8] font-medium">Amount</span>
                                <span className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#0f172a]">{amount} {selectedCurrency}</span>
                            </div>
                            {withdrawalReference && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#94a3b8] font-medium">Reference</span>
                                    <span className="text-[11px] font-semibold text-[#0f172a] tracking-wide">{withdrawalReference}</span>
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={reset}
                            className="w-full h-14 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-2xl text-base font-bold"
                        >
                            Done
                        </Button>
                    </div>
                )}
            </SheetContent>

            {/* Crypto Picker Modal */}
            <Dialog open={showCryptoPicker} onOpenChange={setShowCryptoPicker}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-0 bg-white border-none rounded-[32px] overflow-hidden shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Select Token</DialogTitle>
                        <DialogDescription>Choose a cryptocurrency token.</DialogDescription>
                    </DialogHeader>

                    <div className="p-6 pb-3 flex items-center justify-between border-b border-[#f1f5f9]">
                        <h3 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[#0f172a] tracking-[-.01em]">Select token</h3>
                        <button onClick={() => { setShowCryptoPicker(false); setPickerSearch(''); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f7f8f9] hover:bg-[#f1f5f9] transition-all">
                            <X size={16} className="text-[#64748b]" />
                        </button>
                    </div>

                    <div className="px-6 py-4">
                        <div className="relative mb-4">
                            <Input
                                placeholder="Search coins"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                                className="bg-[#f7f8f9] border border-[#e9eaec] rounded-xl pl-11 h-12 font-semibold text-sm focus-visible:ring-1 focus-visible:ring-[#10b981]"
                            />
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                        </div>

                        <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
                            {(pickerSearch
                                ? CRYPTO_ASSETS.filter(c => c.name.toLowerCase().includes(pickerSearch.toLowerCase()) || c.symbol.toLowerCase().includes(pickerSearch.toLowerCase()))
                                : CRYPTO_ASSETS
                            ).map(asset => (
                                <button
                                    key={asset.symbol}
                                    onClick={() => {
                                        setSelectedCrypto(asset);
                                        setShowCryptoPicker(false);
                                        setCryptoChain(asset.chains[0]);
                                        setPickerSearch('');
                                    }}
                                    className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-[#f8f9fa] transition-all text-left"
                                >
                                    <div className="w-10 h-10 bg-white rounded-xl border border-[#e9eaec] flex items-center justify-center p-1.5 flex-shrink-0">
                                        <img src={asset.logo} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#0f172a] leading-tight text-sm">{asset.name}</span>
                                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{asset.symbol}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Step-up required — OTP elevation dialog */}
            <Dialog open={stepUpStage === 'otp'} onOpenChange={(open) => !open && setStepUpStage('none')}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm w-full p-6 bg-white border-none rounded-[24px] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[#0f172a] tracking-[-.01em]">
                            Confirm your withdrawal
                        </DialogTitle>
                        <DialogDescription className="text-[13px] text-[#64748b] leading-relaxed pt-1.5">
                            For your security, we&apos;ve sent a 6-digit code to <span className="font-bold text-[#0f172a]">{maskedEmail}</span>. Enter it below to complete this withdrawal.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-3">
                        <OtpInput value={otp} onChange={(next) => { setOtp(next); setOtpError(''); }} error={!!otpError} onEnter={handleVerifyOtp} />
                        {otpError && (
                            <p className="text-[11.5px] text-[#e11d48] font-semibold mt-2">{otpError}</p>
                        )}
                    </div>

                    <Button
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || sendingOtp}
                        className="w-full h-12 bg-[#10b981] hover:bg-[#0da271] text-white rounded-full text-sm font-bold mt-4 disabled:opacity-70"
                    >
                        {verifyingOtp ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Verifying…</span>
                        ) : 'Verify & complete withdrawal'}
                    </Button>

                    <div className="flex items-center justify-center mt-3">
                        {canResend ? (
                            <button onClick={handleResendOtp} disabled={sendingOtp} className="bg-none border-none cursor-pointer text-[12.5px] font-semibold text-[#10b981] p-0 disabled:opacity-60">Resend code</button>
                        ) : (
                            <span className="text-[12px] text-[#94a3b8] font-medium">Resend in {resendCountdown}s</span>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
};
