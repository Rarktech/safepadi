'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Plus, X, Search, Loader2, CheckCircle, AlertTriangle, Trash2, Check
} from 'lucide-react';
import api from '@/lib/api';
import { NIGERIAN_BANKS, INTERNATIONAL_BANKS, CRYPTO_ASSETS } from '@/lib/constants/payout-data';

const AddPayoutMethodModal = ({
    isOpen, onClose, safetag, onSaved,
}: { isOpen: boolean; onClose: () => void; safetag: string; onSaved: () => void }) => {
    const [type, setType] = useState<'bank' | 'crypto'>('bank');
    const [search, setSearch] = useState('');
    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifiedName, setVerifiedName] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
    const [cryptoChain, setCryptoChain] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [saving, setSaving] = useState(false);

    const isInternational = !!selectedBank && INTERNATIONAL_BANKS.some(b => b.code === selectedBank.code);

    const reset = () => {
        setType('bank'); setSearch(''); setSelectedBank(null); setAccountNumber('');
        setAccountHolderName(''); setVerifiedName(''); setVerifyError('');
        setSelectedCrypto(null); setCryptoChain(''); setWalletAddress('');
    };

    useEffect(() => { if (!isOpen) reset(); }, [isOpen]);

    useEffect(() => {
        if (!selectedBank || isInternational || accountNumber.length !== 10) {
            setVerifiedName(''); setVerifyError('');
            return;
        }
        let cancelled = false;
        (async () => {
            setVerifying(true); setVerifiedName(''); setVerifyError('');
            try {
                const res = await api.post(`/profiles/${safetag}/verify-bank-account`, {
                    bankCode: selectedBank.code, accountNumber,
                });
                if (!cancelled) setVerifiedName(res.data.accountName);
            } catch (err: any) {
                if (!cancelled) setVerifyError(err.response?.data?.error || 'Account not found — please check the number');
            } finally {
                if (!cancelled) setVerifying(false);
            }
        })();
        return () => { cancelled = true; };
    }, [accountNumber, selectedBank, isInternational, safetag]);

    const canSave = type === 'bank'
        ? (selectedBank && (isInternational
            ? accountNumber.trim().length > 0 && accountHolderName.trim().length > 0
            : accountNumber.length === 10 && !!verifiedName))
        : (selectedCrypto && cryptoChain && walletAddress.length >= 20);

    const handleSave = async () => {
        setSaving(true);
        try {
            const details = type === 'bank'
                ? {
                    bank_id: selectedBank.code,
                    bankCode: selectedBank.code,
                    bank_name: selectedBank.name,
                    account_number: accountNumber,
                    account_name: isInternational ? accountHolderName : verifiedName,
                    verifiedAccountName: isInternational ? accountHolderName : verifiedName,
                    verified: !isInternational,
                    logo: selectedBank.logo,
                }
                : {
                    asset: selectedCrypto.name,
                    symbol: selectedCrypto.symbol,
                    chain: cryptoChain,
                    address: walletAddress,
                    logo: selectedCrypto.logo,
                };
            await api.post(`/profiles/${safetag}/payout-methods`, { type, details });
            toast.success('Payout account added');
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to add account');
        } finally {
            setSaving(false);
        }
    };

    const filteredBanks = search
        ? NIGERIAN_BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
        : NIGERIAN_BANKS;
    const filteredIntl = search
        ? INTERNATIONAL_BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
        : INTERNATIONAL_BANKS;
    const filteredCrypto = search
        ? CRYPTO_ASSETS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase()))
        : CRYPTO_ASSETS;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-0 bg-white border-none rounded-[28px] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="sr-only">
                    <DialogTitle>Add payout account</DialogTitle>
                    <DialogDescription>Connect a bank account or crypto wallet to receive withdrawals.</DialogDescription>
                </DialogHeader>

                <div className="p-6 pb-4 flex items-center justify-between flex-shrink-0">
                    <h3 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[#0f172a] tracking-[-.01em]">Add account</h3>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#f7f8f9] flex items-center justify-center">
                        <X size={16} className="text-[#64748b]" />
                    </button>
                </div>

                <div className="px-6 pb-2 flex gap-2 flex-shrink-0">
                    {(['bank', 'crypto'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => { setType(t); setSearch(''); }}
                            className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all"
                            style={type === t ? { background: '#0f172a', color: '#fff' } : { background: '#f1f5f9', color: '#64748b' }}
                        >
                            {t === 'bank' ? 'Bank' : 'Crypto'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {type === 'bank' && !selectedBank && (
                        <>
                            <div className="flex items-center gap-2 bg-[#f7f8f9] border border-[#e9eaec] rounded-[10px] px-3.5 py-2.5 mb-3">
                                <Search size={13} className="text-[#94a3b8] flex-shrink-0" />
                                <input
                                    placeholder="Search banks…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[13px] font-medium text-[#0f172a] w-full"
                                />
                            </div>
                            <div className="max-h-[320px] overflow-y-auto">
                                {filteredBanks.map(bank => (
                                    <button
                                        key={bank.slug}
                                        onClick={() => { setSelectedBank(bank); setAccountNumber(''); setVerifiedName(''); }}
                                        className="w-full flex items-center gap-2.5 px-2 py-2.5 hover:bg-[#f8f9fa] rounded-lg transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                            <img src={bank.logo} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-[13px] font-semibold text-[#0f172a]">{bank.name}</span>
                                    </button>
                                ))}
                                {filteredIntl.length > 0 && (
                                    <>
                                        <p className="px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#b0bac6]">International banks</p>
                                        {filteredIntl.map(bank => (
                                            <button
                                                key={bank.slug}
                                                onClick={() => { setSelectedBank(bank); setAccountNumber(''); setVerifiedName(''); }}
                                                className="w-full flex items-center gap-2.5 px-2 py-2.5 hover:bg-[#f8f9fa] rounded-lg transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                                    <img src={bank.logo} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-[13px] font-semibold text-[#0f172a]">{bank.name}</span>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {type === 'bank' && selectedBank && (
                        <div>
                            <div className="flex items-center gap-2.5 mb-3.5">
                                <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                    <img src={selectedBank.logo} className="w-full h-full object-contain" />
                                </div>
                                <p className="text-[13px] font-bold text-[#0f172a] flex-1">{selectedBank.name}</p>
                                <button onClick={() => { setSelectedBank(null); setAccountNumber(''); setVerifiedName(''); }} className="text-[#94a3b8] flex-shrink-0">
                                    <X size={14} />
                                </button>
                            </div>

                            <Label className="text-[11.5px] font-semibold text-[#64748b] mb-1.5 block">{isInternational ? 'Account number / IBAN' : 'Account number'}</Label>
                            <Input
                                placeholder={isInternational ? 'Account number or IBAN' : '10-digit number'}
                                value={accountNumber}
                                maxLength={isInternational ? 34 : 10}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setAccountNumber(isInternational ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : raw.replace(/\D/g, ''));
                                    setVerifiedName(''); setVerifyError('');
                                }}
                                className="h-[48px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 font-bold tracking-wide"
                            />

                            {isInternational ? (
                                <div className="mt-3.5">
                                    <Label className="text-[11.5px] font-semibold text-[#64748b] mb-1.5 block">Account holder name</Label>
                                    <Input
                                        placeholder="Full name on account"
                                        value={accountHolderName}
                                        onChange={(e) => setAccountHolderName(e.target.value)}
                                        className="h-[48px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 font-bold"
                                    />
                                    <div className="flex items-start gap-2 mt-3 p-3 bg-[#fffbeb] border border-[#fde68a] rounded-[10px]">
                                        <AlertTriangle size={14} className="text-[#d97706] flex-shrink-0 mt-0.5" />
                                        <p className="text-[11px] font-semibold text-[#92400e] leading-snug">International accounts can&apos;t be auto-verified — double-check the details.</p>
                                    </div>
                                </div>
                            ) : accountNumber.length === 10 && (
                                <div className="mt-3">
                                    {verifying && (
                                        <div className="flex items-center gap-2.5 p-3 bg-[#eff6ff] rounded-[10px]">
                                            <Loader2 size={15} className="animate-spin text-[#2563eb]" />
                                            <span className="text-[12px] font-semibold text-[#2563eb]">Verifying account…</span>
                                        </div>
                                    )}
                                    {verifiedName && !verifying && (
                                        <div className="flex items-center gap-2.5 p-3 bg-[#f0fdf4] rounded-[10px] border border-[#bbf7d0]">
                                            <CheckCircle size={15} className="text-[#16a34a] shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-bold text-[#166534] uppercase tracking-wide">Account verified</p>
                                                <p className="text-[13px] font-bold text-[#0f172a] mt-0.5">{verifiedName}</p>
                                            </div>
                                        </div>
                                    )}
                                    {verifyError && !verifying && (
                                        <div className="flex items-center gap-2.5 p-3 bg-[#fff1f2] rounded-[10px] border border-[#fecdd3]">
                                            <X size={15} className="text-[#e11d48] shrink-0" />
                                            <p className="text-[12px] font-semibold text-[#e11d48]">{verifyError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {type === 'crypto' && !selectedCrypto && (
                        <>
                            <div className="flex items-center gap-2 bg-[#f7f8f9] border border-[#e9eaec] rounded-[10px] px-3.5 py-2.5 mb-3">
                                <Search size={13} className="text-[#94a3b8] flex-shrink-0" />
                                <input
                                    placeholder="Search coins…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[13px] font-medium text-[#0f172a] w-full"
                                />
                            </div>
                            <div className="max-h-[320px] overflow-y-auto">
                                {filteredCrypto.map(asset => (
                                    <button
                                        key={asset.symbol}
                                        onClick={() => { setSelectedCrypto(asset); setCryptoChain(asset.chains[0]); }}
                                        className="w-full flex items-center gap-2.5 px-2 py-2.5 hover:bg-[#f8f9fa] rounded-lg transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                            <img src={asset.logo} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-semibold text-[#0f172a]">{asset.name}</span>
                                            <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{asset.symbol}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {type === 'crypto' && selectedCrypto && (
                        <div>
                            <div className="flex items-center gap-2.5 mb-3.5">
                                <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-[#e9eaec] flex items-center justify-center p-1 flex-shrink-0">
                                    <img src={selectedCrypto.logo} className="w-full h-full object-contain" />
                                </div>
                                <p className="text-[13px] font-bold text-[#0f172a] flex-1">{selectedCrypto.name}</p>
                                <button onClick={() => setSelectedCrypto(null)} className="text-[#94a3b8] flex-shrink-0"><X size={14} /></button>
                            </div>

                            <Label className="text-[11.5px] font-semibold text-[#64748b] mb-1.5 block">Select network</Label>
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

                            <Label className="text-[11.5px] font-semibold text-[#64748b] mb-1.5 block">Wallet address</Label>
                            <Input
                                placeholder="Paste address here"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                className="h-[48px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 font-bold text-xs font-mono"
                            />
                        </div>
                    )}
                </div>

                <div className="p-6 pt-3 border-t border-[#f1f5f9] flex-shrink-0">
                    <Button
                        onClick={handleSave}
                        disabled={!canSave || saving || verifying}
                        className="w-full h-12 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full font-bold text-sm disabled:opacity-50"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save account'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const PayoutAccountsSection = ({ safetag }: { safetag: string }) => {
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const fetchMethods = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/profiles/${safetag}/payout-methods`);
            setMethods(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('❌ Failed to fetch payout methods:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (safetag) fetchMethods(); }, [safetag]);

    const setPrimary = async (id: string) => {
        try {
            await api.patch(`/profiles/${safetag}/payout-methods/${id}`, { is_default: true });
            setMethods(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
            toast.success('Primary account updated');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to set primary account');
        }
    };

    const remove = async (id: string) => {
        try {
            await api.delete(`/profiles/${safetag}/payout-methods/${id}`);
            setMethods(prev => prev.filter(m => m.id !== id));
            toast.success('Account removed');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to remove account');
        }
    };

    return (
        <div className="bg-white border border-[#e9eaec] rounded-[18px] p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.2}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                    </div>
                    <div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Payout accounts</h2>
                        <p className="text-[11.5px] text-[#94a3b8] mt-px">Set your primary withdrawal destination</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-[#f0fdf4] text-[#16a34a] font-bold text-xs"
                >
                    <Plus size={12} />
                    Add account
                </button>
            </div>

            {loading ? (
                <div className="space-y-2.5">
                    {[1, 2].map(i => <div key={i} className="h-[60px] bg-slate-50 animate-pulse rounded-[13px]" />)}
                </div>
            ) : methods.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                    {methods.map((m) => {
                        const name = m.type === 'bank' ? m.details.bank_name : (m.details.symbol || 'Wallet');
                        const initials = (name || '??').slice(0, 2).toUpperCase();
                        const detail = m.type === 'bank'
                            ? `${String(m.details.account_number || '').slice(0, 3)}****${String(m.details.account_number || '').slice(-3)} · ${m.details.account_name || ''}`
                            : `${String(m.details.address || '').slice(0, 6)}...${String(m.details.address || '').slice(-4)}`;
                        return (
                            <div
                                key={m.id}
                                onClick={() => !m.is_default && setPrimary(m.id)}
                                className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[13px] border-[1.5px] cursor-pointer transition-colors"
                                style={m.is_default ? { borderColor: '#0f172a', background: '#f8fafc' } : { borderColor: '#f1f5f9', background: '#fafafa' }}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] flex items-center justify-center flex-shrink-0">
                                        <span className="font-['Inter_Tight',sans-serif] text-[13px] font-black text-[#0f172a]">{initials}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-[13.5px] font-bold text-[#0f172a] truncate">{name}</p>
                                            {m.is_default && (
                                                <span className="bg-[#0f172a] text-white text-[9.5px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0">Primary</span>
                                            )}
                                        </div>
                                        <p className="text-[11.5px] text-[#94a3b8] truncate">{detail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {m.is_default ? (
                                        <div className="w-[22px] h-[22px] rounded-full bg-[#0f172a] flex items-center justify-center">
                                            <Check size={11} className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-[22px] h-[22px] rounded-full border-2 border-[#e2e8f0]" />
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                                        className="w-[30px] h-[30px] rounded-lg border border-[#fecdd3] bg-[#fff1f2] flex items-center justify-center"
                                    >
                                        <Trash2 size={12} className="text-[#e11d48]" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <p className="text-[13px] font-bold text-[#0f172a]">No payout accounts yet</p>
                    <p className="text-[11.5px] text-[#94a3b8]">Add a bank or crypto wallet to receive withdrawals.</p>
                </div>
            )}

            <AddPayoutMethodModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                safetag={safetag}
                onSaved={fetchMethods}
            />
        </div>
    );
};
