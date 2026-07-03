'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';
import posthog from 'posthog-js';

// ─── Attachment chip ────────────────────────────────────────────────────
function AttachmentChip({ att }: { att: any }) {
  const isImage = att.type?.startsWith('image/');
  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-1.5 max-w-[220px] rounded-xl overflow-hidden border border-black/10">
        <img src={att.url} alt={att.name || 'Attachment'} className="w-full h-auto object-cover" />
      </a>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/30 border border-white/20 hover:border-white/40 transition-colors mt-1.5 text-sm">
      <FileText size={14} />
      <span className="truncate max-w-[160px]">{att.name || 'Attachment'}</span>
    </a>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: any }) {
  const isSystem = msg.sender_type === 'SYSTEM';
  const isAdmin = msg.sender_type === 'ADMIN';
  const timeStr = msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : '';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2 px-4">
        <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold px-[14px] py-[5px] rounded-full">{msg.content}</span>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex flex-col items-start my-2 px-4 md:px-5">
        <span className="text-[10.5px] text-[#94a3b8] mb-1 ml-0.5">Support · {timeStr}</span>
        <div className="bg-white border border-[#e2e8f0] rounded-[18px] rounded-tl-[4px] px-4 py-[13px] max-w-[80%] md:max-w-[72%] shadow-sm">
          <div className="text-[13px] text-[#0f172a] leading-[1.65]">
            <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
          </div>
          {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
        </div>
      </div>
    );
  }

  // USER
  return (
    <div className="flex flex-col items-end my-2 px-4 md:px-5">
      <span className="text-[10.5px] text-[#94a3b8] mb-1 mr-0.5">{timeStr}</span>
      <div className="bg-[#10b981] text-white rounded-[18px] rounded-tr-[4px] px-4 py-[13px] max-w-[80%] md:max-w-[72%]">
        <p className="text-[13px] leading-[1.65] whitespace-pre-wrap">{msg.content}</p>
        {msg.attachments?.map((att: any, i: number) => <AttachmentChip key={i} att={att} />)}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
interface SupportChatPageProps {
  ticket: any;
  safetag: string;
  onBack: () => void;
}

export function SupportChatPage({ ticket: initialTicket, safetag, onBack }: SupportChatPageProps) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketCode = `SUP-${ticket.id.slice(0, 4).toUpperCase()}`;
  const isOpen = ticket.status === 'OPEN';

  useEffect(() => {
    posthog.capture('support_ticket_opened', { ticket_id: ticket.id });
  }, [ticket.id]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/support/${ticket.id}/messages`);
      setMessages(res.data || []);
    } catch {}
  }, [ticket.id]);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/support/${ticket.id}`);
      if (res.data) setTicket((prev: any) => ({ ...prev, ...res.data }));
    } catch {}
  }, [ticket.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll while open
  useEffect(() => {
    if (ticket.status !== 'OPEN') return;
    const interval = setInterval(() => {
      fetchMessages();
      fetchTicket();
    }, 5000);
    return () => clearInterval(interval);
  }, [ticket.status, fetchMessages, fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() && pendingFiles.length === 0) return;
    setSending(true);
    try {
      let attachments: any[] = [];
      if (pendingFiles.length > 0) {
        const form = new FormData();
        pendingFiles.forEach(f => form.append('files', f));
        const upRes = await api.post(`/support/${ticket.id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        attachments = upRes.data || [];
      }
      await api.post(`/support/${ticket.id}/messages`, { content: input.trim(), attachments });
      setInput('');
      setPendingFiles([]);
      fetchMessages();
    } catch {} finally { setSending(false); }
  };

  const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
    OPEN:               { bg: '#fffbeb', color: '#d97706', label: 'Open' },
    RESOLVED:           { bg: '#f1f5f9', color: '#475569', label: 'Resolved' },
    HANDLED_EXTERNALLY: { bg: '#f1f5f9', color: '#475569', label: 'Resolved' },
  };
  const meta = STATUS_META[ticket.status] || STATUS_META.OPEN;

  return (
    <div className="flex flex-col h-full relative pb-24 md:pb-0" style={{ backgroundColor: '#f1f5f9' }}>
      {/* ── Top header ── */}
      <div className="shrink-0 bg-white border-b border-[#e9eaec]">
        <div className="flex items-center gap-[6px] px-4 md:px-7 pt-[10px] pb-1 text-[11.5px]">
          <button onClick={onBack} className="flex items-center gap-[5px] text-[#10b981] font-semibold">
            <ArrowLeft size={13} />
            Back
          </button>
        </div>
        <div className="flex items-center gap-[14px] px-4 md:px-7 py-[10px] flex-wrap">
          <code className="text-[11.5px] font-bold text-[#475569] bg-[#f1f5f9] px-2 py-[2px] rounded-[5px]">{ticketCode}</code>
          <span className="text-[11.5px] text-[#94a3b8] font-medium">Support Ticket</span>
          <span className="ml-auto px-[10px] py-[3px] rounded-full text-[10.5px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex justify-center mb-4">
            <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold px-[14px] py-[5px] rounded-full">
              Support ticket {ticketCode} opened
            </span>
          </div>

          {messages.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center px-4">
              <Loader2 size={24} className="text-[#cbd5e1] animate-spin mb-3" />
              <p className="text-xs text-[#94a3b8]">Loading conversation...</p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {isOpen ? (
          <div className="shrink-0 border-t border-[#e9eaec] bg-white px-4 py-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-[#f1f5f9] rounded-lg px-2 py-1 text-xs text-[#475569]">
                    <FileText size={11} />
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <button onClick={() => setPendingFiles(pf => pf.filter((_, j) => j !== i))} className="ml-1 text-[#94a3b8] hover:text-[#e11d48]">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-[10px] border border-[#e9eaec] bg-[#f7f8f9] flex items-center justify-center shrink-0 text-[#64748b]">
                <Paperclip size={16} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={e => { setPendingFiles(pf => [...pf, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message our support team..."
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
          </div>
        ) : (
          <div className="shrink-0 border-t border-[#e9eaec] bg-white px-4 py-3 text-center">
            <p className="text-xs text-[#94a3b8]">
              {ticket.resolution_notes ? `Resolved: ${ticket.resolution_notes}` : 'This support ticket has been resolved.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
