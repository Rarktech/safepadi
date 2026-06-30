'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Shield,
    Clock,
    User,
    Zap,
    MessageSquare,
    History,
    Activity,
    AlertCircle,
    FileText,
    Download,
    ChevronDown,
    Paperclip,
    Mic,
    Send,
    Settings,
    BadgePercent,
    Wallet,
    RotateCcw,
    Info,
    CheckCircle2,
    Type,
    Smile,
    Play,
    Pause,
    Users,
    UserCheck,
    BookOpen,
    RefreshCw,
    Lock,
    ChevronRight,
    X
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// Audio Player Component
const AudioPlayer = ({ url, isSelf }: { url: string; isSelf: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl border min-w-[200px]",
            isSelf ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100"
        )}>
            <audio 
                ref={audioRef} 
                src={url} 
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                    }
                }}
                onEnded={() => setIsPlaying(false)}
            />
            <button 
                onClick={togglePlay}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-95",
                    isSelf ? "bg-white text-emerald-500" : "bg-emerald-500 text-white"
                )}
            >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="flex-1 h-1.5 bg-slate-200/50 rounded-full overflow-hidden relative">
                <div 
                    className={cn("absolute inset-y-0 left-0 transition-all duration-300", isSelf ? "bg-white" : "bg-emerald-500")}
                    style={{ width: `${progress}%` }}
                />
            </div>
            {isPlaying && <Activity className={cn("w-3 h-3 animate-pulse", isSelf ? "text-white" : "text-emerald-500")} />}
        </div>
    );
};

export default function AdminDisputePage() {
    const { id } = useParams();
    const router = useRouter();
    const [dispute, setDispute] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [selectedIdentity, setSelectedIdentity] = useState('Administrator');
    const [activeTab, setActiveTab] = useState<'conversation' | 'logs'>('conversation');
    const [splitMode, setSplitMode] = useState(false);
    const [buyerSplit, setBuyerSplit] = useState(50);
    const [restrictedTo, setRestrictedTo] = useState<'ALL' | 'BUYER' | 'SELLER'>('ALL');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [hasAdminJoined, setHasAdminJoined] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [sops, setSops] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [availableAdmins, setAvailableAdmins] = useState<any[]>([]);
    const [showReassign, setShowReassign] = useState(false);
    const [reassignAdminId, setReassignAdminId] = useState('');
    const [reassignReason, setReassignReason] = useState('');
    const [reassignLoading, setReassignLoading] = useState(false);
    const [sopExpanded, setSopExpanded] = useState<string | null>(null);

    const identities = ['Administrator', 'System Support', 'Escrow Agent'];

    useEffect(() => {
        fetchDisputeData();
        const interval = setInterval(fetchDisputeData, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const fetchDisputeData = async () => {
        try {
            const res = await api.get(`/admin/disputes/${id}`);
            setDispute(res.data);
            const msgRes = await api.get(`/disputes/${id}/messages`);
            const msgs = msgRes.data;
            setMessages(msgs);
            
            // Correctly determine if admin is currently in the session
            // Look for the last join/leave announcement
            const lifecycleMsgs = msgs.filter((m: any) => 
                m.content.includes('[ADMIN_JOINED:') || m.content.includes('[ADMIN_LEFT:')
            );
            
            if (lifecycleMsgs.length > 0) {
                const lastMsg = lifecycleMsgs[lifecycleMsgs.length - 1];
                setHasAdminJoined(lastMsg.content.includes('[ADMIN_JOINED:'));
            } else {
                setHasAdminJoined(false);
            }

            if (res.data.restricted_to) {
                setRestrictedTo(res.data.restricted_to);
            }
            
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch data');
        }
    };

    const handleSendMessage = async (forcedContent?: string, metadata: any = {}) => {
        const content = forcedContent || message;
        if (!content.trim() && attachments.length === 0) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            sender_id: 'SYSTEM_ADMIN',
            sender_type: 'ADMIN' as const,
            content: content,
            attachments: attachments,
            created_at: new Date().toISOString(),
            metadata: {
                ...metadata,
                identity: selectedIdentity,
                isOptimistic: true
            }
        };

        // Optimistically add to UI
        if (metadata.type !== 'restriction_signal') {
            setMessages(prev => [...prev, optimisticMsg]);
        }

        try {
            const payload = {
                sender_id: 'SYSTEM_ADMIN',
                sender_type: 'ADMIN',
                content: content,
                attachments: attachments,
                metadata: {
                    ...metadata,
                    identity: selectedIdentity
                }
            };

            const res = await api.post(`/disputes/${id}/messages`, payload);
            
            // Replace optimistic message with actual one
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== tempId);
                if (filtered.some(m => m.id === res.data.id)) return filtered;
                return [...filtered, res.data];
            });

            if (!forcedContent) {
                setMessage('');
                setAttachments([]);
            }
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            toast.error('Failed to send message');
        }
    };

    const handleJoinChat = async () => {
        try {
            const joinContent = `[ADMIN_JOINED:${selectedIdentity}]`;
            const res = await api.post(`/disputes/${id}/messages`, {
                sender_id: 'SYSTEM_ADMIN',
                sender_type: 'ADMIN',
                content: joinContent,
                metadata: { type: 'join_announcement', identity: selectedIdentity }
            });
            
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setHasAdminJoined(true);
            
            // Trigger social notification
            try {
                await api.post(`/disputes/${id}/notify-join`, { admin_name: selectedIdentity });
            } catch (e) {
                console.error('Social notification failed');
            }
            
            toast.success(`Joined as ${selectedIdentity}`);
        } catch (err) {
            toast.error('Failed to join chat');
        }
    };

    const handleLeaveChat = async () => {
        if (!window.confirm("Are you sure you want to leave this chat session? Communication features will be disabled until you join again.")) return;
        
        try {
            const leaveContent = `[ADMIN_LEFT:${selectedIdentity}]`;
            const res = await api.post(`/disputes/${id}/messages`, {
                sender_id: 'SYSTEM_ADMIN',
                sender_type: 'ADMIN',
                content: leaveContent,
                metadata: { type: 'leave_announcement' }
            });
            
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setHasAdminJoined(false);

            // Trigger social notification for leaving
            try {
                await api.post(`/disputes/${id}/notify-leave`, { admin_name: selectedIdentity });
            } catch (e) {
                console.error('Leave notification failed');
            }

            toast.info('You have left the chat session');
        } catch (err) {
            toast.error('Failed to leave chat');
        }
    };

    const handleRestrictChat = async (target: 'ALL' | 'BUYER' | 'SELLER') => {
        try {
            await api.post(`/disputes/${id}/restrict`, { restricted_to: target });
            setRestrictedTo(target);
            
            // Send signal message
            const label = target === 'ALL' ? 'Both parties' : (target === 'BUYER' ? 'Buyer' : 'Seller');
            const statusLine = target === 'ALL' ? 'Both parties can chat now' : `Only ${label} can chat now`;
            
            await handleSendMessage(`[SIGNAL:RESTRICT:${target}]`, { 
                type: 'restriction_signal', 
                target,
                admin_label: statusLine
            });

            toast.success(`Chat restricted to ${label}`);
        } catch (err) {
            toast.error('Failed to update chat restrictions');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('files', file));

        try {
            const res = await api.post(`/disputes/${id}/upload`, formData);
            setAttachments(prev => [...prev, ...res.data]);
            toast.success('Files uploaded');
        } catch (err) {
            toast.error('Upload failed');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('files', file);

                try {
                    const res = await api.post(`/disputes/${id}/upload`, formData);
                    const audioUrl = res.data[0].url;
                    await handleSendMessage(`[Voice Recording:${audioUrl}]`, { type: 'voice_note', audioUrl });
                } catch (err) {
                    toast.error('Failed to upload voice note');
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    useEffect(() => {
        if (dispute?.dispute_type) {
            fetchSopsAndAssignments(dispute.dispute_type);
        }
    }, [dispute?.dispute_type]);

    useEffect(() => {
        if (showReassign && availableAdmins.length === 0) {
            api.get('/admin/management/workload').then(r => setAvailableAdmins(r.data || [])).catch(() => {});
        }
    }, [showReassign]);

    const fetchSopsAndAssignments = async (disputeType: string) => {
        try {
            const [sopsRes, assignRes] = await Promise.all([
                api.get(`/admin/disputes/sops?dispute_type=${disputeType}&status=ACTIVE`),
                api.get(`/admin/disputes/${id}/assignments`),
            ]);
            setSops(sopsRes.data || []);
            setAssignments(assignRes.data || []);
        } catch {}
    };

    const applySopToChat = async (sop: any) => {
        if (sop.severity === 'HARD_GATE' && !sop.human_approved) {
            toast.error('This SOP requires human approval before applying');
            return;
        }
        if (!hasAdminJoined) {
            toast.error('Join the chat first to apply an SOP');
            return;
        }
        try {
            const content = `**[SOP: ${sop.sop_code}] ${sop.title}**\n\n${sop.rule_body}`;
            const res = await api.post(`/disputes/${id}/messages`, {
                sender_id: 'SYSTEM_ADMIN',
                sender_type: 'ADMIN',
                content,
                attachments: [],
                metadata: { identity: 'System Support', type: 'sop_applied', sop_id: sop.id }
            });
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            toast.success(`SOP ${sop.sop_code} applied to chat`);
        } catch {
            toast.error('Failed to apply SOP');
        }
    };

    const reassignSpecialist = async () => {
        if (!reassignAdminId) { toast.error('Select a specialist'); return; }
        setReassignLoading(true);
        try {
            await api.patch(`/admin/disputes/${id}/assign`, {
                admin_id: reassignAdminId,
                reason: reassignReason || 'MANUAL_REASSIGN',
            });
            toast.success('Specialist reassigned');
            setShowReassign(false);
            setReassignAdminId('');
            setReassignReason('');
            fetchDisputeData();
            if (dispute?.dispute_type) fetchSopsAndAssignments(dispute.dispute_type);
        } catch {
            toast.error('Reassignment failed');
        } finally {
            setReassignLoading(false);
        }
    };

    // What's actually still in escrow — for MILESTONE transactions this excludes
    // phases already RELEASED to the seller, which are final and not reopened by
    // this dispute. For ONE_TIME this is just the full amount.
    const remainingEscrow = (txn: any): number => {
        const total = Number(txn?.amount) || 0;
        if (txn?.transaction_type !== 'MILESTONE' || !Array.isArray(txn?.milestones)) return total;
        const released = txn.milestones
            .filter((m: any) => m.status === 'RELEASED')
            .reduce((sum: number, m: any) => sum + Number(m.amount), 0);
        return Math.max(0, total - released);
    };

    const resolveDispute = async (type: string) => {
        try {
            const payload: any = { resolution_type: type };
            if (type === 'SPLIT') {
                const remaining = remainingEscrow(dispute.transaction);
                payload.buyer_amount = (remaining * buyerSplit) / 100;
                payload.seller_amount = (remaining * (100 - buyerSplit)) / 100;
            }
            if (type === 'REFUND_AFTER_RETURN') {
                payload.return_deadline_hours = 72;
            }
            await api.post(`/disputes/${id}/resolve`, payload);
            toast.success('Dispute resolved');
            router.refresh();
        } catch (err) {
            toast.error('Resolution failed');
        }
    };

    const renderMessageContent = (msg: any, isSelf: boolean) => {
        const voiceMatch = msg.content.match(/\[Voice Recording:(.*?)\]/);
        if (voiceMatch) {
            return <AudioPlayer url={voiceMatch[1]} isSelf={isSelf} />;
        }
        const cleanContent = msg.content.replace(/\[ADMIN_MSG:.*?\]/g, '').replace(/\[ADMIN_JOINED:.*?\]/g, '').replace(/\[ADMIN_LEFT:.*?\]/g, '').trim();
        return (
            <div className="markdown-content">
                <ReactMarkdown>
                    {cleanContent || (msg.attachments?.length > 0 ? "Shared attachments" : "")}
                </ReactMarkdown>
            </div>
        );
    };

    if (loading || !dispute) {
        return (
            <div className="h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Shield className="w-12 h-12 text-emerald-500 animate-pulse" />
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Establishing Link...</p>
                </div>
            </div>
        );
    }

    const { transaction: txn } = dispute;

    return (
        <div className="h-screen bg-white flex overflow-hidden font-sans selection:bg-emerald-100">
            {/* Sidebar: Navigation */}
            <div className="w-20 bg-[#0f172a] flex flex-col items-center py-8 gap-10 shrink-0 border-r border-white/5">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2.5">
                    <img src="/logo-main.svg" alt="Safeeely" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col gap-6">
                    <button onClick={() => router.push('/admin/dashboard')} className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white transition-all">
                        <Activity className="w-6 h-6" />
                    </button>
                    <button className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <MessageSquare className="w-6 h-6" />
                    </button>
                    <button className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white transition-all">
                        <Clock className="w-6 h-6" />
                    </button>
                </div>
                <div className="mt-auto">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl border border-white/10" />
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header with Tabs */}
                <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Case Mediation</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{dispute.id.slice(0, 8)}</p>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-slate-100" />

                        <nav className="flex gap-1">
                            <button 
                                onClick={() => setActiveTab('conversation')}
                                className={cn(
                                    "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === 'conversation' ? "bg-[#0f172a] text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                Conversation
                            </button>
                            <button 
                                onClick={() => setActiveTab('logs')}
                                className={cn(
                                    "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === 'logs' ? "bg-[#0f172a] text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                Transaction Logs
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 mr-4">
                            {[
                                { id: 'BUYER', label: 'Buyer', icon: User },
                                { id: 'ALL', label: 'Both', icon: Users },
                                { id: 'SELLER', label: 'Seller', icon: User }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleRestrictChat(opt.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        restrictedTo === opt.id 
                                            ? "bg-white text-emerald-500 shadow-sm" 
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <opt.icon className="w-3.5 h-3.5" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setSplitMode(!splitMode)}
                            className={cn(
                                "h-11 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center",
                                splitMode ? "bg-rose-500 text-white" : "bg-[#0f172a] text-white hover:bg-slate-800"
                            )}
                        >
                            <BadgePercent className="w-4 h-4 mr-2" />
                            {splitMode ? 'Close Settlement' : 'Initialize Settlement'}
                        </button>
                        <div className="h-6 w-px bg-slate-100 mx-2" />
                        <div className="flex -space-x-3">
                            {[txn.buyer, txn.seller].map((user: any, i: number) => (
                                <div key={i} className="w-9 h-9 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm overflow-hidden">
                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                                </div>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-slate-100" />
                        <button className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {activeTab === 'conversation' ? (
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden relative">
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-10">
                                {/* Timeline Start */}
                                <div className="relative flex justify-center py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-100" />
                                    </div>
                                    <span className="relative bg-white/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-100 shadow-sm">
                                        Case Protocol Initiated • {new Date(dispute.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {messages.map((msg: any) => {
                                    const isSystem = msg.sender_type === 'AI';
                                    const isRestrictedSignal = msg.metadata?.type === 'restriction_signal';

                                    if (isRestrictedSignal) {
                                        return (
                                            <div key={msg.id} className="relative flex justify-center py-8 items-center">
                                                <div className="absolute inset-0 flex items-center px-8">
                                                    <div className="w-full border-t border-slate-100" />
                                                </div>
                                                <div className="relative bg-transparent px-4 flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-400/80 uppercase tracking-[0.2em] whitespace-nowrap bg-white px-4">
                                                        {msg.metadata.admin_label || `Chat restricted to ${msg.metadata.target}`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const isSelf = msg.sender_type === 'ADMIN' || (msg.sender_type === 'USER' && (msg.sender_id === null || msg.content.includes('[ADMIN_MSG:')));
                                    
                                    // System markers should be centered dividers with lines
                                    if (msg.content.includes('[ADMIN_JOINED:') || msg.content.includes('[ADMIN_LEFT:')) {
                                        const type = msg.content.includes('[ADMIN_JOINED:') ? 'JOINED' : 'LEFT';
                                        const nameMatch = msg.content.match(/\[ADMIN_(?:JOINED|LEFT):(.*?)\]/);
                                        const name = nameMatch ? nameMatch[1] : 'Administrator';
                                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                                        
                                        return (
                                            <div key={msg.id} className="relative flex justify-center py-8 items-center">
                                                <div className="absolute inset-0 flex items-center px-8">
                                                    <div className="w-full border-t border-slate-100" />
                                                </div>
                                                <div className="relative bg-transparent px-4 flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-400/80 uppercase tracking-[0.2em] whitespace-nowrap bg-white px-4">
                                                        {time} • {name} {type}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const profile = isSystem ? { safetag: 'Mediator AI', avatar: null } : (msg.sender_id === txn.buyer_id ? txn.buyer : txn.seller);

                                    return (
                                        <div key={msg.id} className={cn("flex gap-4 group", isSelf && "flex-row-reverse")}>
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                                                isSystem ? "bg-[#0f172a] text-emerald-400" : (isSelf ? "bg-emerald-500 text-white" : "bg-white text-slate-400")
                                            )}>
                                                {isSystem ? <Zap className="w-5 h-5 fill-current" /> : (isSelf ? <User className="w-5 h-5" /> : <User className="w-5 h-5" />)}
                                            </div>
                                            <div className={cn("max-w-[80%] flex flex-col", isSelf && "items-end")}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase">
                                                        {isSelf ? selectedIdentity : (isSystem ? 'Mediator AI' : profile?.safetag)}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-300">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "p-5 rounded-[24px] text-sm leading-relaxed shadow-sm",
                                                    isSystem ? "bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800" : 
                                                    (isSelf ? "bg-emerald-500 text-white rounded-tr-none" : "bg-white text-slate-600 rounded-tl-none border border-slate-100")
                                                )}>
                                                    {renderMessageContent(msg, isSelf)}

                                                    {msg.attachments?.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-black/5 grid grid-cols-2 gap-2">
                                                            {msg.attachments.map((at: any, i: number) => (
                                                                <div key={i} className="group relative">
                                                                    {at.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                                        <div className="aspect-video rounded-xl overflow-hidden border border-black/5 shadow-sm relative">
                                                                            <img src={at.url} alt={at.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <a href={at.url} target="_blank" className="text-[10px] font-bold text-white uppercase tracking-widest bg-emerald-500 px-3 py-1 rounded-full">View</a>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 text-[10px] font-bold bg-black/5 p-2 rounded-xl">
                                                                            <FileText className="w-3 h-3" />
                                                                            <span className="truncate flex-1">{at.name}</span>
                                                                            <a href={at.url} target="_blank" className="text-emerald-500 hover:underline">View</a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Chat Input */}
                        {dispute.status === 'OPEN' && (
                            <footer className="p-8 border-t border-slate-100 bg-white shrink-0">
                                {splitMode && (
                                    <div className="mb-6 bg-slate-50 p-6 rounded-[28px] border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <BadgePercent className="w-4 h-4 text-emerald-500" /> Settlement Configuration
                                            </h4>
                                            <button onClick={() => setSplitMode(false)} className="text-[10px] font-bold text-slate-400 hover:text-rose-500">Cancel</button>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-4">
                                            Splitting {remainingEscrow(txn).toLocaleString()} {txn.currency} still in escrow{txn.transaction_type === 'MILESTONE' ? ' (already-released phases are excluded)' : ''}
                                        </p>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Buyer (Refund)</p>
                                                    <p className="text-xl font-black text-slate-900">{buyerSplit}%</p>
                                                </div>
                                                <div className="flex-1 mx-10">
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={buyerSplit} 
                                                        onChange={(e) => setBuyerSplit(Number(e.target.value))}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Seller (Payout)</p>
                                                    <p className="text-xl font-black text-slate-900">{100 - buyerSplit}%</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 flex-wrap">
                                                <button onClick={() => resolveDispute('REFUND_BUYER')} className="flex-1 rounded-2xl h-12 border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase transition-colors">100% Refund Buyer</button>
                                                <button onClick={() => resolveDispute('PAY_SELLER')} className="flex-1 rounded-2xl h-12 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black text-[10px] uppercase transition-colors">100% Pay Seller</button>
                                                <button onClick={() => resolveDispute('SPLIT')} className="flex-[1.5] rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-100 transition-colors">Confirm Split Settlement</button>
                                                <button onClick={() => resolveDispute('REFUND_AFTER_RETURN')} className="flex-1 rounded-2xl h-12 border border-amber-200 text-amber-600 hover:bg-amber-50 font-black text-[10px] uppercase transition-colors">🔄 Refund After Return</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col group focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all">
                                    <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <select 
                                                    value={selectedIdentity}
                                                    onChange={(e) => setSelectedIdentity(e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    disabled={hasAdminJoined}
                                                >
                                                    {identities.map(id => <option key={id} value={id}>{id}</option>)}
                                                </select>
                                                <div className={cn(
                                                    "bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 transition-all",
                                                    !hasAdminJoined ? "hover:bg-slate-50" : "opacity-60"
                                                )}>
                                                    <User className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-700">{selectedIdentity}</span>
                                                    {!hasAdminJoined && <ChevronDown className="w-3 h-3 text-slate-400" />}
                                                </div>
                                            </div>
                                            
                                            {!hasAdminJoined && (
                                                <button
                                                    onClick={handleJoinChat}
                                                    className="h-9 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 animate-in fade-in slide-in-from-left-2 transition-colors"
                                                >
                                                    Join Chat
                                                </button>
                                            )}
                                        </div>
                                        
                                        {hasAdminJoined && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Liaison</span>
                                            </div>
                                        )}
                                    </div>

                                    {attachments.length > 0 && (
                                        <div className="px-8 py-4 bg-slate-50 flex gap-4 overflow-x-auto border-b border-slate-100">
                                            {attachments.map((at, i) => (
                                                <div key={i} className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[10px] font-bold truncate max-w-[100px]">{at.name}</span>
                                                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 p-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative">
                                        <textarea 
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder={hasAdminJoined ? "Type your message..." : "You must join the chat to send messages"}
                                            className={cn(
                                                "w-full px-8 py-6 text-sm font-medium text-slate-600 bg-transparent outline-none resize-none min-h-[120px] transition-all",
                                                !hasAdminJoined && "opacity-40 cursor-not-allowed"
                                            )}
                                            disabled={!hasAdminJoined}
                                        />
                                        {!hasAdminJoined && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[1px] pointer-events-none" />
                                        )}
                                    </div>

                                    <div className="px-8 py-4 flex items-center justify-between border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                                            <button 
                                                onClick={() => fileInputRef.current?.click()} 
                                                disabled={!hasAdminJoined}
                                                className={cn(
                                                    "w-8 h-8 flex items-center justify-center transition-colors",
                                                    hasAdminJoined ? "text-slate-400 hover:text-slate-900" : "text-slate-200 cursor-not-allowed"
                                                )}
                                            >
                                                <Paperclip className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={isRecording ? stopRecording : startRecording} 
                                                disabled={!hasAdminJoined}
                                                className={cn(
                                                    "w-8 h-8 flex items-center justify-center transition-colors rounded-full", 
                                                    isRecording ? "bg-rose-500 text-white" : (hasAdminJoined ? "text-slate-400 hover:text-slate-900" : "text-slate-200 cursor-not-allowed")
                                                )}
                                            >
                                                <Mic className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {hasAdminJoined && (
                                                <button 
                                                    onClick={handleLeaveChat}
                                                    className="text-[11px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                                                >
                                                    Leave Chat
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleSendMessage()}
                                                disabled={!hasAdminJoined || (!message.trim() && attachments.length === 0)}
                                                className="px-8 h-12 bg-[#0f172a] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </footer>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-12">
                            {/* Summary Card */}
                            <div className="bg-[#0f172a] p-10 rounded-[48px] text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-12 opacity-10">
                                    <Activity className="w-48 h-48 text-emerald-400" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight">Case Timeline</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Duration</p>
                                            <p className="text-2xl font-black">{Math.floor((new Date().getTime() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24))} Days</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Interactions</p>
                                            <p className="text-2xl font-black">{messages.length} Events</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-4">
                                {[
                                    { 
                                        time: dispute.created_at, 
                                        event: "Dispute Opened", 
                                        desc: "Buyer initiated the dispute mediation protocol.",
                                        icon: AlertCircle,
                                        color: "bg-rose-500"
                                    },
                                    ...messages.filter((m: any) => m.sender_type === 'USER').map((m: any) => ({
                                        time: m.created_at,
                                        event: m.sender_id === txn.buyer_id ? "Buyer Response" : (m.sender_id === txn.seller_id ? "Seller Response" : "Admin Note"),
                                        desc: m.content.length > 50 ? m.content.substring(0, 50) + "..." : m.content,
                                        icon: m.sender_id === txn.buyer_id ? User : (m.sender_id === txn.seller_id ? User : Shield),
                                        color: m.sender_id === txn.buyer_id ? "bg-blue-500" : (m.sender_id === txn.seller_id ? "bg-slate-900" : "bg-emerald-500")
                                    }))
                                ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((item, idx) => (
                                    <div key={idx} className="group relative pl-10 pb-8 last:pb-0">
                                        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-100 group-last:hidden" />
                                        <div className={cn("absolute left-0 top-0 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 z-10", item.color)}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group-hover:border-emerald-200 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{item.event}</h4>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(item.time).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Assignment History */}
                            {assignments.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">Assignment History</h3>
                                    <div className="space-y-3">
                                        {assignments.map((a: any, idx: number) => (
                                            <div key={a.id || idx} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-start gap-4">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                                    a.assigned_to ? "bg-indigo-100" : "bg-slate-100"
                                                )}>
                                                    <UserCheck className={cn("w-4 h-4", a.assigned_to ? "text-indigo-600" : "text-slate-400")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black text-slate-900">
                                                        {a.assigned_to_name || a.assigned_to || 'Unassigned'}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                        {a.reason?.replace(/_/g, ' ')}{a.assigned_by_name ? ` · by ${a.assigned_by_name}` : ' · System Auto-Route'}
                                                    </p>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-300 shrink-0 whitespace-nowrap">{new Date(a.assigned_at).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Area: Transaction Story */}
            <div className="w-[400px] bg-slate-50 flex flex-col h-full overflow-y-auto shrink-0 hidden xl:flex border-l border-slate-100">
                <div className="p-8 space-y-8">

                    {/* Specialist Assignment Panel */}
                    {dispute.is_ai_paused && (
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                                    <UserCheck className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-black text-slate-900">Assigned Specialist</span>
                            </div>
                            {dispute.metadata?.assigned_specialist ? (
                                <>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-black text-slate-900">{dispute.metadata.assigned_specialist.name}</p>
                                            {dispute.metadata.assigned_specialist.specialist_title && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                    {dispute.metadata.assigned_specialist.specialist_title}
                                                </p>
                                            )}
                                        </div>
                                        {dispute.metadata.assigned_specialist.specialties?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {dispute.metadata.assigned_specialist.specialties.map((s: string) => (
                                                    <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                        {s.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-6 pt-1">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase">Resolved</p>
                                                <p className="text-base font-black text-slate-900">{dispute.metadata.assigned_specialist.cases_resolved}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase">Years</p>
                                                <p className="text-base font-black text-slate-900">{dispute.metadata.assigned_specialist.years_on_platform}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowReassign(true)}
                                        className="mt-4 w-full h-9 rounded-xl border border-indigo-200 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Reassign
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <AlertCircle className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">No specialist assigned</p>
                                    <button
                                        onClick={() => setShowReassign(true)}
                                        className="h-9 px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                                    >
                                        Assign Specialist
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SOP Guidance Panel */}
                    {sops.length > 0 && (
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-sm font-black text-slate-900">SOP Guidance</span>
                                <span className="ml-auto text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sops.length}</span>
                            </div>
                            <div className="space-y-3">
                                {sops.map((sop: any) => {
                                    const isHardGate = sop.severity === 'HARD_GATE';
                                    const isBinding = sop.severity === 'BINDING';
                                    const containerStyle = isHardGate ? 'bg-rose-50 border-rose-200' : isBinding ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
                                    const codeStyle = isHardGate ? 'text-rose-700' : isBinding ? 'text-amber-700' : 'text-blue-700';
                                    const isExpanded = sopExpanded === sop.id;
                                    return (
                                        <div key={sop.id} className={cn('rounded-2xl border p-4', containerStyle)}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className={cn('text-[9px] font-black uppercase tracking-wider', codeStyle)}>{sop.sop_code}</span>
                                                        {isHardGate && <Lock className="w-3 h-3 text-rose-500" />}
                                                    </div>
                                                    <p className="text-[11px] font-black text-slate-800 leading-tight">{sop.title}</p>
                                                </div>
                                                <button
                                                    onClick={() => setSopExpanded(isExpanded ? null : sop.id)}
                                                    className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
                                                >
                                                    <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
                                                </button>
                                            </div>
                                            {isExpanded && (
                                                <>
                                                    <p className="mt-3 text-[10px] text-slate-600 leading-relaxed font-medium border-t border-black/5 pt-3">{sop.rule_body}</p>
                                                    <button
                                                        onClick={() => applySopToChat(sop)}
                                                        className="mt-3 w-full h-8 rounded-xl bg-[#0f172a] text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors"
                                                    >
                                                        Apply to Chat
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                    <Wallet className="w-4 h-4" />
                                </div>
                                <span className="text-xl font-black text-slate-900 tracking-tight">Escrow Locked</span>
                            </div>
                             <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Transaction ID</span>
                                    <span className="text-slate-900">#{txn.id.slice(0, 12)}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{txn.total_amount} <span className="text-xl text-slate-400 tracking-normal">{txn.currency}</span></p>
                                {txn.transaction_type === 'MILESTONE' && Array.isArray(txn.milestones) && (
                                    <p className="text-[10px] font-bold text-slate-400 mt-2">
                                        {(txn.milestones.filter((m: any) => m.status === 'RELEASED').reduce((s: number, m: any) => s + Number(m.amount), 0)).toLocaleString()} {txn.currency} already released to seller · {remainingEscrow(txn).toLocaleString()} {txn.currency} remaining in escrow
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {dispute.milestone_id && Array.isArray(txn.milestones) && (() => {
                        const flagged = txn.milestones.find((m: any) => m.id === dispute.milestone_id);
                        if (!flagged) return null;
                        return (
                            <div className="p-5 bg-rose-50 rounded-[28px] border border-rose-200">
                                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Flagged Phase</p>
                                <p className="text-sm font-black text-slate-900">{flagged.title}</p>
                                <p className="text-xs text-rose-600 font-medium mt-1">{flagged.amount} {txn.currency} · {flagged.status}</p>
                            </div>
                        );
                    })()}

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Product Details</h4>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Name</p>
                                <p className="text-sm font-black text-slate-900">{txn.product_name}</p>
                            </div>

                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1 mt-6">Participants</h4>
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Buyer</p>
                                    <p className="text-sm font-black text-slate-900">@{txn.buyer.safetag}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Seller</p>
                                    <p className="text-sm font-black text-slate-900">@{txn.seller.safetag}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(txn.status === 'RETURN_PENDING' || dispute.verdict_action === 'REFUND_AFTER_RETURN') && (
                        <div className="p-5 bg-amber-50 rounded-[28px] border border-amber-200">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Return In Progress</p>
                            <p className="text-xs text-amber-600 font-medium leading-relaxed">
                                Buyer must ship goods back to seller before refund is issued.
                            </p>
                            {dispute.metadata?.buyer_shipped_at && (
                                <p className="text-[9px] text-amber-500 font-bold mt-2">
                                    📦 Buyer shipped: {new Date(dispute.metadata.buyer_shipped_at).toLocaleString()}
                                </p>
                            )}
                            {dispute.metadata?.return_deadline_hours && !dispute.metadata?.buyer_shipped_at && (
                                <p className="text-[9px] text-amber-500 font-bold mt-2">
                                    ⏱ Buyer has {dispute.metadata.return_deadline_hours}h to ship goods back
                                </p>
                            )}
                        </div>
                    )}

                    <div className="p-6 bg-[#0f172a] rounded-[40px] text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                                <RotateCcw className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Version</p>
                                <p className="text-sm font-black uppercase">Safeeely ES-10</p>
                            </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-400 font-medium italic">
                            "This dispute is currently under human supervision. Automated AI mediation has been paused pending administrator action."
                        </p>
                    </div>
                </div>
            </div>

            {/* Reassign Specialist Modal */}
            {showReassign && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-900">Reassign Specialist</h3>
                            <button
                                onClick={() => setShowReassign(false)}
                                className="w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Specialist</label>
                                <select
                                    value={reassignAdminId}
                                    onChange={(e) => setReassignAdminId(e.target.value)}
                                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                >
                                    <option value="">Choose a specialist...</option>
                                    {availableAdmins.map((admin: any) => (
                                        <option key={admin.id} value={admin.id}>
                                            {admin.name} ({admin.open_cases || 0} open cases)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={reassignReason}
                                    onChange={(e) => setReassignReason(e.target.value)}
                                    placeholder="e.g. Original specialist unavailable"
                                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowReassign(false)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 text-slate-700 font-black text-[10px] uppercase hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={reassignSpecialist}
                                disabled={!reassignAdminId || reassignLoading}
                                className="flex-1 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {reassignLoading ? 'Assigning...' : 'Confirm Reassign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
