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
    Users
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

    const resolveDispute = async (type: string) => {
        try {
            const payload: any = { resolution_type: type };
            if (type === 'SPLIT') {
                payload.buyer_amount = (dispute.transaction.amount * buyerSplit) / 100;
                payload.seller_amount = (dispute.transaction.amount * (100 - buyerSplit)) / 100;
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
            <div className="h-screen bg-[#020617] flex items-center justify-center">
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
            <div className="w-20 bg-[#020617] flex flex-col items-center py-8 gap-10 shrink-0 border-r border-white/5">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2.5">
                    <img src="/favicon.ico.png" alt="Safeeely" className="w-full h-full object-contain" />
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
                                    activeTab === 'conversation' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                Conversation
                            </button>
                            <button 
                                onClick={() => setActiveTab('logs')}
                                className={cn(
                                    "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === 'logs' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:bg-slate-50"
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

                        <Button 
                            onClick={() => setSplitMode(!splitMode)}
                            className={cn(
                                "h-11 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                splitMode ? "bg-rose-500 text-white" : "bg-[#020617] text-white hover:bg-slate-800"
                            )}
                        >
                            <BadgePercent className="w-4 h-4 mr-2" />
                            {splitMode ? 'Close Settlement' : 'Initialize Settlement'}
                        </Button>
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
                                                isSystem ? "bg-[#020617] text-emerald-400" : (isSelf ? "bg-emerald-500 text-white" : "bg-white text-slate-400")
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
                                                <Button onClick={() => resolveDispute('REFUND_BUYER')} variant="outline" className="flex-1 rounded-2xl h-12 border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase">100% Refund Buyer</Button>
                                                <Button onClick={() => resolveDispute('PAY_SELLER')} variant="outline" className="flex-1 rounded-2xl h-12 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black text-[10px] uppercase">100% Pay Seller</Button>
                                                <Button onClick={() => resolveDispute('SPLIT')} className="flex-[1.5] rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-100">Confirm Split Settlement</Button>
                                                <Button onClick={() => resolveDispute('REFUND_AFTER_RETURN')} variant="outline" className="flex-1 rounded-2xl h-12 border-amber-200 text-amber-600 hover:bg-amber-50 font-black text-[10px] uppercase">🔄 Refund After Return</Button>
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
                                                <Button 
                                                    onClick={handleJoinChat}
                                                    className="h-9 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 animate-in fade-in slide-in-from-left-2"
                                                >
                                                    Join Chat
                                                </Button>
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
                                                className="px-8 h-12 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                            <div className="bg-[#020617] p-10 rounded-[48px] text-white overflow-hidden relative">
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
                        </div>
                    </div>
                )}
            </div>

            {/* Right Area: Transaction Story */}
            <div className="w-[400px] bg-slate-50 flex flex-col h-full overflow-y-auto shrink-0 hidden xl:flex border-l border-slate-100">
                <div className="p-8 space-y-8">
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
                            </div>
                        </div>
                    </div>

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

                    <div className="p-6 bg-[#020617] rounded-[40px] text-white">
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
        </div>
    );
}
