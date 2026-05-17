'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { AlertTriangle, ArrowLeft, Send, Paperclip, XCircle, UserX, CheckCircle2, Activity, Play, Pause, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

// The API_URL is handled internally by lib/api

const AudioPlayer = ({ url, isMe }: { url: string, isMe?: boolean }) => {
    const [playing, setPlaying] = useState(false);
    const [audio] = useState(new Audio(url));
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        audio.addEventListener('ended', () => setPlaying(false));
        audio.addEventListener('timeupdate', () => {
            setProgress((audio.currentTime / audio.duration) * 100);
        });
        return () => {
            audio.removeEventListener('ended', () => setPlaying(false));
            audio.pause();
        };
    }, [audio]);

    const toggle = () => {
        if (playing) {
            audio.pause();
        } else {
            audio.play();
        }
        setPlaying(!playing);
    };

    return (
        <div className={`flex items-center gap-4 py-2 px-4 rounded-2xl border ${isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'} min-w-[240px] mt-2`}>
            <Button 
                size="icon" 
                variant="ghost" 
                className={`h-10 w-10 rounded-xl shrink-0 ${isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                onClick={toggle}
            >
                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </Button>
            <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                        Voice Recording
                    </span>
                    <Activity className={`w-3 h-3 ${playing ? 'animate-pulse text-emerald-400' : (isMe ? 'text-white/20' : 'text-slate-200')}`} />
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isMe ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div 
                        className={`h-full transition-all duration-300 ${isMe ? 'bg-white' : 'bg-emerald-500'}`} 
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

interface Message {
    id: string;
    sender_id: string | null;
    sender_type: 'USER' | 'AI' | 'ADMIN';
    content: string;
    attachments: any[];
    created_at: string;
}

interface DisputeDetailsViewProps {
    txn: any;
    onBack: () => void;
    decodedSafetag: string;
}

export const DisputeDetailsView = ({ txn, onBack, decodedSafetag }: DisputeDetailsViewProps) => {
    const [dispute, setDispute] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const currentUserProfileId = txn.buyer?.safetag === decodedSafetag ? txn.buyer_id : txn.seller_id;

    const fetchMessages = async (disputeId: string) => {
        try {
            const res = await api.get(`/disputes/${disputeId}/messages`);
            const fetched = res.data;
            setMessages(fetched);

            // Returns the latest signal target if any
            const restrictionSignal = [...fetched].reverse().find((m: any) => m.metadata?.type === 'restriction_signal');
            return restrictionSignal?.metadata?.target || null;
        } catch (err) {
            console.error('Fetch messages error:', err);
            return null;
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const res = await api.get(`/disputes/transaction/${txn.id}`);
                const fetchedDispute = Array.isArray(res.data) ? res.data[0] : res.data;
                if (fetchedDispute) {
                    setDispute(fetchedDispute);
                    await fetchMessages(fetchedDispute.id);
                }
            } catch (err: any) {
                if (err?.response?.status !== 404) {
                    console.error(err);
                    toast.error('Could not load dispute details.');
                }
                // 404 = no dispute for this transaction yet — silent, UI shows empty state
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [txn.id]);

    // Polling for updates every 3 seconds
    useEffect(() => {
        if (!dispute || dispute.status !== 'OPEN') return;
        
        const interval = setInterval(async () => {
            // 1. Fetch messages and signals
            const signalTarget = await fetchMessages(dispute.id);

            // 2. Fetch latest dispute state
            try {
                const res = await api.get(`/disputes/transaction/${txn.id}`);
                const fetchedDispute = Array.isArray(res.data) ? res.data[0] : res.data;
                
                if (fetchedDispute) {
                    // IF we have a signal from messages, prioritize that over the DB state 
                    // only if the DB state is 'ALL' (meaning signal is newer/pending propagation)
                    // OR just always prioritize the signal from the message history as it reflects admin's intended timeline.
                    if (signalTarget) {
                        fetchedDispute.restricted_to = signalTarget;
                    }
                    setDispute(fetchedDispute);
                }
            } catch (e: any) {
                if (e?.response?.status !== 404) console.error('Update dispute error:', e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [dispute?.id, dispute?.status, txn.id]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + selectedFiles.length > 5) {
            toast.error('Maximum 5 files allowed.');
            return;
        }

        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);

        const newPreviews = [...previews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setPreviews(newPreviews);
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || !dispute) return;
        try {
            setIsSending(true);
            let attachments: any[] = [];

            if (selectedFiles.length > 0) {
                setUploading(true);
                const formData = new FormData();
                selectedFiles.forEach(file => formData.append('files', file));

                const uploadRes = await api.post(`/disputes/${dispute.id}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                attachments = uploadRes.data;
            }

            const res = await api.post(`/disputes/${dispute.id}/messages`, {
                sender_id: currentUserProfileId,
                content: newMessage,
                attachments
            });

            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setNewMessage('');
            setSelectedFiles([]);
            setPreviews([]);
            toast.success('Evidence submitted successfully.');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to send message/evidence.');
        } finally {
            setIsSending(false);
            setUploading(false);
        }
    };

    const handleResolve = async (outcome: 'REFUND_BUYER' | 'PAY_SELLER' | 'SPLIT') => {
        try {
            setResolving(true);
            await api.post(`/disputes/${dispute.id}/resolve`, {
                resolution_type: outcome,
                resolution_notes: `Resolved by ${decodedSafetag} via Dashboard`
            });
            toast.success(`Dispute resolved: ${outcome.replace('_', ' ')}`);
            setDispute((prev: any) => ({ ...prev, status: 'RESOLVED', resolution: outcome }));
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to resolve dispute');
        } finally {
            setResolving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={onBack} className="text-slate-500"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader><Skeleton className="h-8 w-48 rounded-md" /></CardHeader>
                    <CardContent className="space-y-4"><Skeleton className="h-48 w-full rounded-2xl" /></CardContent>
                </Card>
            </div>
        );
    }

    if (!dispute) {
        return (
            <div className="text-center py-20 space-y-4">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto" />
                <h2 className="text-xl font-bold text-slate-800">Dispute Not Found</h2>
                <Button onClick={onBack}>Go Back</Button>
            </div>
        );
    }

    const isResolved = dispute.status === 'RESOLVED';
    const lastMessage = messages[messages.length - 1];

    const isBuyer = decodedSafetag === txn.buyer?.safetag;
    const isSeller = decodedSafetag === txn.seller?.safetag;

    const hasAdminJoined = messages.some(m => typeof m.content === 'string' && (m.content.includes('[ADMIN_JOINED') || m.sender_type === 'ADMIN'));

    const isAiWaitingForMe = lastMessage?.sender_type === 'AI' &&
        (lastMessage.content.toLowerCase().includes(decodedSafetag.toLowerCase()) ||
            (lastMessage.content.toLowerCase().includes('buyer') && isBuyer) ||
            (lastMessage.content.toLowerCase().includes('seller') && isSeller) ||
            (lastMessage.content.toLowerCase().includes('@buyer') && isBuyer) ||
            (lastMessage.content.toLowerCase().includes('@seller') && isSeller) ||
            (lastMessage.content.toLowerCase().includes('@all')));

    // canChat if: 
    // 1. Dispute is not resolved AND
    // 2. (Admin is present OR AI is waiting for me OR it's the very start of mediation) AND
    // 3. Admin hasn't restricted chat to the other party
    const restrictedTo = dispute?.restricted_to || 'ALL';
    const isRestrictedToMe = restrictedTo === 'ALL' || 
                             (restrictedTo === 'BUYER' && isBuyer) || 
                             (restrictedTo === 'SELLER' && isSeller);

    const canChat = !isResolved && 
                    (hasAdminJoined || isAiWaitingForMe || (messages.length === 1 && lastMessage?.sender_type === 'AI')) &&
                    isRestrictedToMe;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* ... rest of header ... */}
            <Button variant="ghost" onClick={onBack} className="text-slate-400 font-bold hover:bg-slate-50 rounded-xl px-4 h-10 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Transactions
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 flex flex-col h-[700px]">
                    <Card className="rounded-[40px] border-none shadow-2xl overflow-hidden bg-slate-50 flex flex-col h-full border border-white/50 backdrop-blur-sm">
                        <div className={`p-6 ${isResolved ? 'bg-emerald-500' : 'bg-slate-900'} text-white shadow-lg z-10 relative`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                        <AlertTriangle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black">AI Dispute Mediator</h2>
                                        <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                                            Case ID: {dispute.id?.split('-')[0].toUpperCase()} • {dispute.status}
                                        </p>
                                    </div>
                                </div>
                                {isResolved && <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Resolved</div>}
                            </div>
                        </div>

                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                            {messages.filter((m: any) => m.metadata?.type !== 'restriction_signal').map((msg) => {
                                const isAI = msg.sender_type === 'AI';
                                const isAdmin = typeof msg.content === 'string' && msg.content.includes('[ADMIN_MSG');
                                const isJoined = typeof msg.content === 'string' && msg.content.includes('[ADMIN_JOINED');
                                const isLeft = typeof msg.content === 'string' && msg.content.includes('[ADMIN_LEFT');
                                const isMe = msg.sender_id === currentUserProfileId;

                                // Parse admin identity
                                let adminIdentity = 'Administrator';
                                let cleanContent = msg.content;
                                if (isAdmin || isJoined || isLeft) {
                                    const joinMatch = msg.content.match(/\[ADMIN_JOINED:(.*?)\]/);
                                    const leftMatch = msg.content.match(/\[ADMIN_LEFT:(.*?)\]/);
                                    const msgMatch = msg.content.match(/\[ADMIN_MSG:(.*?)\]/);
                                    adminIdentity = joinMatch?.[1] || leftMatch?.[1] || msgMatch?.[1] || 'Administrator';
                                    cleanContent = msg.content
                                        .replace(/\[ADMIN_JOINED:.*?\]/g, '')
                                        .replace(/\[ADMIN_LEFT:.*?\]/g, '')
                                        .replace(/\[ADMIN_MSG:.*?\]/g, '');
                                }

                                // System lines (Join/Leave)
                                if (isJoined || isLeft) {
                                    const type = isJoined ? 'JOINED' : 'LEFT';
                                    const time = format(new Date(msg.created_at), 'HH:mm:ss');
                                    
                                    return (
                                        <div key={msg.id} className="relative flex justify-center py-8 items-center">
                                            <div className="absolute inset-0 flex items-center px-8">
                                                <div className="w-full border-t border-slate-100" />
                                            </div>
                                            <div className="relative bg-transparent px-4">
                                                <span className="text-[10px] font-black text-slate-400/80 uppercase tracking-[0.2em] whitespace-nowrap bg-slate-50 px-4">
                                                    {time} • {adminIdentity} {type}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }

                                // Standard Messages
                                return (
                                    <div key={msg.id} className="space-y-4">
                                        <div className={cn(
                                            "flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500",
                                            isMe ? "justify-end" : "justify-start"
                                        )}>
                                            {!isMe && (
                                                <div className={cn(
                                                    "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-black text-xs shadow-sm",
                                                    isAI ? "bg-indigo-600 text-white" : (isAdmin ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border border-slate-200")
                                                )}>
                                                    {isAI ? 'AI' : (isAdmin ? 'AD' : 'CP')}
                                                </div>
                                            )}
                                            
                                            <div className={cn(
                                                "max-w-[80%] px-5 py-3 shadow-md",
                                                isMe ? "bg-slate-900 text-white rounded-[24px] rounded-br-[4px]" :
                                                isAI ? "bg-white border-2 border-indigo-100 text-slate-800 rounded-[24px] rounded-bl-[4px]" :
                                                "bg-white text-slate-700 rounded-[24px] rounded-bl-[4px]"
                                            )}>
                                                <div className="flex items-center justify-between gap-4 mb-1">
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        isMe ? "text-white/40" : (isAdmin ? "text-emerald-500" : "text-slate-400")
                                                    )}>
                                                        {isMe ? 'You' : isAI ? 'Mediator' : (isAdmin ? 'Administrator' : 'Counterparty')}
                                                    </span>
                                                    {isAdmin && <span className="text-[8px] font-bold text-emerald-600/40 uppercase ml-2">{adminIdentity}</span>}
                                                    <span className={cn("text-[9px] font-bold", isMe ? "text-white/30" : "text-slate-300")}>
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </span>
                                                </div>

                                                <div className="text-sm leading-relaxed break-words">
                                                    {cleanContent.includes('[Voice Recording:') ? (
                                                        <>
                                                            <ReactMarkdown
                                                                components={{
                                                                    strong: ({ ...props }) => <span className={cn("font-black", isMe ? "text-white" : "text-slate-900")} {...props} />,
                                                                    p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                                }}
                                                            >
                                                                {cleanContent.replace(/\[Voice Recording:.*?\]/g, '').trim()}
                                                            </ReactMarkdown>
                                                            <AudioPlayer 
                                                                url={cleanContent.match(/\[Voice Recording:(.*?)\]/)?.[1] || ''} 
                                                                isMe={isMe} 
                                                            />
                                                        </>
                                                    ) : (
                                                        <ReactMarkdown
                                                            components={{
                                                                strong: ({ ...props }) => <span className={cn("font-black", isMe ? "text-white" : "text-slate-900")} {...props} />,
                                                                p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                                ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                                                                ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                                                                li: ({ ...props }) => <li className="pl-1" {...props} />
                                                            }}
                                                        >
                                                            {cleanContent}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>

                                                {/* Render Attachments */}
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                                        {msg.attachments.map((att: any, i: number) => {
                                                            const isImage = att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || att.type?.startsWith('image/');
                                                            return (
                                                                <div key={i} className="group relative">
                                                                    {isImage ? (
                                                                        <div className="aspect-video rounded-xl overflow-hidden border border-slate-100 shadow-sm relative bg-slate-50">
                                                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <a href={att.url} target="_blank" rel="noreferrer" className="text-[8px] font-black text-white uppercase tracking-widest bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg">View Full</a>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 text-[9px] font-bold bg-slate-50 border border-slate-100 p-2 rounded-xl group-hover:bg-slate-100 transition-colors">
                                                                            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                                                                <Paperclip className="w-3 h-3 text-slate-400" />
                                                                            </div>
                                                                            <span className="truncate flex-1 text-slate-600 font-black">{att.name}</span>
                                                                            <a href={att.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline px-2 font-black">Open</a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {!isResolved && lastMessage?.sender_type === 'USER' && (
                                <div className="flex justify-start items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s] mx-1" />
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mediator is thinking...</span>
                                </div>
                            )}
                        </CardContent>

                        {/* Chat Footer */}
                        <div className="p-6 bg-white border-t border-slate-200 relative">
                            {/* Restriction Overlay */}
                            {!canChat && !isResolved && (
                                <div className="absolute inset-x-0 bottom-0 top-0 bg-white/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
                                    <div className="bg-slate-900/90 text-white px-8 py-4 rounded-[30px] shadow-2xl flex items-center gap-4 border border-white/20">
                                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Mediation in Progress</p>
                                            <p className="text-xs font-bold whitespace-nowrap">
                                                {restrictedTo !== 'ALL' 
                                                    ? `Waiting for Mediator's request to ${restrictedTo === 'BUYER' ? 'Buyer' : 'Seller'}` 
                                                    : 'Waiting for Mediator\'s signal...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Previews Area */}
                            {previews.length > 0 && (
                                <div className="flex gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {previews.map((src, i) => (
                                        <div key={i} className="relative w-20 h-20 shrink-0 group">
                                            <img src={src} alt="Preview" className="w-full h-full object-cover rounded-2xl border-2 border-emerald-400 shadow-md" />
                                            <button
                                                onClick={() => removeFile(i)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-90"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!canChat && !isResolved && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-30 flex items-center justify-center p-4 text-center">
                                    <div className="flex flex-col items-center gap-2 max-w-[280px]">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                            <UserX className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                            Chat Disabled - Waiting for AI to prompt you
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 italic">
                                            This case follows a turn-based mediation process to ensure fairness.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="evidence-upload"
                                    onChange={handleFileSelect}
                                    accept="image/*,.pdf,.doc,.docx"
                                />
                                <label
                                    htmlFor="evidence-upload"
                                    className={`rounded-2xl border border-slate-200 h-12 w-12 shrink-0 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all ${(!canChat || isSending || selectedFiles.length >= 5) ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <Paperclip className={`w-5 h-5 ${previews.length > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                                </label>

                                <input
                                    type="text"
                                    placeholder={isResolved ? "Dispute is resolved" : canChat ? "Explain your evidence..." : "Please wait..."}
                                    className="flex-1 h-12 bg-slate-100 border-none rounded-2xl px-5 text-sm font-medium focus:ring-2 focus:ring-slate-900 transition-all outline-none disabled:opacity-50"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={!canChat || isSending || isResolved}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button
                                    size="icon"
                                    className="rounded-2xl bg-slate-900 hover:bg-slate-800 h-12 w-12 shrink-0 shadow-lg shadow-slate-200 transition-all duration-300 active:scale-95"
                                    onClick={handleSendMessage}
                                    disabled={!canChat || isSending || (!newMessage.trim() && selectedFiles.length === 0) || isResolved}
                                >
                                    {uploading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Case Info & Manual Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="rounded-[32px] border-none shadow-xl bg-slate-900 overflow-hidden text-white">
                        <div className="p-6 text-center space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Escrowed Funds</p>
                            <h3 className="text-4xl font-black">${txn.amount.toLocaleString()} <span className="text-lg font-bold text-slate-500 uppercase">{txn.currency}</span></h3>
                        </div>
                        <div className="px-6 pb-6 space-y-3">
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Product</span>
                                    <span className="text-xs font-black text-white">{txn.product_name}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                    <span>Txn Code</span>
                                    <span>#{txn.txn_code}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Buyer</p>
                                    <p className="text-[10px] font-black">@{txn.buyer?.safetag}</p>
                                </div>
                                <div className="flex-1 bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Seller</p>
                                    <p className="text-[10px] font-black">@{txn.seller?.safetag}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {!isResolved && (
                        <Card className="rounded-[32px] border-none shadow-xl bg-white p-6 border border-slate-100">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Manual Resolution</h4>
                            <div className="space-y-3">
                                <Button
                                    className="w-full h-12 bg-red-50 text-red-600 hover:bg-red-100 border-none rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                    disabled={resolving}
                                    onClick={() => handleResolve('REFUND_BUYER')}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Full Refund
                                </Button>
                                <Button
                                    className="w-full h-12 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                    disabled={resolving}
                                    onClick={() => handleResolve('PAY_SELLER')}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Pay Seller
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                    disabled={resolving}
                                    onClick={() => handleResolve('SPLIT')}
                                >
                                    Split 50/50
                                </Button>
                                <Separator className="my-4" />
                                <p className="text-[9px] text-slate-400 font-bold leading-relaxed text-center italic">
                                    * Resolving manually will bypass AI mediation and finalize the transaction instantly.
                                </p>
                            </div>
                        </Card>
                    )}

                    {isResolved && (
                        <Card className="rounded-[32px] border-none shadow-xl bg-emerald-600 p-6 text-white text-center">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="text-lg font-black mb-1">Verdict Reached</h4>
                            <p className="text-xs font-bold text-white/80 mb-4">{dispute.resolution}</p>
                            <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white font-black text-[10px] uppercase rounded-xl hover:bg-white/20" onClick={onBack}>
                                Close Case
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
