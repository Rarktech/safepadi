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
    X,
    ArrowLeft
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

const DISPUTE_TYPE_LABELS: Record<string, string> = {
    INSTAGRAM_ACCOUNT: 'Instagram Account', DISCORD_ACCOUNT: 'Discord Account',
    TELEGRAM_ACCOUNT: 'Telegram Account', GMAIL_ACCOUNT: 'Gmail Account',
    TWITTER_ACCOUNT: 'Twitter/X Account', TIKTOK_ACCOUNT: 'TikTok Account',
    YOUTUBE_CHANNEL: 'YouTube Channel', FACEBOOK_ACCOUNT: 'Facebook Account',
    GAMING_ACCOUNT: 'Gaming Account', FREELANCE_CODE: 'Freelance — Code',
    FREELANCE_DESIGN: 'Freelance — Design', FREELANCE_WRITING: 'Freelance — Writing',
    FREELANCE_VIDEO: 'Freelance — Video', FREELANCE_MUSIC: 'Freelance — Music',
    FREELANCE_CONSULTING: 'Freelance — Consulting', DIGITAL_DOWNLOAD: 'Digital Download',
    DOMAIN_WEBSITE: 'Domain / Website', ELECTRONICS_GADGET: 'Electronics & Gadgets',
    VEHICLE_SALE: 'Vehicle Sale', LUXURY_GOODS: 'Luxury Goods',
    FASHION_GOODS: 'Fashion & Clothing', PHYSICAL_GOODS: 'Physical Goods',
    SOCIAL_SERVICE: 'Social Media Service', INFLUENCER_DEAL: 'Influencer Deal',
    EVENT_BOOKING: 'Event Booking', TICKET_RESERVATION: 'Ticket / Reservation',
    DISPATCH_DELIVERY: 'Dispatch & Delivery', EDUCATION_SERVICE: 'Education Service',
    REAL_ESTATE: 'Real Estate', CONSTRUCTION_SERVICE: 'Construction',
    CRYPTO_TO_GOODS: 'Crypto Transaction', GENERIC: 'General Dispute',
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
            api.get('/admin/management/workload').then(r => setAvailableAdmins(r.data?.workload || [])).catch(() => {});
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
            <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div className="w-8 h-8 border-[2.5px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Loading dispute…</p>
                </div>
            </div>
        );
    }

    const { transaction: txn } = dispute;
    const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };
    const disputeStatusLabel = dispute.is_ai_paused ? 'Escalated' : dispute.status;
    const disputeStatusChip = dispute.is_ai_paused ? 'chip-red' : dispute.status === 'OPEN' ? 'chip-amber' : 'chip-green';
    const TIER_CHIP_MAP: Record<string, string> = { LITE: 'chip-green', STANDARD: 'chip-blue', CONSTITUTIONAL: 'chip-red' };

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
            {/* ── Sticky header bar ── */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e9eaec', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.push('/admin/disputes')}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                        className="hover:text-[#0f172a] transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Disputes
                    </button>
                    <span style={{ color: '#d1d5db' }}>›</span>
                    <code style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>#{dispute.id.slice(0, 8)}</code>
                    <span className={`adm-chip ${disputeStatusChip}`}>{disputeStatusLabel}</span>
                    {dispute.pipeline_tier && <span className={`adm-chip ${TIER_CHIP_MAP[dispute.pipeline_tier] ?? 'chip-slate'}`}>{dispute.pipeline_tier}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Chat restriction pill group */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                        {[{ id: 'BUYER', label: 'Buyer' }, { id: 'ALL', label: 'Both' }, { id: 'SELLER', label: 'Seller' }].map(opt => (
                            <button key={opt.id} onClick={() => handleRestrictChat(opt.id as any)}
                                style={{ padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .14s',
                                    ...(restrictedTo === opt.id ? { background: '#0f172a', color: '#fff' } : { background: 'transparent', color: '#64748b' }) }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {/* Settlement toggle */}
                    <button onClick={() => setSplitMode(!splitMode)}
                        style={{ height: '34px', padding: '0 14px', borderRadius: '9px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                            ...(splitMode ? { background: '#fff1f2', color: '#e11d48' } : { background: '#0f172a', color: '#fff' }) }}>
                        <BadgePercent className="w-3.5 h-3.5" />
                        {splitMode ? 'Close Settlement' : 'Settlement'}
                    </button>
                    {/* Party avatars */}
                    <div style={{ display: 'flex' }}>
                        {[txn.buyer, txn.seller].map((user: any, i: number) => (
                            <div key={i} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '2px solid #fff', background: i === 0 ? '#f0fdf4' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: i === 0 ? '#059669' : '#2563eb', overflow: 'hidden', marginLeft: i === 0 ? 0 : '-6px' }}>
                                {user?.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (user?.safetag || '?').replace('@', '').slice(0, 2).toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── 3-column body ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '14px', padding: '14px 20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* ═══ LEFT PANEL ═══ */}
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '14px' }}>

                    {/* Case Overview */}
                    <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                        <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>Case Overview</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            {([
                                { label: 'Case ID', value: <code style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>#{dispute.id.slice(0, 12)}</code> },
                                { label: 'Transaction', value: <code style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>{txn.txn_code}</code> },
                                { label: 'Category', value: <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '500' }}>{DISPUTE_TYPE_LABELS[dispute.dispute_type] ?? dispute.dispute_type}</span> },
                                { label: 'Opened', value: <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '500' }}>{new Date(dispute.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
                                { label: 'Duration', value: <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '500' }}>{Math.floor((Date.now() - new Date(dispute.created_at).getTime()) / 86400000)}d open</span> },
                            ] as Array<{ label: string; value: React.ReactNode }>).map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8' }}>{row.label}</span>
                                    {row.value}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                        <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Parties</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {([
                                { role: 'Buyer', user: txn.buyer, color: '#059669', bg: '#f0fdf4' },
                                { role: 'Seller', user: txn.seller, color: '#2563eb', bg: '#eff6ff' },
                            ] as Array<{ role: string; user: any; color: string; bg: string }>).map(({ role, user, color, bg }) => (
                                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color, flexShrink: 0 }}>
                                        {(user?.safetag || '?').replace('@', '').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{role}</p>
                                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{user?.safetag || '—'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Flagged milestone */}
                    {dispute.milestone_id && Array.isArray(txn.milestones) && (() => {
                        const flagged = txn.milestones.find((m: any) => m.id === dispute.milestone_id);
                        if (!flagged) return null;
                        return (
                            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px', padding: '14px 16px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '700', color: '#e11d48', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Flagged Phase</p>
                                <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{flagged.title}</p>
                                <p style={{ fontSize: '11px', color: '#e11d48', marginTop: '3px' }}>{flagged.amount} {txn.currency} · {flagged.status}</p>
                            </div>
                        );
                    })()}

                    {/* Return in progress */}
                    {(txn.status === 'RETURN_PENDING' || dispute.verdict_action === 'REFUND_AFTER_RETURN') && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '14px 16px' }}>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Return In Progress</p>
                            <p style={{ fontSize: '11.5px', color: '#92400e', lineHeight: '1.5', fontWeight: '500' }}>Buyer must ship goods back before refund is issued.</p>
                            {dispute.metadata?.buyer_shipped_at && <p style={{ fontSize: '10px', color: '#d97706', fontWeight: '600', marginTop: '6px' }}>📦 Shipped: {new Date(dispute.metadata.buyer_shipped_at).toLocaleString()}</p>}
                            {dispute.metadata?.return_deadline_hours && !dispute.metadata?.buyer_shipped_at && <p style={{ fontSize: '10px', color: '#d97706', fontWeight: '600', marginTop: '6px' }}>⏱ Buyer has {dispute.metadata.return_deadline_hours}h to ship</p>}
                        </div>
                    )}

                    {/* SOP Guidance */}
                    {sops.length > 0 && (
                        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>SOP Guidance</p>
                                <span className="adm-chip chip-slate">{sops.length}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sops.map((sop: any) => {
                                    const isHardGate = sop.severity === 'HARD_GATE';
                                    const isBinding = sop.severity === 'BINDING';
                                    const sopBg = isHardGate ? '#fff1f2' : isBinding ? '#fffbeb' : '#eff6ff';
                                    const sopBorder = isHardGate ? '#fecdd3' : isBinding ? '#fde68a' : '#bfdbfe';
                                    const sopCodeColor = isHardGate ? '#e11d48' : isBinding ? '#d97706' : '#2563eb';
                                    const isExpanded = sopExpanded === sop.id;
                                    return (
                                        <div key={sop.id} style={{ background: sopBg, border: `1px solid ${sopBorder}`, borderRadius: '10px', padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                                                        <span style={{ fontSize: '9px', fontWeight: '800', color: sopCodeColor, textTransform: 'uppercase', letterSpacing: '.08em' }}>{sop.sop_code}</span>
                                                        {isHardGate && <Lock className="w-2.5 h-2.5" style={{ color: '#e11d48' }} />}
                                                    </div>
                                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', lineHeight: '1.35' }}>{sop.title}</p>
                                                </div>
                                                <button onClick={() => setSopExpanded(isExpanded ? null : sop.id)} style={{ flexShrink: 0, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                    <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
                                                </button>
                                            </div>
                                            {isExpanded && (
                                                <>
                                                    <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.5', fontWeight: '500', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,.06)' }}>{sop.rule_body}</p>
                                                    <button onClick={() => applySopToChat(sop)} style={{ marginTop: '8px', width: '100%', height: '30px', borderRadius: '8px', background: '#0f172a', color: '#fff', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.08em', cursor: 'pointer', border: 'none' }}>Apply to Chat</button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ CENTER — CHAT ═══ */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Tab strip */}
                    <div style={{ borderBottom: '1px solid #f3f4f6', padding: '0 20px', display: 'flex', gap: '3px', alignItems: 'center', height: '48px', background: '#fafafa', flexShrink: 0 }}>
                        {([
                            { key: 'conversation', label: 'Conversation' },
                            { key: 'logs', label: 'Transaction Logs' },
                        ] as Array<{ key: string; label: string }>).map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                                style={{ height: '32px', padding: '0 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .14s',
                                    ...(activeTab === tab.key ? { background: '#0f172a', color: '#fff' } : { background: 'transparent', color: '#64748b' }) }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'conversation' ? (
                        <>
                            {/* Messages scroll area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                                <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Timeline start marker */}
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                                            <div style={{ width: '100%', borderTop: '1px solid #f3f4f6' }} />
                                        </div>
                                        <span style={{ position: 'relative', background: '#fff', padding: '4px 14px', borderRadius: '999px', fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.15em', border: '1px solid #f3f4f6' }}>
                                            Case opened · {new Date(dispute.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {messages.map((msg: any) => {
                                        const isSystem = msg.sender_type === 'AI';
                                        const isRestrictedSignal = msg.metadata?.type === 'restriction_signal';

                                        if (isRestrictedSignal) {
                                            return (
                                                <div key={msg.id} style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                                                        <div style={{ width: '100%', borderTop: '1px solid #f3f4f6' }} />
                                                    </div>
                                                    <span style={{ position: 'relative', background: '#fff', padding: '3px 12px', fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                                                        {msg.metadata.admin_label || `Chat restricted to ${msg.metadata.target}`}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const isSelf = msg.sender_type === 'ADMIN' || (msg.sender_type === 'USER' && (msg.sender_id === null || msg.content.includes('[ADMIN_MSG:')));

                                        if (msg.content.includes('[ADMIN_JOINED:') || msg.content.includes('[ADMIN_LEFT:')) {
                                            const joinType = msg.content.includes('[ADMIN_JOINED:') ? 'joined' : 'left';
                                            const nameMatch = msg.content.match(/\[ADMIN_(?:JOINED|LEFT):(.*?)\]/);
                                            const adminName = nameMatch ? nameMatch[1] : 'Administrator';
                                            const msgTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <div key={msg.id} style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                                                        <div style={{ width: '100%', borderTop: '1px solid #f3f4f6' }} />
                                                    </div>
                                                    <span style={{ position: 'relative', background: '#fff', padding: '3px 12px', fontSize: '9px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                                                        {msgTime} · {adminName} {joinType}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const profile = isSystem ? { safetag: 'Mediator AI', avatar: null } : (msg.sender_id === txn.buyer_id ? txn.buyer : txn.seller);

                                        return (
                                            <div key={msg.id} style={{ display: 'flex', gap: '10px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isSystem ? '#0f172a' : (isSelf ? '#10b981' : '#f1f5f9'), color: isSystem ? '#10b981' : (isSelf ? '#fff' : '#64748b') }}>
                                                    {isSystem ? <Zap className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                </div>
                                                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#0f172a' }}>
                                                            {isSelf ? selectedIdentity : (isSystem ? 'Mediator AI' : profile?.safetag)}
                                                        </span>
                                                        <span style={{ fontSize: '9px', color: '#cbd5e1' }}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div style={{ padding: '12px 16px', borderRadius: '14px', fontSize: '13px', lineHeight: '1.5', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                                                        ...(isSystem ? { background: '#0f172a', color: '#e2e8f0', borderTopLeftRadius: '4px' } :
                                                        isSelf ? { background: '#10b981', color: '#fff', borderTopRightRadius: '4px' } :
                                                        { background: '#f8fafc', color: '#475569', borderTopLeftRadius: '4px', border: '1px solid #f1f5f9' }) }}>
                                                        {renderMessageContent(msg, isSelf)}
                                                        {msg.attachments?.length > 0 && (
                                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,.07)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                                {msg.attachments.map((at: any, atIdx: number) => (
                                                                    <div key={atIdx}>
                                                                        {at.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                                            <div style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.05)' }}>
                                                                                <img src={at.url} alt={at.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,.05)', padding: '5px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                                                                                <FileText className="w-3 h-3" />
                                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{at.name}</span>
                                                                                <a href={at.url} target="_blank" style={{ color: isSelf ? 'rgba(255,255,255,.8)' : '#10b981' }}>↗</a>
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

                            {/* Chat footer — only when dispute is open */}
                            {dispute.status === 'OPEN' && (
                                <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 18px', flexShrink: 0, background: '#fff' }}>
                                    {/* Attachments preview */}
                                    {attachments.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto' }}>
                                            {attachments.map((at, atI) => (
                                                <div key={atI} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: '1px solid #e9eaec', borderRadius: '8px', padding: '5px 9px', flexShrink: 0 }}>
                                                    <FileText className="w-3 h-3 text-[#94a3b8]" />
                                                    <span style={{ fontSize: '11px', fontWeight: '600', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{at.name}</span>
                                                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== atI))} style={{ color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Identity / join row */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <select value={selectedIdentity} onChange={(e) => setSelectedIdentity(e.target.value)} disabled={hasAdminJoined}
                                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: hasAdminJoined ? 'not-allowed' : 'pointer', zIndex: 1 }}>
                                                    {identities.map(ident => <option key={ident} value={ident}>{ident}</option>)}
                                                </select>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: '1px solid #e9eaec', borderRadius: '8px', padding: '5px 10px', opacity: hasAdminJoined ? 0.6 : 1 }}>
                                                    <User className="w-3 h-3 text-[#94a3b8]" />
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>{selectedIdentity}</span>
                                                    {!hasAdminJoined && <ChevronDown className="w-3 h-3 text-[#94a3b8]" />}
                                                </div>
                                            </div>
                                            {!hasAdminJoined && (
                                                <button onClick={handleJoinChat} style={{ height: '30px', padding: '0 12px', background: '#10b981', color: '#fff', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none' }}>
                                                    Join Chat
                                                </button>
                                            )}
                                            {hasAdminJoined && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '3px 10px' }}>
                                                    <div style={{ width: '5px', height: '5px', background: '#10b981', borderRadius: '50%' }} className="animate-pulse" />
                                                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '.1em' }}>Active</span>
                                                </div>
                                            )}
                                        </div>
                                        {hasAdminJoined && (
                                            <button onClick={handleLeaveChat} style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                                                className="hover:text-[#e11d48]">Leave Chat</button>
                                        )}
                                    </div>

                                    {/* Textarea box */}
                                    <div style={{ background: '#f8fafc', border: '1.5px solid #e9eaec', borderRadius: '12px', overflow: 'hidden' }} className="focus-within:border-[#10b981] transition-colors">
                                        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                                            placeholder={hasAdminJoined ? 'Type your message…' : 'Join the chat to send messages'}
                                            disabled={!hasAdminJoined}
                                            style={{ width: '100%', padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#0f172a', background: 'transparent', outline: 'none', resize: 'none', minHeight: '68px', opacity: hasAdminJoined ? 1 : 0.45, cursor: hasAdminJoined ? 'text' : 'not-allowed' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid #f3f4f6' }}>
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileUpload} />
                                                <button onClick={() => fileInputRef.current?.click()} disabled={!hasAdminJoined}
                                                    style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'none', border: 'none', cursor: hasAdminJoined ? 'pointer' : 'not-allowed', opacity: hasAdminJoined ? 1 : 0.4 }}>
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={isRecording ? stopRecording : startRecording} disabled={!hasAdminJoined}
                                                    style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isRecording ? '#e11d48' : 'none', color: isRecording ? '#fff' : '#94a3b8', border: 'none', cursor: hasAdminJoined ? 'pointer' : 'not-allowed', opacity: hasAdminJoined ? 1 : 0.4 }}>
                                                    <Mic className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <button onClick={() => handleSendMessage()} disabled={!hasAdminJoined || (!message.trim() && attachments.length === 0)}
                                                style={{ height: '30px', padding: '0 14px', background: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', opacity: (!hasAdminJoined || (!message.trim() && attachments.length === 0)) ? 0.3 : 1 }}>
                                                <Send className="w-3 h-3" /> Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Transaction Logs tab */
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            {/* Summary hero */}
                            <div style={{ background: '#0f172a', borderRadius: '14px', padding: '22px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, padding: '16px', opacity: 0.07 }}>
                                    <Activity className="w-28 h-28 text-[#10b981]" />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <p style={{ ...IT, fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '14px' }}>Case Timeline</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        {[
                                            { label: 'Duration', value: `${Math.floor((Date.now() - new Date(dispute.created_at).getTime()) / 86400000)}d` },
                                            { label: 'Events', value: `${messages.length}` },
                                        ].map(s => (
                                            <div key={s.label}>
                                                <p style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: '3px' }}>{s.label}</p>
                                                <p style={{ ...IT, fontSize: '22px', fontWeight: '800', color: '#fff' }}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline events */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                                {([
                                    { time: dispute.created_at, event: 'Dispute Opened', desc: 'Buyer initiated dispute mediation.', color: '#e11d48', Icon: AlertCircle },
                                    ...messages.filter((m: any) => m.sender_type === 'USER').map((m: any) => ({
                                        time: m.created_at,
                                        event: m.sender_id === txn.buyer_id ? 'Buyer Response' : (m.sender_id === txn.seller_id ? 'Seller Response' : 'Admin Note'),
                                        desc: m.content.length > 60 ? m.content.substring(0, 60) + '…' : m.content,
                                        color: m.sender_id === txn.buyer_id ? '#2563eb' : (m.sender_id === txn.seller_id ? '#0f172a' : '#10b981'),
                                        Icon: User,
                                    }))
                                ] as Array<{ time: string; event: string; desc: string; color: string; Icon: any }>)
                                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                                    .map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <item.Icon className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: '10px', padding: '10px 14px', flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>{item.event}</span>
                                                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{new Date(item.time).toLocaleString()}</span>
                                                </div>
                                                <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {/* Assignment history */}
                            {assignments.length > 0 && (
                                <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '16px 18px' }}>
                                    <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Assignment History</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {assignments.map((a: any, idx: number) => (
                                            <div key={a.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', background: '#fafafa', borderRadius: '8px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: a.assigned_to ? '#eef2ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <UserCheck className="w-3 h-3" style={{ color: a.assigned_to ? '#4f46e5' : '#94a3b8' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{a.assigned_to_name || a.assigned_to || 'Unassigned'}</p>
                                                    <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{a.reason?.replace(/_/g, ' ')}{a.assigned_by_name ? ` · by ${a.assigned_by_name}` : ''}</p>
                                                </div>
                                                <p style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>{new Date(a.assigned_at).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ RIGHT PANEL ═══ */}
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '14px' }}>

                    {/* Escrow locked */}
                    <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>Escrow Locked</p>
                        <p style={{ ...IT, fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.03em', lineHeight: 1.1 }}>{txn.total_amount}</p>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginTop: '2px' }}>{txn.currency}</p>
                        {txn.transaction_type === 'MILESTONE' && Array.isArray(txn.milestones) && (
                            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.5' }}>
                                {txn.milestones.filter((m: any) => m.status === 'RELEASED').reduce((s: number, m: any) => s + Number(m.amount), 0).toLocaleString()} {txn.currency} released · {remainingEscrow(txn).toLocaleString()} {txn.currency} remaining
                            </p>
                        )}
                    </div>

                    {/* Resolution actions */}
                    {dispute.status === 'OPEN' && (
                        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                            <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>Resolution</p>
                            {splitMode ? (
                                <div>
                                    <p style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '10px' }}>
                                        Splitting {remainingEscrow(txn).toLocaleString()} {txn.currency}{txn.transaction_type === 'MILESTONE' ? ' (excl. released)' : ''}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Buyer</p>
                                            <p style={{ ...IT, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{buyerSplit}%</p>
                                        </div>
                                        <div style={{ flex: 1, margin: '0 10px' }}>
                                            <input type="range" min="0" max="100" value={buyerSplit} onChange={(e) => setBuyerSplit(Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Seller</p>
                                            <p style={{ ...IT, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{100 - buyerSplit}%</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <button onClick={() => resolveDispute('SPLIT')} style={{ width: '100%', height: '36px', background: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none' }}>Confirm Split</button>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                            <button onClick={() => resolveDispute('REFUND_BUYER')} style={{ height: '32px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '9px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>100% Refund</button>
                                            <button onClick={() => resolveDispute('PAY_SELLER')} style={{ height: '32px', background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', borderRadius: '9px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>100% Pay</button>
                                        </div>
                                        <button onClick={() => resolveDispute('REFUND_AFTER_RETURN')} style={{ width: '100%', height: '32px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '9px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Refund After Return</button>
                                        <button onClick={() => setSplitMode(false)} style={{ width: '100%', height: '28px', background: 'none', color: '#94a3b8', border: 'none', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button onClick={() => resolveDispute('REFUND_BUYER')} style={{ width: '100%', height: '36px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Refund Buyer</button>
                                    <button onClick={() => resolveDispute('PAY_SELLER')} style={{ width: '100%', height: '36px', background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Pay Seller</button>
                                    <button onClick={() => setSplitMode(true)} style={{ width: '100%', height: '36px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        <BadgePercent className="w-3.5 h-3.5" /> Split Settlement
                                    </button>
                                    <button onClick={() => resolveDispute('REFUND_AFTER_RETURN')} style={{ width: '100%', height: '36px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Refund After Return</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Specialist assignment */}
                    {dispute.is_ai_paused && (
                        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                            <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Assigned Specialist</p>
                            {dispute.metadata?.assigned_specialist ? (
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{dispute.metadata.assigned_specialist.name}</p>
                                    {dispute.metadata.assigned_specialist.specialist_title && (
                                        <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '2px' }}>{dispute.metadata.assigned_specialist.specialist_title}</p>
                                    )}
                                    {dispute.metadata.assigned_specialist.specialties?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                            {dispute.metadata.assigned_specialist.specialties.map((s: string) => (
                                                <span key={s} style={{ padding: '2px 7px', background: '#eef2ff', color: '#4f46e5', borderRadius: '999px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                                    {s.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                                        {[
                                            { label: 'Resolved', value: dispute.metadata.assigned_specialist.cases_resolved },
                                            { label: 'Years', value: dispute.metadata.assigned_specialist.years_on_platform },
                                        ].map(s => (
                                            <div key={s.label}>
                                                <p style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</p>
                                                <p style={{ ...IT, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowReassign(true)} style={{ marginTop: '10px', width: '100%', height: '32px', border: '1px solid #e0e7ff', background: '#fff', color: '#4f46e5', borderRadius: '9px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        <RefreshCw className="w-3 h-3" /> Reassign
                                    </button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '6px 0' }}>
                                    <div style={{ width: '34px', height: '34px', background: '#fffbeb', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                                        <AlertCircle className="w-4 h-4 text-[#d97706]" />
                                    </div>
                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '10px' }}>No specialist assigned</p>
                                    <button onClick={() => setShowReassign(true)} style={{ height: '32px', padding: '0 16px', background: '#4f46e5', color: '#fff', borderRadius: '9px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none' }}>
                                        Assign Specialist
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Protocol card */}
                    <div style={{ background: '#0f172a', borderRadius: '16px', padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield className="w-4 h-4 text-[#10b981]" />
                            </div>
                            <div>
                                <p style={{ fontSize: '9px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' }}>Protocol</p>
                                <p style={{ ...IT, fontSize: '13px', fontWeight: '800', color: '#fff' }}>Safeeely ES-10</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '10.5px', color: '#475569', lineHeight: '1.55', fontStyle: 'italic' }}>
                            "This dispute is under human supervision. AI mediation paused pending admin action."
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Reassign Modal ── */}
            {showReassign && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '26px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 60px rgba(0,0,0,.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <p style={{ ...IT, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Reassign Specialist</p>
                            <button onClick={() => setShowReassign(false)} style={{ width: '30px', height: '30px', border: '1px solid #e9eaec', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', background: '#fff' }}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>Select Specialist</label>
                                <select value={reassignAdminId} onChange={(e) => setReassignAdminId(e.target.value)}
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #e9eaec', borderRadius: '10px', fontSize: '13px', color: '#0f172a', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                                    <option value="">Choose a specialist…</option>
                                    {availableAdmins.map((admin: any) => (
                                        <option key={admin.id} value={admin.id}>{admin.name} ({admin.open_cases || 0} open cases)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>Reason (optional)</label>
                                <input type="text" value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="e.g. Original specialist unavailable"
                                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1.5px solid #e9eaec', borderRadius: '10px', fontSize: '13px', color: '#0f172a', background: '#fff', outline: 'none' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setShowReassign(false)} style={{ flex: 1, height: '40px', border: '1.5px solid #e9eaec', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#64748b', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={reassignSpecialist} disabled={!reassignAdminId || reassignLoading}
                                style={{ flex: 1, height: '40px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', opacity: (!reassignAdminId || reassignLoading) ? 0.5 : 1 }}>
                                {reassignLoading ? 'Assigning…' : 'Confirm Reassign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
