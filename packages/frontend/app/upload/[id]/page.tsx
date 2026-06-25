'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    Upload,
    CheckCircle,
    FileText,
    X,
    ArrowRight,
    Shield,
    Loader2,
    CloudUpload,
} from 'lucide-react';
import axios from 'axios';
import { apiErrorMessage } from '@/lib/apiError';

interface UploadFile {
    file: File;
    id: string;
    name: string;
    displaySize: string;
    rawSize: number;
    progress: number;
    status: 'pending' | 'uploading' | 'done';
}

interface Milestone {
    id: string;
    index_num: number;
    title: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'RELEASED' | 'DISPUTED';
}

interface Txn {
    product_name: string;
    total_amount: number;
    currency: string;
    txn_code: string;
    status: string;
    transaction_type?: 'ONE_TIME' | 'MILESTONE';
    milestones?: Milestone[];
    buyer?: { safetag?: string };
}

const API_URL = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`)
    : 'http://localhost:3000/api';

const CHECKLIST = [
    'Photos or videos of the item being packed and shipped',
    'Courier receipt or tracking information',
    'For services — screenshots, exported files, or a work summary',
    'Any signed agreements or delivery notes',
];

function formatAmount(amount: number, currency: string) {
    if (currency === 'USDT' || currency === 'BTC') return `${amount} ${currency}`;
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
        return `${amount} ${currency}`;
    }
}

function UploadPageContent() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const [step, setStep] = useState(1);
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [txn, setTxn] = useState<Txn | null>(null);
    const [loadingTxn, setLoadingTxn] = useState(true);
    const [scanningFiles, setScanningFiles] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTxn = async () => {
            try {
                const res = await axios.get(`${API_URL}/transactions/${id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                setTxn(res.data);

                if (res.data.transaction_type === 'MILESTONE' && res.data.milestones?.length) {
                    const sorted = [...res.data.milestones].sort((a: Milestone, b: Milestone) => a.index_num - b.index_num);
                    const fromUrl = searchParams.get('milestone_id');
                    const validFromUrl = fromUrl && sorted.find((m) => m.id === fromUrl && m.status !== 'RELEASED');
                    const nextPending = sorted.find((m) => m.status !== 'RELEASED');
                    setSelectedMilestoneId(validFromUrl ? fromUrl : (nextPending?.id ?? null));
                }
            } catch (err) {
                console.error('Failed to fetch txn:', err);
            } finally {
                setLoadingTxn(false);
            }
        };
        if (id) fetchTxn();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const isMilestone = txn?.transaction_type === 'MILESTONE';
    const sortedMilestones = [...(txn?.milestones || [])].sort((a, b) => a.index_num - b.index_num);
    const selectableMilestones = sortedMilestones.filter((m) => m.status !== 'RELEASED');
    const selectedMilestone = sortedMilestones.find((m) => m.id === selectedMilestoneId) || null;

    const handleFileChange = (fileList: FileList | null) => {
        if (!fileList) return;
        const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
            file,
            id: Math.random().toString(36).substring(7),
            name: file.name,
            displaySize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            rawSize: file.size,
            progress: 0,
            status: 'pending',
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (fileId: string) => {
        setFiles(files.filter(f => f.id !== fileId));
    };

    const startUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);

        try {
            const updatedFiles = [...files];

            if (files.length > 1) {
                setScanningFiles(true);
                await new Promise(r => setTimeout(r, 1000));
                setScanningFiles(false);
            }

            for (let i = 0; i < updatedFiles.length; i++) {
                updatedFiles[i].status = 'uploading';
                setFiles([...updatedFiles]);

                for (let p = 0; p <= 100; p += 10) {
                    updatedFiles[i].progress = p;
                    setFiles([...updatedFiles]);
                    await new Promise(r => setTimeout(r, 80));
                }
                updatedFiles[i].status = 'done';
                setFiles([...updatedFiles]);
            }

            const formData = new FormData();
            files.forEach(f => formData.append('files', f.file));
            if (isMilestone && selectedMilestoneId) formData.append('milestone_id', selectedMilestoneId);

            await axios.post(`${API_URL}/transactions/${id}/upload-proof-files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
            });

            setSuccess(true);
            setTimeout(() => setStep(3), 1500);
        } catch (err) {
            console.error('❌ Upload failed:', err);
            alert(`Upload failed: ${apiErrorMessage(err, 'Please try again.')}`);
        } finally {
            setUploading(false);
        }
    };

    if (loadingTxn) {
        return (
            <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            </div>
        );
    }

    const nextDisabled = uploading || scanningFiles || (step === 2 && !success && files.length === 0);
    const nextLabel = scanningFiles ? 'Scanning...' : step === 1 ? 'Continue' : step === 2 ? (uploading ? 'Uploading…' : 'Upload files') : 'Done';

    const handleHeaderNext = () => {
        if (step === 1) { setStep(2); return; }
        if (step === 2 && !success) { startUpload(); return; }
        setStep((s) => Math.min(3, s + 1));
    };

    return (
        <div className="min-h-screen bg-[#F7F7F5] flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-[#e9eaec] px-6 h-[60px] flex items-center justify-between sticky top-0 z-50">
                <img src="/logo-main.svg" alt="Safeeely" className="h-[22px]" />

                <div className="hidden sm:flex items-center gap-1.5">
                    <StepPill number={1} label="Info" active={step === 1} completed={step > 1} />
                    <div className="w-6 h-px bg-[#e2e8f0]" />
                    <StepPill number={2} label="Upload files" active={step === 2} completed={step > 2} />
                    <div className="w-6 h-px bg-[#e2e8f0]" />
                    <StepPill number={3} label="Done" active={step === 3} completed={false} />
                </div>

                <div className="sm:hidden">
                    <span className="text-[11px] font-bold text-[#94a3b8]">Step {step} of 3</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        disabled={step === 1 || success}
                        className="hidden sm:inline-flex h-11 px-[18px] rounded-full border border-[#e9eaec] text-[#64748b] text-[13px] font-semibold bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleHeaderNext}
                        disabled={nextDisabled || step === 3}
                        className="h-10 px-5 rounded-full bg-[#0f172a] text-white text-[13px] font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {(uploading || scanningFiles) && <Loader2 size={14} className="animate-spin" />}
                        {nextLabel}
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-[720px] w-full mx-auto px-5 pt-7 pb-[100px]">

                {step === 1 && txn && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h1 className="font-['Inter_Tight',sans-serif] text-[26px] font-black text-[#0f172a] tracking-[-.03em] mb-1.5">Upload delivery proof</h1>
                        <p className="text-[13.5px] text-[#64748b] font-normal mb-6">Share evidence of your completed delivery so funds can be released.</p>

                        <div className="bg-white rounded-[20px] border border-[#e9eaec] overflow-hidden mb-4">
                            <div className="px-[22px] py-5 border-b border-[#f3f4f6]">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10.5px] font-bold text-[#94a3b8] tracking-[.05em]">TRANSACTION</span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10.5px] font-bold bg-[#eff6ff] text-[#2563eb]">{(txn.status || '').replace(/_/g, ' ')}</span>
                                </div>
                                <h2 className="font-['Inter_Tight',sans-serif] text-[20px] font-extrabold text-[#0f172a] mt-1">{txn.product_name}</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3">
                                <div className="px-[18px] py-3.5 border-b sm:border-b-0 sm:border-r border-[#f3f4f6]">
                                    <p className="text-[10.5px] font-semibold text-[#94a3b8] mb-1">{isMilestone && selectedMilestone ? 'Phase Amount' : 'Amount'}</p>
                                    <p className="font-['Inter_Tight',sans-serif] text-[17px] font-extrabold text-[#0f172a]">{formatAmount(isMilestone && selectedMilestone ? selectedMilestone.amount : txn.total_amount, txn.currency)}</p>
                                </div>
                                <div className="px-[18px] py-3.5 border-b sm:border-b-0 sm:border-r border-[#f3f4f6]">
                                    <p className="text-[10.5px] font-semibold text-[#94a3b8] mb-1">Buyer</p>
                                    <p className="text-[13px] font-bold text-[#0f172a]">{txn.buyer?.safetag}</p>
                                </div>
                                <div className="px-[18px] py-3.5">
                                    <p className="text-[10.5px] font-semibold text-[#94a3b8] mb-1">Transaction ID</p>
                                    <code className="text-[11.5px] font-bold text-[#475569] tracking-[.02em] break-all">{txn.txn_code}</code>
                                </div>
                            </div>
                        </div>

                        {isMilestone && selectableMilestones.length > 0 && (
                            <div className="bg-white rounded-[20px] border border-[#e9eaec] px-[22px] py-5 mb-4">
                                <p className="text-[13px] font-extrabold text-[#0f172a] mb-1">Which phase is this proof for?</p>
                                <p className="text-[12px] text-[#64748b] mb-3.5">Select the milestone you&apos;re submitting delivery proof for.</p>
                                <div className="flex flex-col gap-2">
                                    {selectableMilestones.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedMilestoneId(m.id)}
                                            className={`text-left px-4 py-3 rounded-2xl border transition-colors ${selectedMilestoneId === m.id ? 'border-[#10b981] bg-[#10b981]/[0.06]' : 'border-[#e9eaec] hover:border-[#cbd5e1]'}`}
                                        >
                                            <p className="text-[13px] font-bold text-[#0f172a]">Phase {m.index_num}: {m.title}</p>
                                            <p className="text-[11.5px] text-[#64748b] mt-0.5">{formatAmount(m.amount, txn.currency)} · {m.status === 'COMPLETED' ? 'Already marked complete' : 'Pending'}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-[20px] border border-[#e9eaec] px-[22px] py-5 mb-4">
                            <p className="text-[13px] font-extrabold text-[#0f172a] mb-3.5">What to include in your proof</p>
                            <div className="flex flex-col gap-2.5">
                                {CHECKLIST.map((item) => (
                                    <div key={item} className="flex items-start gap-2.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-[#f0fdf4] flex items-center justify-center flex-shrink-0 mt-px">
                                            <CheckCircle size={11} className="text-[#16a34a]" />
                                        </div>
                                        <p className="text-[12.5px] text-[#475569] font-medium leading-[1.5]">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 px-5 py-4 bg-[#eff6ff] rounded-2xl border border-[#dbeafe]">
                            <div className="w-[34px] h-[34px] rounded-[9px] bg-[#dbeafe] flex items-center justify-center flex-shrink-0">
                                <Shield size={15} className="text-[#2563eb]" />
                            </div>
                            <div>
                                <p className="text-[12.5px] font-bold text-[#1e40af] mb-0.5">Escrow protected</p>
                                <p className="text-[11.5px] text-[#3b82f6] font-normal leading-[1.5]">Files are encrypted and stored securely. The buyer will be notified to review and release funds once you submit.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="sm:hidden flex items-center justify-center gap-2 w-full h-[52px] mt-5 bg-[#10b981] text-white rounded-full font-bold text-[14px] shadow-[0_4px_18px_rgba(16,185,129,0.28)]"
                        >
                            Continue to upload
                            <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                {step === 2 && !success && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h1 className="font-['Inter_Tight',sans-serif] text-[26px] font-black text-[#0f172a] tracking-[-.03em] mb-1.5">Upload your files</h1>
                        <p className="text-[13.5px] text-[#64748b] mb-[22px]">All file types supported — images, videos, documents, archives</p>

                        <div
                            className={`border-2 border-dashed rounded-[20px] p-12 text-center cursor-pointer mb-[18px] transition-colors ${dragOver ? 'border-[#10b981] bg-[#10b981]/[0.04] border-solid' : 'border-[#e2e8f0] hover:border-[#10b981] hover:bg-[#10b981]/[0.04]'}`}
                            onClick={() => document.getElementById('proof-file-input')?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
                        >
                            <input id="proof-file-input" type="file" multiple accept="*" className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
                            <div className="w-14 h-14 rounded-2xl bg-[#f7f8f9] border border-[#e9eaec] flex items-center justify-center mx-auto mb-4">
                                <CloudUpload size={22} className="text-[#94a3b8]" />
                            </div>
                            <p className="font-['Inter_Tight',sans-serif] text-[16px] font-extrabold text-[#0f172a] mb-1">Drop files here or click to browse</p>
                            <p className="text-[12px] text-[#94a3b8] font-normal">Images, videos, PDFs, ZIP, PSD, docs — any format</p>
                        </div>

                        {files.length > 0 && (
                            <div className="mb-[18px]">
                                <div className="flex items-center justify-between mb-2.5">
                                    <h3 className="text-[10.5px] font-bold text-[#94a3b8] uppercase tracking-wide">Files ready ({files.length})</h3>
                                    {scanningFiles && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748b] animate-pulse">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Scanning local files...
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                                    {files.map((file) => (
                                        <div key={file.id} className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-[#e9eaec] bg-white hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-shadow">
                                            <div className="w-10 h-10 bg-[#f7f8f9] rounded-xl border border-[#e9eaec] flex items-center justify-center shrink-0">
                                                <FileText size={18} className={file.status === 'done' ? 'text-[#16a34a]' : 'text-[#94a3b8]'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-[13px] font-bold text-[#0f172a] truncate">{file.name}</p>
                                                    <span className="text-[11px] font-bold text-[#94a3b8] ml-2 flex-shrink-0">{file.displaySize}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-1 flex-1 rounded-full bg-[#f1f5f9] overflow-hidden">
                                                        <div className="h-full rounded-full bg-[#10b981] transition-[width] duration-150" style={{ width: `${file.progress}%` }} />
                                                    </div>
                                                    {file.status === 'done' ? (
                                                        <CheckCircle size={15} className="text-[#16a34a] shrink-0" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-[#94a3b8] w-8 text-right">{file.progress}%</span>
                                                    )}
                                                </div>
                                            </div>
                                            {file.status === 'pending' && (
                                                <button onClick={() => removeFile(file.id)} className="p-2 hover:bg-red-50 rounded-xl text-[#cbd5e1] hover:text-red-500 transition-colors shrink-0">
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={startUpload}
                            disabled={uploading || scanningFiles || files.length === 0}
                            className="sm:hidden flex items-center justify-center gap-2 w-full h-[52px] bg-[#0f172a] text-white rounded-full font-bold text-[14px] disabled:opacity-40"
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : `Upload ${files.length} file${files.length === 1 ? '' : 's'}`}
                        </button>
                    </div>
                )}

                {step === 2 && success && (
                    <div className="py-24 text-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-[#10b981] rounded-full flex items-center justify-center mx-auto mb-7 shadow-[0_8px_28px_rgba(16,185,129,0.28)]">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[26px] font-extrabold text-[#0f172a] tracking-tight mb-2">Upload confirmed!</h2>
                        <p className="text-[13px] text-[#94a3b8] font-bold uppercase tracking-widest animate-pulse">Taking you to the summary…</p>
                    </div>
                )}

                {step === 3 && txn && (
                    <div className="py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-[#ecfdf5] rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-6">
                            <Upload className="w-9 h-9 text-[#10b981] -rotate-6" />
                        </div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[32px] font-black text-[#0f172a] tracking-tight mb-4">Delivery secured!</h2>
                        <p className="text-[14px] text-[#64748b] max-w-md mx-auto mb-10 font-medium leading-relaxed">
                            {isMilestone && selectedMilestone ? (
                                <>Your proof for <span className="text-[#0f172a] font-bold">Phase {selectedMilestone.index_num} — {selectedMilestone.title}</span> of <span className="text-[#0f172a] font-bold">{txn.product_name}</span> has been submitted. The buyer has been notified to review and release this phase.</>
                            ) : (
                                <>Your proof for <span className="text-[#0f172a] font-bold">{txn.product_name}</span> has been submitted. The buyer has been notified to review and release funds.</>
                            )}
                        </p>

                        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-10">
                            <div className="bg-white rounded-2xl p-4 text-left border border-[#e9eaec]">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Status</p>
                                <p className="text-[13px] font-bold text-[#16a34a]">Success</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 text-left border border-[#e9eaec]">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Files uploaded</p>
                                <p className="text-[13px] font-bold text-[#0f172a]">{files.length}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 text-left border border-[#e9eaec]">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Transaction ID</p>
                                <p className="text-[13px] font-bold text-[#0f172a] break-all">{txn.txn_code}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 text-left border border-[#e9eaec]">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Amount in escrow</p>
                                <p className="text-[13px] font-bold text-[#0f172a]">{formatAmount(txn.total_amount, txn.currency)}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.close()}
                            className="bg-[#0f172a] text-white font-bold px-9 h-14 rounded-2xl hover:opacity-90 transition-opacity flex items-center gap-2.5 mx-auto text-[14px]"
                        >
                            Finish and close
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function SecureUploadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            </div>
        }>
            <UploadPageContent />
        </Suspense>
    );
}

function StepPill({ number, label, active, completed }: { number: number; label: string; active?: boolean; completed?: boolean }) {
    const bg = completed ? 'bg-[#f0fdf4] text-[#16a34a]' : active ? 'bg-[#0f172a] text-white' : 'bg-[#f7f8f9] text-[#94a3b8]';
    const dotBg = completed ? 'bg-[#16a34a] text-white' : active ? 'bg-white text-[#0f172a]' : 'bg-[#e2e8f0] text-[#94a3b8]';
    return (
        <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold ${bg}`}>
            <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold ${dotBg}`}>
                {completed ? '✓' : number}
            </div>
            {label}
        </div>
    );
}
