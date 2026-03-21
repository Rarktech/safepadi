"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { 
    ArrowLeft, 
    CheckCircle2, 
    XCircle, 
    ShieldCheck, 
    ShieldAlert,
    Clock, 
    Calendar, 
    MapPin, 
    Phone, 
    Mail, 
    User,
    FileText,
    ExternalLink,
    Loader2,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import AdminSidebar from "@/components/admin/Sidebar";

const API_URL = "/api";

export default function AdminKYCDetails() {
    const params = useParams();
    const router = useRouter();
    const [kyc, setKyc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const token = localStorage.getItem("safepadi_admin_token");
                const res = await axios.get(`${API_URL}/admin/kyc/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKyc(res.data);
            } catch (err) {
                console.error("Fetch KYC details failed:", err);
                toast.error("Failed to load submission details");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [params.id]);

    const handleAction = async (type: 'approve' | 'reject') => {
        setProcessing(true);
        try {
            const token = localStorage.getItem("safepadi_admin_token");
            await axios.post(`${API_URL}/admin/kyc/${params.id}/${type}`, { 
                reason: type === 'reject' ? rejectionReason : undefined 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(`KYC ${type === 'approve' ? 'Approved' : 'Rejected'} successfully`);
            setRejectDialogOpen(false);
            // Refresh
            const res = await axios.get(`${API_URL}/admin/kyc/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKyc(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Action failed");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            </div>
        );
    }

    if (!kyc) return <div className="p-8 text-slate-500">Submission not found.</div>;

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Top Nav/Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="ghost" 
                                onClick={() => router.back()} 
                                className="h-12 w-12 p-0 rounded-2xl bg-white border border-slate-100 shadow-sm hover:bg-slate-50 text-slate-900 transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-black text-[#020617] tracking-tighter uppercase leading-none mb-2">Review Submission</h1>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Submitted {new Date(kyc.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {kyc.status === 'PENDING' ? (
                                <>
                                    <Button 
                                        variant="ghost" 
                                        className="bg-white hover:bg-rose-50 text-rose-600 font-black rounded-2xl h-12 px-6 border border-slate-100"
                                        onClick={() => setRejectDialogOpen(true)}
                                        disabled={processing}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                    <Button 
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl h-12 px-8 shadow-xl shadow-emerald-500/20"
                                        onClick={() => handleAction('approve')}
                                        disabled={processing}
                                    >
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Approve Identity
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 pr-5">
                                     <StatusBadge status={kyc.status} />
                                     {kyc.status === 'REJECTED' && (
                                        <span className="text-[11px] text-rose-500 font-black uppercase tracking-tight">Reason: {kyc.rejection_reason}</span>
                                     )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Left Col: Info */}
                        <div className="lg:col-span-2 space-y-10">
                            
                            {/* Information Section */}
                            <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm ring-1 ring-slate-100">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center group">
                                    <h2 className="text-lg font-black text-[#020617] flex items-center gap-3 tracking-tight">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        Personal Particulars
                                    </h2>
                                    <Button variant="ghost" className="text-slate-300 hover:text-emerald-600 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-emerald-50">
                                        Edit Mapping
                                    </Button>
                                </div>
                                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                    <InfoField label="First Name" value={kyc.first_name || 'N/A'} icon={User} />
                                    <InfoField label="Last Name" value={kyc.last_name || 'N/A'} icon={User} />
                                    <InfoField label="Date of Birth" value={kyc.dob ? new Date(kyc.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'} icon={Calendar} />
                                    <InfoField label="Phone Connection" value={kyc.phone || 'N/A'} icon={Phone} />
                                    <div className="md:col-span-2 pt-2">
                                        <InfoField label="Residential Registry" value={`${kyc.address}, ${kyc.city}, ${kyc.state}, ${kyc.country}`} icon={MapPin} />
                                    </div>
                                </div>
                            </div>

                            {/* Identity Section */}
                            <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm ring-1 ring-slate-100">
                                <div className="p-8 border-b border-slate-50">
                                    <h2 className="text-lg font-black text-[#020617] flex items-center gap-3 tracking-tight">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        Identity Verification Data
                                    </h2>
                                </div>
                                <div className="p-10 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <InfoField label="Issuing Authority" value={kyc.document_country || 'N/A'} icon={MapPin} />
                                        <InfoField label="Method of Identification" value={kyc.nin ? 'NIN Digital Verification' : 'Physical ID (International Passport)'} icon={FileText} />
                                    </div>

                                    {kyc.nin && (
                                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 relative group mb-8">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">National Identity Number (NIN)</Label>
                                            <div className="text-4xl font-black text-[#020617] tracking-[0.2em]">
                                                {kyc.nin}
                                            </div>
                                            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-2 rounded-xl text-[10px] font-black uppercase">Direct DB Match</Badge>
                                            </div>
                                        </div>
                                    )}

                                    {(kyc.front_url || kyc.back_url) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                            <DocPreview label="Front ID Image" url={kyc.front_url} />
                                            <DocPreview label="Reverse ID Image" url={kyc.back_url} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Col: User context */}
                        <div className="space-y-10">
                            <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm ring-1 ring-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">System Profile</p>
                                <div className="center text-center space-y-6">
                                    <div className="relative inline-block">
                                        <div className="w-28 h-28 bg-slate-50 rounded-full border-4 border-white mx-auto flex items-center justify-center text-4xl font-black text-slate-900 shadow-xl overflow-hidden ring-1 ring-slate-100">
                                             <img 
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${kyc.profile?.safetag}&backgroundColor=f1f5f9`} 
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        </div>
                                        {kyc.status === 'APPROVED' && (
                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-lg">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-[#020617] tracking-tighter">{kyc.profile?.first_name} {kyc.profile?.last_name}</h3>
                                        <p className="text-emerald-600 font-black text-[11px] tracking-widest uppercase mt-1">{kyc.profile?.safetag}</p>
                                    </div>
                                </div>

                                <div className="mt-12 space-y-5 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                                    <ContextRow label="Platform Origin" value={kyc.profile?.primary_platform} icon={ShieldCheck} />
                                    <ContextRow label="Secure Access" value={kyc.profile?.email} icon={Mail} />
                                    <ContextRow label="Registry Date" value={new Date(kyc.profile?.created_at).toLocaleDateString()} icon={Calendar} />
                                </div>
                                
                                <div className="pt-10">
                                    <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 bg-white text-slate-900 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 shadow-sm">
                                        Inspect Transactional Graph <ExternalLink className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-rose-50 border border-rose-100 rounded-[40px] p-10 ring-1 ring-rose-100/50">
                                <h4 className="text-rose-600 font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                     <ShieldAlert className="w-4 h-4" /> Security Protocol
                                </h4>
                                <p className="text-slate-500 text-[11px] leading-relaxed mb-8 font-bold">
                                    Disapproving this submission will notify the user immediately and request corrective action.
                                </p>
                                <Button className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl h-14 border-none shadow-xl shadow-rose-200 uppercase text-[10px] tracking-widest">
                                    Flag & Blacklist User
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rejection Modal */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="bg-white border-none text-[#020617] rounded-[48px] p-0 overflow-hidden max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.1)]">
                        <div className="p-10 space-y-8">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black text-[#020617] tracking-tighter uppercase">Disapprove KYC</DialogTitle>
                                <DialogDescription className="text-slate-400 font-bold text-sm">
                                    This action will prompt the user to retake their verification. Be specific about the discrepancy found.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-rose-500">Official Rejection Reason</Label>
                                <Textarea 
                                    placeholder="e.g. Identity document expired or name mismatch detected..." 
                                    className="bg-slate-50 border-none min-h-[160px] rounded-3xl resize-none focus-visible:ring-rose-500/20 text-sm font-bold p-6"
                                    value={rejectionReason}
                                    onChange={(e: any) => setRejectionReason(e.target.value)}
                                />
                            </div>

                            <DialogFooter className="gap-3">
                                <Button variant="ghost" className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-[#020617]" onClick={() => setRejectDialogOpen(false)}>
                                    Discard Changes
                                </Button>
                                <Button 
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl h-14 px-10 shadow-xl shadow-rose-500/20 uppercase text-[10px] tracking-widest"
                                    disabled={!rejectionReason || processing}
                                    onClick={() => handleAction('reject')}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                    Finalise Rejection
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

function InfoField({ label, value, icon: Icon }: any) {
    return (
        <div className="space-y-4 group">
            <Label className="text-[10px] font-black text-slate-300 uppercase tracking-widest transition-colors group-hover:text-emerald-500 group-hover:opacity-100">{label}</Label>
            <div className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all group-hover:bg-white group-hover:shadow-md group-hover:border-emerald-100 group-hover:-translate-y-1">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-black text-[#020617]">{value}</span>
            </div>
        </div>
    );
}

function ContextRow({ label, value, icon: Icon }: any) {
    return (
        <div className="flex items-center justify-between py-1 px-1 border-b border-white/5 group">
            <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-black uppercase text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity tracking-widest">{label}</span>
            </div>
            <span className="text-[12px] font-black text-[#020617] tracking-tight">{value}</span>
        </div>
    );
}

function DocPreview({ label, url }: { label: string, url: string }) {
    return (
        <div className="space-y-4">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Label>
             <div className="relative group aspect-[3/2] rounded-[32px] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm transition-all hover:shadow-2xl">
                {url ? (
                    <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                        <FileText className="w-10 h-10" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Buffer Detected</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-[#020617]/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
                    <Button variant="ghost" className="text-white font-black text-[11px] uppercase tracking-widest bg-white/20 hover:bg-white/30 rounded-xl h-12 px-6">
                        <Eye className="w-4 h-4 mr-2" /> Inspect Asset
                    </Button>
                </div>
             </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDING":
            return (
                <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-none">
                    <Clock className="w-3.5 h-3.5 mr-2" /> Pending
                </Badge>
            );
        case "APPROVED":
            return (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-none">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verified
                </Badge>
            );
        case "REJECTED":
            return (
                <Badge className="bg-rose-50 text-rose-600 border-rose-100 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-none">
                    <XCircle className="w-3.5 h-3.5 mr-2" /> Flagged
                </Badge>
            );
        default:
            return <Badge variant="outline" className="px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest">{status}</Badge>;
    }
}
