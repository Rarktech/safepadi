'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Send, Paperclip, FolderOpen, Play, Pause, FileText, Image as ImageIcon,
  Clock, ChevronRight, Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';
import { VerdictCard } from './VerdictCard';
import { EscalationView } from './EscalationView';
import { EvidenceGrid } from './EvidenceGrid';
import { ResolutionView } from './ResolutionView';

// ─── Audio player ────────────────────────────────────────────────────
function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(new Audio(url));

  useEffect(() => {
    const audio = audioRef.current;
    const onEnd = () => setPlaying(false);
    const onTime = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('timeupdate', onTime);
    return () => { audio.removeEventListener('ended', onEnd); audio.removeEventListener('timeupdate', onTime); audio.pause(); };
  }, []);

  const toggle = () => {
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(p => !p);
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/50 border border-white/20 min-w-[200px] mt-1.5">
      <button onClick={toggle} className="w-8 h-8 rounded-lg bg-[#10b981] text-white flex items-center justify-center shrink-0">
        {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
      </button>
      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#10b981] rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ─── Attachment chip ──────────────────────────────────────────────────
function AttachmentChip({ att }: { att: any }) {
  const isImage = att.type?.startsWith('image/');
  const isAudio = att.type?.startsWith('audio/');
  if (isAudio) return <AudioPlayer url={att.url} />;
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/30 border border-white/20 hover:border-white/40 transition-colors mt-1.5 text-sm">
      {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
      <span className="truncate max-w-[160px]">{att.name || 'Attachment'}</span>
    </a>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────
function MessageBubble({ msg, buyerId, sellerId }: { msg: any; buyerId: string; sellerId: string }) {
  const isAI = msg.sender_type === 'AI' || !msg.sender_id;
  const isBuyer = msg.sender_id === buyerId;
  const isSeller = msg.sender_id === sellerId;
  const timeStr = msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : '';

  if (isAI) {
    return (
      <div className="flex flex-col items-center my-2 px-4 md:px-5">
        <div className="flex items-center gap-[7px] mb-1.5">
          <div className="w-[22px] h-[22px] rounded-full bg-[#0f172a] flex items-center justify-center shrink-0">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
          </div>
          <span className="text-xs font-bold text-[#10b981]">SafeAI</span>
          <span className="text-[10.5px] text-[#94a3b8]">{timeStr}</span>
        </div>
        <div className="bg-white border border-[#dcfce7] rounded-[18px] rounded-tl-[4px] px-4 py-[13px] max-w-[80%] md:max-w-[72%] shadow-sm">
          <div className="text-[13px] text-[#0f172a] leading-[1.65]">
            <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
          </div>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  if (isBuyer) {
    return (
      <div className="flex flex-col items-start my-2 px-4 md:px-5">
        <span className="text-[10.5px] text-[#94a3b8] mb-1 ml-0.5">{timeStr}</span>
        <div className="bg-[#10b981] text-white rounded-[18px] rounded-tl-[4px] px-4 py-[13px] max-w-[80%] md:max-w-[72%]">
          <p className="text-[13px] leading-[1.65] whitespace-pre-wrap">{msg.content}</p>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  if (isSeller) {
    return (
      <div className="flex flex-col items-end my-2 px-4 md:px-5">
        <span className="text-[10.5px] text-[#94a3b8] mb-1 mr-0.5">{timeStr}</span>
        <div className="bg-[#f97316] text-white rounded-[18px] rounded-tr-[4px] px-4 py-[13px] max-w-[80%] md:max-w-[72%]">
          <p className="text-[13px] leading-[1.65] whitespace-pre-wrap">{msg.content}</p>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  // System/admin messages
  return (
    <div className="flex justify-center my-2 px-4">
      <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold px-[14px] py-[5px] rounded-full">{msg.content}</span>
    </div>
  );
}

// ─── SafeAI Workspace panel (desktop right sidebar) ────────────────────
function WorkspacePanel({ dispute }: { dispute: any }) {
  const adj = dispute.adjudication;
  const confidence = adj?.low_confidence ? 52 : dispute.verdict_action ? 86 : null;
  const txn = dispute.transaction;

  return (
    <div className="w-[240px] border-l border-[#e9eaec] bg-[#fafafa] flex flex-col p-4 gap-[14px] overflow-y-auto">
      <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em]">SAFEAI WORKSPACE</p>

      {/* Reading progress */}
      <div className="bg-white border border-[#e9eaec] rounded-xl p-[13px_14px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-2">READING</p>
        <div className="flex flex-col gap-[6px] text-[11.5px] text-[#64748b]">
          {txn?.product_name && <p className="flex items-center gap-[7px]"><FileText size={11} className="text-[#94a3b8]" /> {txn.product_name} — indexed</p>}
          <p className="flex items-center gap-[7px]"><FileText size={11} className="text-[#94a3b8]" /> {dispute.ai_rounds || 0} AI round{dispute.ai_rounds !== 1 ? 's' : ''} completed</p>
          <p className="flex items-center gap-[7px]"><Clock size={11} className="text-[#94a3b8]" />
            {dispute.created_at ? `Opened ${formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}` : 'Active'}
          </p>
        </div>
      </div>

      {/* Confidence */}
      {confidence !== null && (
        <div className="bg-white border border-[#e9eaec] rounded-xl p-[13px_14px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em]">CONFIDENCE</p>
            <span className="font-['Inter_Tight',sans-serif] text-sm font-extrabold text-[#0f172a]">{confidence}%</span>
          </div>
          <div className="w-full h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${confidence}%`, background: confidence >= 70 ? '#10b981' : '#f59e0b' }} />
          </div>
          {confidence < 60 && (
            <p className="text-[10px] text-[#94a3b8] mt-1.5">SafeAI escalates automatically below 60% confidence.</p>
          )}
        </div>
      )}

      {/* Suggested questions */}
      <div className="bg-white border border-[#e9eaec] rounded-xl p-[13px_14px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-2">SUGGESTED</p>
        <div className="flex flex-col gap-2 text-xs text-[#64748b]">
          <p className="cursor-pointer hover:text-[#10b981] transition-colors leading-snug">Was the delivery confirmed in writing?</p>
          <p className="cursor-pointer hover:text-[#10b981] transition-colors leading-snug">Can you provide the original agreement?</p>
          <p className="cursor-pointer hover:text-[#10b981] transition-colors leading-snug">Were the specs discussed before payment?</p>
        </div>
      </div>

      {/* Pipeline tier */}
      <div className="bg-white border border-[#e9eaec] rounded-xl p-[13px_14px]">
        <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-1">PIPELINE</p>
        <p className="text-[12.5px] text-[#0f172a] font-semibold">{dispute.pipeline_tier || 'STANDARD'} tier</p>
        <p className="text-[10.5px] text-[#94a3b8] mt-0.5">SafeAI v2.3 · mediation active</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
interface DisputeChatPageProps {
  dispute: any;
  safetag: string;
  onBack: () => void;
}

export function DisputeChatPage({ dispute: initialDispute, safetag, onBack }: DisputeChatPageProps) {
  const [dispute, setDispute] = useState(initialDispute);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const txn = dispute.transaction;
  const buyerId: string = txn?.buyer_id || '';
  const sellerId: string = txn?.seller_id || '';
  const dspCode = `DSP-${dispute.id.slice(0, 4).toUpperCase()}`;

  // Derive profileId synchronously — avoids async timing issues with send
  const isBuyer = safetag.toLowerCase() === txn?.buyer?.safetag?.toLowerCase();
  const isSeller = safetag.toLowerCase() === txn?.seller?.safetag?.toLowerCase();
  const profileId = isBuyer ? buyerId : (isSeller ? sellerId : '');

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/disputes/${dispute.id}/messages`);
      setMessages(res.data || []);
    } catch {}
  }, [dispute.id]);

  const fetchDispute = useCallback(async () => {
    try {
      const res = await api.get(`/disputes/transaction/${txn?.id}`);
      if (res.data) setDispute((prev: any) => ({ ...prev, ...res.data }));
    } catch {}
  }, [txn?.id]);

  useEffect(() => {
    fetchMessages();
    fetchDispute();
  }, [fetchMessages, fetchDispute]);

  // Poll while open
  useEffect(() => {
    if (dispute.status !== 'OPEN') return;
    const interval = setInterval(() => {
      fetchMessages();
      fetchDispute();
    }, 5000);
    return () => clearInterval(interval);
  }, [dispute.status, fetchMessages, fetchDispute]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() && pendingFiles.length === 0) return;
    if (!profileId) return;
    setSending(true);

    try {
      let attachments: any[] = [];
      if (pendingFiles.length > 0) {
        const form = new FormData();
        pendingFiles.forEach(f => form.append('files', f));
        const upRes = await api.post(`/disputes/${dispute.id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        attachments = upRes.data || [];
      }
      await api.post(`/disputes/${dispute.id}/messages`, {
        content: input.trim(),
        attachments,
      });
      setInput('');
      setPendingFiles([]);
      fetchMessages();
    } catch {} finally { setSending(false); }
  };

  // Determine current sub-view
  const isResolved = dispute.status === 'RESOLVED';
  const isEscalated = dispute.is_ai_paused;
  const hasVerdict = !!dispute.verdict_action && dispute.status === 'OPEN' && !isEscalated;

  const subView = isResolved ? 'resolution'
    : isEscalated ? 'escalation'
    : hasVerdict ? 'verdict'
    : 'chat';

  // Turn-based chat restriction (mirrors DisputeDetailsView logic)
  const lastMessage = messages[messages.length - 1];
  const hasAdminJoined = messages.some(m =>
    typeof m.content === 'string' &&
    (m.content.includes('[ADMIN_JOINED') || m.sender_type === 'ADMIN')
  );
  const isAiWaitingForMe = lastMessage?.sender_type === 'AI' && (
    lastMessage.content?.toLowerCase().includes(safetag.replace('@', '').toLowerCase()) ||
    (lastMessage.content?.toLowerCase().includes('buyer') && isBuyer) ||
    (lastMessage.content?.toLowerCase().includes('seller') && isSeller) ||
    (lastMessage.content?.toLowerCase().includes('@buyer') && isBuyer) ||
    (lastMessage.content?.toLowerCase().includes('@seller') && isSeller) ||
    (lastMessage.content?.toLowerCase().includes('@all'))
  );
  const restrictedTo: string = dispute?.restricted_to || 'ALL';
  const isRestrictedToMe =
    restrictedTo === 'ALL' ||
    (restrictedTo === 'BUYER' && isBuyer) ||
    (restrictedTo === 'SELLER' && isSeller);
  const canChat = !isResolved &&
    (hasAdminJoined || isAiWaitingForMe ||
      (messages.length <= 1 && lastMessage?.sender_type === 'AI') ||
      messages.length === 0) &&
    isRestrictedToMe;

  const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
    open:      { bg: '#fffbeb', color: '#d97706', label: 'Open' },
    escalated: { bg: '#fff1f2', color: '#e11d48', label: 'Escalated' },
    resolved:  { bg: '#f1f5f9', color: '#475569', label: 'Resolved' },
    verdict:   { bg: '#eff6ff', color: '#2563eb', label: 'Verdict ready' },
  };
  const detailStatusKey = isResolved ? 'resolved' : isEscalated ? 'escalated' : hasVerdict ? 'verdict' : 'open';
  const detailMeta = STATUS_META[detailStatusKey];

  return (
    <div className="flex flex-col h-full relative pb-24 md:pb-0" style={{ backgroundColor: '#f1f5f9' }}>
      {/* ── Top header ── */}
      <div className="shrink-0 bg-white border-b border-[#e9eaec]">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-[6px] px-4 md:px-7 pt-[10px] pb-1 text-[11.5px]">
          <button onClick={onBack} className="flex items-center gap-[5px] text-[#10b981] font-semibold">
            <ArrowLeft size={13} />
            Disputes
          </button>
          <ChevronRight size={10} className="text-[#cbd5e1]" />
          <code className="text-[11.5px] font-bold text-[#475569] bg-[#f1f5f9] px-2 py-[2px] rounded-[5px]">{dspCode}</code>
          {subView !== 'chat' && (
            <>
              <ChevronRight size={10} className="text-[#cbd5e1]" />
              <span className="font-semibold text-[#475569] capitalize">{subView}</span>
            </>
          )}
        </div>

        {/* Three-column party header */}
        <div className="grid grid-cols-3 items-center px-4 md:px-7 py-[10px] gap-2">
          {/* Buyer */}
          <div className="flex items-center gap-[7px] md:gap-[10px]">
            <div className="w-[30px] h-[30px] md:w-8 md:h-8 rounded-full bg-[#dcfce7] text-[#16a34a] font-['Inter_Tight',sans-serif] font-extrabold text-xs flex items-center justify-center shrink-0">
              {txn?.buyer?.first_name?.charAt(0) || 'B'}
            </div>
            <div>
              <p className="text-xs font-bold text-[#0f172a] leading-none">{txn?.buyer?.safetag ? `@${txn.buyer.safetag}` : 'Buyer'}</p>
              <p className="text-[10px] text-[#94a3b8] leading-none mt-[2px]">Buyer</p>
            </div>
          </div>

          {/* SafeAI — center */}
          <div className="flex flex-col items-center gap-[2px]">
            <div className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] rounded-full bg-[#0f172a] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
            </div>
            <p className="text-[9px] md:text-[10px] font-bold text-[#10b981] tracking-[.04em]">SafeAI</p>
          </div>

          {/* Seller */}
          <div className="flex items-center gap-[7px] md:gap-[10px] justify-end">
            <div className="text-right">
              <p className="text-xs font-bold text-[#0f172a] leading-none">{txn?.seller?.safetag ? `@${txn.seller.safetag}` : 'Seller'}</p>
              <p className="text-[10px] text-[#94a3b8] leading-none mt-[2px]">Seller</p>
            </div>
            <div className="w-[30px] h-[30px] md:w-8 md:h-8 rounded-full bg-[#fed7aa] text-[#ea580c] font-['Inter_Tight',sans-serif] font-extrabold text-xs flex items-center justify-center shrink-0">
              {txn?.seller?.first_name?.charAt(0) || 'S'}
            </div>
          </div>
        </div>

        {/* Dispute info strip */}
        <div className="flex items-center gap-[14px] px-4 md:px-7 pb-[10px] border-t border-[#f3f4f6] pt-[7px] flex-wrap">
          <span className="text-[11.5px] font-bold text-[#475569] md:hidden">{dspCode}</span>
          {txn?.product_name && <span className="text-[11.5px] text-[#94a3b8] font-medium truncate">{txn.product_name}</span>}
          {txn?.amount && (
            <span className="text-[11.5px] text-[#94a3b8] font-medium">
              {txn.currency} {Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} in escrow
            </span>
          )}
          <span className="hidden md:inline-flex px-[10px] py-[3px] rounded-full text-[10.5px] font-bold" style={{ background: detailMeta.bg, color: detailMeta.color }}>{detailMeta.label}</span>
          {/* Case files button */}
          <button
            onClick={() => setShowEvidence(true)}
            className="ml-auto flex items-center gap-[5px] text-[11.5px] md:text-xs font-semibold text-[#64748b] hover:text-[#10b981] transition-colors"
          >
            <FolderOpen size={13} />
            Case files
          </button>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — desktop only */}
        {subView === 'chat' && (
          <div className="hidden lg:flex w-[220px] border-r border-[#e9eaec] bg-white flex-col p-4 gap-4 overflow-y-auto shrink-0">
            {/* Escrow */}
            <div>
              <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-[10px]">ESCROW</p>
              <div className="bg-[#f7f8f9] rounded-xl p-[13px_14px] border border-[#e9eaec]">
                <p className="text-[11px] text-[#94a3b8] font-medium mb-1">Locked amount</p>
                <p className="font-['Inter_Tight',sans-serif] text-[20px] font-extrabold text-[#0f172a] tracking-[-.02em]">
                  {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-[#94a3b8] mt-[3px]">{txn?.currency} · {txn?.txn_code}</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-[10px]">TIMELINE</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Dispute opened', done: true },
                  { label: 'SafeAI mediation', done: dispute.ai_rounds > 0 },
                  { label: 'Verdict', done: !!dispute.verdict_action },
                  { label: 'Resolution', done: dispute.status === 'RESOLVED' },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0`} style={{ background: ev.done ? '#10b981' : '#e2e8f0' }} />
                    <span style={{ color: ev.done ? '#0f172a' : '#94a3b8', fontWeight: ev.done ? 600 : 400 }}>{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract excerpt */}
            {txn?.product_name && (
              <div>
                <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.07em] mb-2">CONTRACT</p>
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[11px] p-[11px_12px]">
                  <p className="text-xs text-[#92400e] italic leading-relaxed">"{txn.product_name}"</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center — messages or sub-view */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {subView === 'verdict' ? (
            <VerdictCard dispute={dispute} safetag={safetag} profileId={profileId} onAction={fetchDispute} />
          ) : subView === 'escalation' ? (
            <EscalationView dispute={dispute} messages={messages} />
          ) : subView === 'resolution' ? (
            <ResolutionView dispute={dispute} messages={messages} />
          ) : (
            <>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto py-4">
                {/* Dispute opened system message */}
                <div className="flex justify-center mb-4">
                  <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold px-[14px] py-[5px] rounded-full">
                    Dispute {dspCode} opened · {txn?.product_name} · {txn?.currency} {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {messages.length === 0 && (
                  <div className="flex flex-col items-center py-12 text-center px-4">
                    <Loader2 size={24} className="text-[#cbd5e1] animate-spin mb-3" />
                    <p className="text-xs text-[#94a3b8]">SafeAI is reviewing the case...</p>
                  </div>
                )}

                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} buyerId={buyerId} sellerId={sellerId} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              {dispute.status === 'OPEN' && canChat ? (
                <div className="shrink-0 border-t border-[#e9eaec] bg-white px-4 py-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
                  {pendingFiles.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {pendingFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 bg-[#f1f5f9] rounded-lg px-2 py-1 text-xs text-[#475569]">
                          <FileText size={11} />
                          <span className="truncate max-w-[100px]">{f.name}</span>
                          <button onClick={() => setPendingFiles(pf => pf.filter((_, j) => j !== i))} className="ml-1 text-[#94a3b8] hover:text-[#e11d48]">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-[10px] border border-[#e9eaec] bg-[#f7f8f9] flex items-center justify-center shrink-0 text-[#64748b]">
                      <Paperclip size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => { setPendingFiles(pf => [...pf, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={`Message as ${isBuyer ? txn?.buyer?.safetag : txn?.seller?.safetag} (SafeAI and the other party will see this)...`}
                      rows={1}
                      className="flex-1 resize-none text-[13.5px] text-[#0f172a] placeholder:text-[#94a3b8] bg-[#f7f8f9] border border-[#e9eaec] rounded-xl px-[14px] py-[11px] focus:outline-none focus:border-[#10b981] focus:bg-white min-h-[44px] max-h-[120px]"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || (!input.trim() && pendingFiles.length === 0)}
                      className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center disabled:cursor-not-allowed transition-colors shrink-0"
                      style={{ background: (sending || (!input.trim() && pendingFiles.length === 0)) ? '#e2e8f0' : '#10b981', color: '#fff' }}
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-[#94a3b8] mt-2 text-center">
                    🔒 Encrypted · visible to both parties + SafeAI · evidence permanently logged
                  </p>
                </div>
              ) : dispute.status === 'OPEN' && !canChat ? (
                <div className="shrink-0 border-t border-[#e9eaec] bg-white px-4 py-3 flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#0f172a] flex items-center justify-center shrink-0 opacity-50">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
                  </div>
                  <p className="text-xs text-[#94a3b8] flex-1">
                    Waiting for SafeAI to prompt you before you can respond…
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Right panel — desktop workspace */}
        {subView === 'chat' && (
          <div className="hidden xl:flex">
            <WorkspacePanel dispute={dispute} />
          </div>
        )}
      </div>

      {/* Evidence grid modal */}
      {showEvidence && (
        <EvidenceGrid messages={messages} dispute={dispute} onClose={() => setShowEvidence(false)} />
      )}
    </div>
  );
}
