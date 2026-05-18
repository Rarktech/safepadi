'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Send, Paperclip, FolderOpen, Play, Pause, FileText, Image as ImageIcon,
  Clock, ChevronRight, Loader2, Scale
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
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/50 border border-stone-100 min-w-[200px] mt-1.5">
      <button onClick={toggle} className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
        {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
      </button>
      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
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
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 border border-stone-100 hover:border-emerald-300 transition-colors mt-1.5 text-sm">
      {isImage ? <ImageIcon size={14} className="text-stone-400" /> : <FileText size={14} className="text-stone-400" />}
      <span className="truncate max-w-[160px] text-stone-700">{att.name || 'Attachment'}</span>
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
      <div className="flex flex-col items-center my-2 px-4">
        <div className="flex items-center gap-2 mb-1.5">
          <img src="/assets/images/safeAi.png" alt="SafeAI" className="h-6 w-6 object-contain rounded-full" />
          <span className="text-xs font-bold text-emerald-700">SafeAI</span>
          <span className="text-xs text-stone-400">{timeStr}</span>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl rounded-tl-md rounded-tr-md px-4 py-3 max-w-[70%] shadow-sm">
          <div className="text-sm text-stone-700 leading-relaxed">
            <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
          </div>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  if (isBuyer) {
    return (
      <div className="flex flex-col items-start my-2 px-4">
        <span className="text-xs text-stone-400 mb-1 ml-1">{timeStr}</span>
        <div className="bg-emerald-600 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[75%]">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  if (isSeller) {
    return (
      <div className="flex flex-col items-end my-2 px-4">
        <span className="text-xs text-stone-400 mb-1 mr-1">{timeStr}</span>
        <div className="bg-orange-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[75%]">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  // System/admin messages
  return (
    <div className="flex justify-center my-2 px-4">
      <span className="bg-stone-100 text-stone-500 text-xs px-4 py-1.5 rounded-full">{msg.content}</span>
    </div>
  );
}

// ─── SafeAI Workspace panel (desktop right sidebar) ────────────────────
function WorkspacePanel({ dispute }: { dispute: any }) {
  const adj = dispute.adjudication;
  const confidence = adj?.low_confidence ? 52 : dispute.verdict_action ? 86 : null;
  const txn = dispute.transaction;

  return (
    <div className="w-72 border-l border-stone-100 bg-stone-50/50 flex flex-col p-4 gap-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1">
        <img src="/assets/images/safeAi.png" alt="SafeAI" className="h-5 w-5 object-contain rounded-full" />
        <p className="text-xs font-black text-stone-600 uppercase tracking-widest">SafeAI Workspace</p>
      </div>

      {/* Reading progress */}
      <div className="bg-white border border-stone-100 rounded-xl p-3.5">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Reading</p>
        <div className="flex flex-col gap-1.5 text-xs text-stone-600">
          {txn?.product_name && <p className="flex items-center gap-1.5"><FileText size={11} className="text-stone-400" /> {txn.product_name} — indexed</p>}
          <p className="flex items-center gap-1.5"><FileText size={11} className="text-stone-400" /> {dispute.ai_rounds || 0} AI round{dispute.ai_rounds !== 1 ? 's' : ''} completed</p>
          <p className="flex items-center gap-1.5"><Clock size={11} className="text-stone-400" />
            {dispute.created_at ? `Opened ${formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}` : 'Active'}
          </p>
        </div>
      </div>

      {/* Confidence */}
      {confidence !== null && (
        <div className="bg-white border border-stone-100 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Confidence</p>
            <span className="text-sm font-bold text-stone-700">{confidence}%</span>
          </div>
          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${confidence}%` }} />
          </div>
          {confidence < 60 && (
            <p className="text-[10px] text-stone-400 mt-1.5">SafeAI escalates automatically below 60% confidence.</p>
          )}
        </div>
      )}

      {/* Suggested questions */}
      <div className="bg-white border border-stone-100 rounded-xl p-3.5">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Suggested questions</p>
        <div className="flex flex-col gap-2 text-xs text-stone-600">
          <p className="cursor-pointer hover:text-emerald-700 transition-colors leading-snug">Was the delivery confirmed in writing?</p>
          <p className="cursor-pointer hover:text-emerald-700 transition-colors leading-snug">Can you provide the original agreement?</p>
          <p className="cursor-pointer hover:text-emerald-700 transition-colors leading-snug">Were the specs discussed before payment?</p>
        </div>
      </div>

      {/* Pipeline tier */}
      <div className="bg-white border border-stone-100 rounded-xl p-3.5">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Pipeline</p>
        <p className="text-xs text-stone-600 font-medium">{dispute.pipeline_tier || 'STANDARD'} tier</p>
        <p className="text-[10px] text-stone-400 mt-0.5">SafeAI v2.3 · mediation active</p>
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
        sender_id: profileId,
        sender_type: 'USER',
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

  return (
    <div className="flex flex-col h-full bg-stone-50 relative pb-24 md:pb-0">
      {/* ── Top header ── */}
      <div className="shrink-0 bg-white border-b border-stone-100">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs text-stone-400">
          <button onClick={onBack} className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-medium">
            <ArrowLeft size={13} />
            Disputes
          </button>
          <ChevronRight size={11} />
          <span className="font-mono font-bold text-stone-600">{dspCode}</span>
          {subView !== 'chat' && (
            <>
              <ChevronRight size={11} />
              <span className="font-semibold text-stone-600 capitalize">{subView}</span>
            </>
          )}
        </div>

        {/* Three-column party header */}
        <div className="grid grid-cols-3 items-center px-4 py-3 gap-2">
          {/* Buyer */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                {txn?.buyer?.first_name?.charAt(0) || 'B'}
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800 leading-none">{txn?.buyer?.safetag || 'Buyer'}</p>
                <p className="text-[10px] text-stone-400 leading-none mt-0.5">Buyer</p>
              </div>
            </div>
          </div>

          {/* SafeAI — center */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <img src="/assets/images/safeAi.png" alt="SafeAI" className="h-7 w-7 object-contain rounded-full" />
              <div className="text-center">
                <p className="text-xs font-bold text-stone-800 leading-none">SafeAI</p>
                <p className="text-[10px] text-emerald-600 leading-none mt-0.5">AI Mediator</p>
              </div>
            </div>
          </div>

          {/* Seller */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <div>
                <p className="text-xs font-bold text-stone-800 leading-none text-right">{txn?.seller?.safetag || 'Seller'}</p>
                <p className="text-[10px] text-stone-400 leading-none mt-0.5 text-right">Seller</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                {txn?.seller?.first_name?.charAt(0) || 'S'}
              </div>
            </div>
          </div>
        </div>

        {/* Dispute info strip */}
        <div className="flex items-center gap-3 px-4 pb-3 flex-wrap">
          <span className="text-xs font-mono text-stone-400 font-bold">{dspCode}</span>
          {txn?.product_name && <span className="text-xs text-stone-500 truncate">{txn.product_name}</span>}
          {txn?.amount && (
            <span className="text-xs text-stone-500">
              {txn.currency} {Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} in escrow
            </span>
          )}
          {/* Case files button */}
          <button
            onClick={() => setShowEvidence(true)}
            className="ml-auto flex items-center gap-1 text-xs text-stone-500 hover:text-emerald-600 transition-colors"
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
          <div className="hidden lg:flex w-60 border-r border-stone-100 bg-white flex-col p-4 gap-4 overflow-y-auto shrink-0">
            {/* Escrow */}
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Escrow</p>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <p className="text-xs text-stone-500 mb-0.5">In Escrow</p>
                <p className="text-xl font-bold text-stone-900 flex items-center gap-1.5">
                  🔵 {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">{txn?.currency} · {txn?.txn_code}</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Timeline</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Dispute opened', done: true },
                  { label: 'SafeAI mediation', done: dispute.ai_rounds > 0 },
                  { label: 'Verdict', done: !!dispute.verdict_action },
                  { label: 'Resolution', done: dispute.status === 'RESOLVED' },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ev.done ? 'bg-emerald-500' : 'bg-stone-200'}`} />
                    <span className={ev.done ? 'text-stone-700' : 'text-stone-400'}>{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract excerpt */}
            {txn?.product_name && (
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Contract excerpt</p>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-amber-800 leading-relaxed">"{txn.product_name}"</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center — messages or sub-view */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {subView === 'verdict' ? (
            <div className="flex-1 overflow-y-auto">
              <VerdictCard dispute={dispute} safetag={safetag} profileId={profileId} onAction={fetchDispute} />
            </div>
          ) : subView === 'escalation' ? (
            <div className="flex-1 overflow-y-auto">
              <EscalationView dispute={dispute} messages={messages} />
            </div>
          ) : subView === 'resolution' ? (
            <div className="flex-1 overflow-y-auto">
              <ResolutionView dispute={dispute} messages={messages} />
            </div>
          ) : (
            <>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto py-4">
                {/* Dispute opened system message */}
                <div className="flex justify-center mb-4">
                  <span className="bg-stone-100 text-stone-500 text-xs px-4 py-1.5 rounded-full">
                    Dispute {dspCode} opened · {txn?.product_name} · {txn?.currency} {Number(txn?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {messages.length === 0 && (
                  <div className="flex flex-col items-center py-12 text-center px-4">
                    <Loader2 size={24} className="text-stone-300 animate-spin mb-3" />
                    <p className="text-xs text-stone-400">SafeAI is reviewing the case...</p>
                  </div>
                )}

                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} buyerId={buyerId} sellerId={sellerId} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              {dispute.status === 'OPEN' && canChat ? (
                <div className="shrink-0 border-t border-stone-100 bg-white px-4 py-3">
                  {pendingFiles.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {pendingFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 bg-stone-100 rounded-lg px-2 py-1 text-xs text-stone-600">
                          <FileText size={11} />
                          <span className="truncate max-w-[100px]">{f.name}</span>
                          <button onClick={() => setPendingFiles(pf => pf.filter((_, j) => j !== i))} className="ml-1 text-stone-400 hover:text-red-500">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-stone-400 hover:text-emerald-600 transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => { setPendingFiles(pf => [...pf, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={`Message as ${isBuyer ? txn?.buyer?.safetag : txn?.seller?.safetag} (SafeAI and the other party will see this)...`}
                      rows={1}
                      className="flex-1 resize-none text-sm text-stone-800 placeholder:text-stone-400 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-400 min-h-[42px] max-h-[120px] bg-stone-50"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || (!input.trim() && pendingFiles.length === 0)}
                      className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1.5 text-center">
                    🔒 Encrypted · visible to both parties + SafeAI · evidence is permanently logged
                  </p>
                </div>
              ) : dispute.status === 'OPEN' && !canChat ? (
                <div className="shrink-0 border-t border-stone-100 bg-white px-4 py-3 flex items-center gap-3">
                  <img src="/assets/images/safeAi.png" alt="SafeAI" className="h-5 w-5 rounded-full opacity-50 shrink-0" />
                  <p className="text-xs text-stone-400 flex-1">
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
