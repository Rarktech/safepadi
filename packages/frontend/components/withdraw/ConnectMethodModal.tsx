'use client';

import React, { useState, useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Search, X, Check, ChevronRight, Building2, Wallet,
    ArrowLeft, Landmark, CreditCard, ShieldCheck, User
} from 'lucide-react';
import { NIGERIAN_BANKS, CRYPTO_ASSETS } from '@/lib/constants/payout-data';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface ConnectMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    safetag: string;
    onSuccess: () => void;
}

export const ConnectMethodModal = ({ isOpen, onClose, safetag, onSuccess }: ConnectMethodModalProps) => {
    const [step, setStep] = useState<'select' | 'details'>('select');
    const [type, setType] = useState<'bank' | 'crypto'>('bank');
    const [search, setSearch] = useState('');

    // Selection state
    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [selectedCrypto, setSelectedCrypto] = useState<any>(null);

    // Form state
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [cryptoChain, setCryptoChain] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [loading, setLoading] = useState(false);

    // Filtering
    const filteredBanks = useMemo(() => {
        return NIGERIAN_BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
    }, [search]);

    const filteredCrypto = useMemo(() => {
        return CRYPTO_ASSETS.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.symbol.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    const popularBanks = NIGERIAN_BANKS.slice(0, 8);
    const frequentlyUsed = NIGERIAN_BANKS.slice(0, 4);

    const handleSelectBank = (bank: any) => {
        setSelectedBank(bank);
        setType('bank');
        setStep('details');
    };

    const handleSelectCrypto = (crypto: any) => {
        setSelectedCrypto(crypto);
        setType('crypto');
        setCryptoChain(crypto.chains[0]);
        setStep('details');
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const details = type === 'bank'
                ? { bank_id: selectedBank.code, bank_name: selectedBank.name, account_number: accountNumber, account_name: accountName, logo: selectedBank.logo }
                : { asset: selectedCrypto.name, symbol: selectedCrypto.symbol, chain: cryptoChain, address: walletAddress, logo: selectedCrypto.logo };

            const res = await api.post(`/profiles/${safetag}/payout-methods`, {
                type,
                details
            });

            if (res.status === 201) {
                onSuccess();
                onClose();
                reset();
            }
        } catch (error) {
            console.error('❌ Failed to save payout method:', error);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('select');
        setSearch('');
        setSelectedBank(null);
        setSelectedCrypto(null);
        setAccountNumber('');
        setAccountName('');
        setWalletAddress('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-2 bg-[#1a1c1e] text-white border-none rounded-[40px] overflow-hidden shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="sr-only">Connect Payout Method</DialogTitle>
                    <DialogDescription className="sr-only">Select a bank or crypto wallet to receive your earnings.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col h-[85vh] max-h-[650px]">
                    {/* Header with Navigation */}
                    <div className="flex items-center justify-between px-6 pt-6 mb-4">
                        {step === 'details' ? (
                            <button onClick={() => setStep('select')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                <ArrowLeft size={18} />
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setType('bank')}
                                    className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", type === 'bank' ? "bg-[#10b981] text-white" : "bg-white/5 text-slate-400")}
                                >
                                    Banks
                                </button>
                                <button
                                    onClick={() => setType('crypto')}
                                    className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", type === 'crypto' ? "bg-[#10b981] text-white" : "bg-white/5 text-slate-400")}
                                >
                                    Crypto
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {step === 'select' ? (
                        <div className="flex-1 overflow-y-auto px-6 no-scrollbar">
                            <div className="mb-6">
                                <h2 className="text-xl font-black mb-2 tracking-tight">Add Account</h2>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1 bg-[#10b981] rounded-full" />
                                    <div className="flex-1 h-1 bg-white/5 rounded-full" />
                                    <div className="flex-1 h-1 bg-white/5 rounded-full" />
                                    <div className="flex-1 h-1 bg-white/5 rounded-full" />
                                </div>
                            </div>

                            {/* Search area */}
                            <div className="flex gap-2 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                    <Input
                                        placeholder={type === 'bank' ? "Search Banks" : "Search Crypto"}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="bg-white/5 border-none h-12 pl-12 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#10b981] text-sm font-bold"
                                    />
                                </div>
                            </div>

                            {search ? (
                                <div className="grid grid-cols-1 gap-3 pb-8">
                                    {(type === 'bank' ? filteredBanks : filteredCrypto).map((item: any, i) => (
                                        <button
                                            key={i}
                                            onClick={() => type === 'bank' ? handleSelectBank(item) : handleSelectCrypto(item)}
                                            className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/5 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2">
                                                    <img src={item.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-lg">{item.name}</p>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{type === 'bank' ? 'Nigeria' : item.symbol}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-700 group-hover:text-white transition-colors" size={20} />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-10 pb-20">
                                    {/* Section 1 */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Frequently Used {type === 'bank' ? 'Banks' : 'Coins'}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(type === 'bank' ? frequentlyUsed : CRYPTO_ASSETS.slice(0, 4)).map((item: any, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => type === 'bank' ? handleSelectBank(item) : handleSelectCrypto(item)}
                                                    className="bg-[#242628] hover:border-[#10b981]/30 p-4 rounded-2xl flex items-center gap-3 border border-white/5 transition-all"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={item.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="text-sm font-bold truncate">{type === 'bank' ? item.name.split(' ')[0] : item.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Section 2 */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Select From Popular Ones</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(type === 'bank' ? popularBanks : CRYPTO_ASSETS).map((item: any, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => type === 'bank' ? handleSelectBank(item) : handleSelectCrypto(item)}
                                                    className="bg-[#242628] hover:bg-[#2a2c2e] p-4 rounded-2xl flex items-center gap-4 border border-white/5 transition-all text-left"
                                                >
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                                                        <img src={item.logo} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="text-sm font-bold truncate">{item.name}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-6 pt-4">
                                        <button className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-full text-sm font-black text-slate-400 border border-white/5 transition-all">
                                            Add Account Manually +
                                        </button>

                                        <p className="text-xs font-bold text-slate-600">
                                            Struggling to find your bank? <span className="text-[#10b981] border-b border-[#10b981]">Contact Us</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col px-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="mb-8 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <img src={type === 'bank' ? selectedBank.logo : selectedCrypto.logo} className="w-10 h-10 object-contain" />
                                </div>
                                <h3 className="text-xl font-black mb-1 tracking-tight">
                                    Connect {type === 'bank' ? selectedBank.name : selectedCrypto.name}
                                </h3>
                                <p className="text-xs font-bold text-slate-500">
                                    {type === 'bank' ? 'Enter your Nigerian bank account details' : 'Enter your destination wallet address'}
                                </p>
                            </div>

                            <div className="space-y-5 flex-1">
                                {type === 'bank' ? (
                                    <>
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Account Number</Label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                                                <Input
                                                    placeholder="0123456789"
                                                    value={accountNumber}
                                                    onChange={(e) => setAccountNumber(e.target.value)}
                                                    className="bg-white/5 border-none h-14 pl-12 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#10b981] text-base font-black tracking-widest"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Account Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                                                <Input
                                                    placeholder="Full Account Name"
                                                    value={accountName}
                                                    onChange={(e) => setAccountName(e.target.value)}
                                                    className="bg-white/5 border-none h-14 pl-12 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#10b981] text-base font-bold"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Wallet Address</Label>
                                            <div className="relative">
                                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                                                <Input
                                                    placeholder="Paste address here"
                                                    value={walletAddress}
                                                    onChange={(e) => setWalletAddress(e.target.value)}
                                                    className="bg-white/5 border-none h-14 pl-12 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#10b981] text-xs font-bold font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Chain / Network</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedCrypto.chains.map((chain: string) => (
                                                    <button
                                                        key={chain}
                                                        onClick={() => setCryptoChain(chain)}
                                                        className={cn("p-3 rounded-2xl border text-[9px] font-black uppercase tracking-wider transition-all", cryptoChain === chain ? "bg-[#10b981] border-[#10b981] text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 border-white/5 text-slate-500")}
                                                    >
                                                        {chain}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={loading || (type === 'bank' ? !accountNumber || !accountName : !walletAddress || !cryptoChain)}
                                className="w-full h-14 bg-[#10b981] hover:bg-[#059669] text-white rounded-[20px] text-base font-black shadow-xl shadow-emerald-500/10 mb-6 active:scale-[0.98] transition-all"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Connect Now'}
                            </Button>
                        </div>
                    )
                    }
                </div >
            </DialogContent >
        </Dialog >
    );
};
