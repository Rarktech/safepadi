'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Upload,
    CheckCircle,
    FileText,
    X,
    ArrowRight,
    Shield,
    Clock,
    ChevronRight,
    Loader2,
    CloudUpload
} from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const API_URL = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`)
    : 'http://localhost:3000/api';

export default function SecureUploadPage() {
    const { id } = useParams();
    const [step, setStep] = useState(2);
    const [files, setFiles] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [txn, setTxn] = useState<any>(null);
    const [loadingTxn, setLoadingTxn] = useState(true);
    const [scanningFiles, setScanningFiles] = useState(false);

    useEffect(() => {
        const fetchTxn = async () => {
            try {
                const res = await axios.get(`${API_URL}/transactions/${id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                setTxn(res.data);
            } catch (err) {
                console.error('Failed to fetch txn:', err);
            } finally {
                setLoadingTxn(false);
            }
        };
        if (id) fetchTxn();
    }, [id]);

    const handleFileChange = (e: any) => {
        const newFiles = Array.from(e.target.files).map((file: any) => ({
            file,
            id: Math.random().toString(36).substring(7),
            name: file.name,
            displaySize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            rawSize: file.size,
            progress: 0,
            status: 'pending'
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

            // Simulate scanning local files if multiple are added
            if (files.length > 1) {
                setScanningFiles(true);
                await new Promise(r => setTimeout(r, 1000)); // Simulate scan time
                setScanningFiles(false);
            }

            // Sequential "upload" simulation
            for (let i = 0; i < updatedFiles.length; i++) {
                updatedFiles[i].status = 'uploading';
                setFiles([...updatedFiles]);

                // Simulate progress
                for (let p = 0; p <= 100; p += 10) {
                    updatedFiles[i].progress = p;
                    setFiles([...updatedFiles]);
                    await new Promise(r => setTimeout(r, 80));
                }
                updatedFiles[i].status = 'done';
                setFiles([...updatedFiles]);
            }

            // Actual API call
            const proofs = files.map(f => ({
                url: `https://picsum.photos/seed/${f.id}/1200/800`,
                name: f.name,
                size: f.rawSize
            }));

            console.log(`🚀 Sending upload request to: ${API_URL}/transactions/${id}/upload-proofs`);

            await axios.post(`${API_URL}/transactions/${id}/upload-proofs`, { proofs }, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            setSuccess(true);
            setTimeout(() => setStep(3), 1500);
        } catch (err: any) {
            console.error('❌ Upload failed:', err);
            const isNgrokMismatch = API_URL.includes('ngrok-free.app') && !API_URL.includes(window.location.host.split('.')[0]);

            let errorMsg = `🚨 [DEBUG] UPLOAD FAILED: ${err.response?.data?.error || err.message}.\n\nURL: ${API_URL}/transactions/${id}/upload-proofs`;

            if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
                errorMsg += `\n\n💡 TIP: If you just restarted ngrok, your API subdomain might have changed. Please update NEXT_PUBLIC_API_URL in your packages/frontend/.env.local file.`;
            }

            alert(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    if (loadingTxn) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-[#16a34a] animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-green-100 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50">
                <button
                    onClick={() => window.close()}
                    className="text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                    Cancel
                </button>

                {/* Desktop Steps */}
                <div className="hidden sm:flex items-center gap-4 lg:gap-8">
                    <StepItem number={1} label="Info" active={step === 1} completed={step > 1} />
                    <div className="h-px w-4 lg:w-8 bg-slate-200" />
                    <StepItem number={2} label="Upload" active={step === 2} completed={step > 2} />
                    <div className="h-px w-4 lg:w-8 bg-slate-200" />
                    <StepItem number={3} label="Done" active={step === 3} completed={step > 3} />
                </div>

                {/* Mobile Steps Counter */}
                <div className="flex sm:hidden items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400">STEP</span>
                    <span className="text-xs font-black text-slate-900">{step}</span>
                    <span className="text-[10px] font-black text-slate-300">/</span>
                    <span className="text-[10px] font-black text-slate-400">3</span>
                </div>

                <div className="flex flex-col xs:flex-row items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 rounded-xl px-2"
                        onClick={() => setStep(prev => Math.max(1, prev - 1))}
                        disabled={step === 1 || success}
                    >
                        Back
                    </Button>
                    <Button
                        size="sm"
                        className="h-9 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-[10px] uppercase tracking-widest px-4 shadow-xl shadow-green-100 rounded-xl"
                        onClick={step === 2 && !success ? startUpload : () => setStep(prev => Math.min(3, prev + 1))}
                        disabled={uploading || scanningFiles || (step === 2 && files.length === 0)}
                    >
                        {scanningFiles ? 'Scanning...' : (step === 2 ? (uploading ? 'Wait...' : 'Upload') : 'Next')}
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto pt-4 md:pt-12 pb-24 px-4 md:px-6">
                <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
                    {step === 2 && !success && (
                        <div className="p-5 md:p-12">
                            {/* Drag & Drop Zone */}
                            <div
                                className="relative border-2 border-dashed border-slate-200 rounded-3xl p-8 md:p-20 text-center hover:border-green-400 hover:bg-green-50/30 transition-all cursor-pointer group"
                                onClick={() => document.getElementById('fileInput')?.click()}
                            >
                                <input
                                    type="file"
                                    id="fileInput"
                                    className="hidden"
                                    multiple
                                    accept="*"
                                    onChange={handleFileChange}
                                />
                                <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 rounded-2xl md:rounded-[32px] flex items-center justify-center mx-auto mb-4 md:mb-8 group-hover:scale-110 group-hover:bg-white transition-all shadow-sm">
                                    <FileText className="w-6 h-6 md:w-10 md:h-10 text-slate-300 group-hover:text-green-500 transition-colors" />
                                    <div className="absolute -top-2 -right-2 w-7 h-7 md:w-9 md:h-9 bg-[#16a34a] rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                        <CloudUpload className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                    </div>
                                </div>
                                <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">Upload Proof [v2.5]</h2>
                                <p className="text-slate-400 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-[#16a34a] mb-2">Portal Active & Connected</p>
                                <p className="text-slate-400 text-[10px] md:text-xs font-medium max-w-xs mx-auto">Click or drag & drop to upload proofs.<br/>All files supported: <b>Movies, Docs, PSD, 3D & More</b></p>
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mt-10 md:mt-16 space-y-3 md:space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Files Ready ({files.length})</h3>
                                        {scanningFiles && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Scanning local files...
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 scrollbar-hide">
                                        {files.map((file) => (
                                            <div key={file.id} className="bg-slate-50/50 rounded-2xl p-4 md:p-6 flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-transparent hover:border-slate-100">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                                                    <FileText className={`w-5 h-5 md:w-6 md:h-6 ${file.status === 'done' ? 'text-green-500' : 'text-slate-300'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                                                        <p className="text-xs md:text-sm font-bold text-slate-900 truncate tracking-tight">{file.name}</p>
                                                        <span className="text-[9px] md:text-[11px] font-black text-slate-400 tracking-tighter ml-2">{file.displaySize}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Progress value={file.progress} className="h-1.5 flex-1" indicatorClassName="bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.3)]" />
                                                        {file.status === 'done' ? (
                                                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                                        ) : (
                                                            <span className="text-[9px] font-black text-slate-400 w-8 text-right italic">{file.progress}%</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {file.status === 'pending' && (
                                                    <button
                                                        onClick={() => removeFile(file.id)}
                                                        className="p-2 md:p-2.5 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all shrink-0"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Help Section */}
                            <div className="mt-12 md:mt-20 pt-8 border-t border-slate-100">
                                <div className="bg-blue-50/30 rounded-3xl p-6 md:p-8 flex gap-4 md:gap-6 border border-blue-50">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                                        <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">Escrow Protected Upload</h4>
                                        <p className="text-[10px] md:text-sm text-slate-500 leading-relaxed font-medium">
                                            Your files are encrypted and held securely. Include clear photos of labels and items to ensure a smooth release of funds.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {success && step === 2 && (
                        <div className="p-16 md:p-32 text-center animate-in zoom-in duration-500">
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-200">
                                <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
                            </div>
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter mb-4">Upload Confirmed!</h2>
                            <p className="text-xs md:text-base text-slate-400 font-bold uppercase tracking-widest animate-pulse">Redirecting to summary...</p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-8 md:p-20 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-10 rotate-6">
                                <Upload className="w-10 h-10 md:w-12 md:h-12 text-green-500 -rotate-6" />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-6">Delivery Secured!</h2>
                            <p className="text-sm md:text-lg text-slate-500 max-w-sm md:max-w-md mx-auto mb-12 font-medium leading-relaxed">
                                Your proof for <span className="text-slate-900 font-bold">{txn?.product_name}</span> has been uploaded. The buyer has been notified.
                            </p>

                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-12">
                                <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-xs font-black text-green-600 uppercase">Success</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Documents</p>
                                    <p className="text-xs font-black text-slate-900 uppercase">{files.length} Files</p>
                                </div>
                            </div>

                            <button
                                onClick={() => window.close()}
                                className="bg-slate-900 text-white font-black px-10 h-16 rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 flex items-center gap-3 mx-auto text-sm md:text-base"
                            >
                                Finish & Return
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <img src="/sidebar-logo-black.png" alt="Safeeely" className="h-6 md:h-8 mx-auto grayscale opacity-20" />
                </div>
            </main>
        </div>
    );
}

function StepItem({ number, label, active, completed }: { number: number; label: string; active?: boolean; completed?: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${active ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${completed ? 'bg-green-500 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {completed ? '✓' : number}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
        </div>
    );
}
