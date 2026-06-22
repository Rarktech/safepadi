'use client';

import { useState } from 'react';
import { FileText, Image, Video, Link, X } from 'lucide-react';

interface EvidenceItem {
  name: string;
  url: string;
  type: string;
  size?: number;
  owner: 'BUYER' | 'SELLER' | 'CONTRACT' | 'AI';
  messageId: string;
  senderId: string | null;
  senderType: string;
  createdAt: string;
  isDecisive?: boolean;
}

const OWNER_META: Record<string, { bg: string; color: string; label: string }> = {
  BUYER: { bg: '#dcfce7', color: '#166534', label: 'Buyer' },
  SELLER: { bg: '#fed7aa', color: '#c2410c', label: 'Seller' },
  CONTRACT: { bg: '#f1f5f9', color: '#475569', label: 'Contract' },
  AI: { bg: '#e0f2fe', color: '#0369a1', label: 'SafeAI' },
};

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image size={22} className="text-[#94a3b8]" />;
  if (type.startsWith('video/')) return <Video size={22} className="text-[#94a3b8]" />;
  if (type === 'application/pdf' || type.includes('document')) return <FileText size={22} className="text-[#94a3b8]" />;
  return <Link size={22} className="text-[#94a3b8]" />;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessOwner(msg: any, txn: any): EvidenceItem['owner'] {
  if (msg.sender_type === 'AI' || !msg.sender_id) return 'AI';
  if (msg.sender_id === txn?.buyer_id) return 'BUYER';
  if (msg.sender_id === txn?.seller_id) return 'SELLER';
  return 'CONTRACT';
}

export function EvidenceGrid({ messages, dispute, onClose }: { messages: any[]; dispute: any; onClose: () => void }) {
  const [filter, setFilter] = useState<'ALL' | 'AI' | 'BUYER' | 'SELLER' | 'CONTRACT'>('ALL');

  // Flatten all attachments from messages
  const items: EvidenceItem[] = messages
    .filter(m => m.attachments && m.attachments.length > 0)
    .flatMap(m =>
      (m.attachments as any[]).map(att => ({
        name: att.name || 'File',
        url: att.url || '',
        type: att.type || '',
        size: att.size,
        owner: guessOwner(m, dispute.transaction),
        messageId: m.id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        createdAt: m.created_at,
        isDecisive: false,
      }))
    );

  const filtered = filter === 'ALL' ? items : items.filter(i => i.owner === filter);

  const counts = {
    ALL: items.length,
    AI: items.filter(i => i.owner === 'AI').length,
    BUYER: items.filter(i => i.owner === 'BUYER').length,
    SELLER: items.filter(i => i.owner === 'SELLER').length,
    CONTRACT: items.filter(i => i.owner === 'CONTRACT').length,
  };

  const filterTabs: Array<{ key: typeof filter; label: string }> = [
    { key: 'ALL', label: `All ${counts.ALL}` },
    { key: 'AI', label: `SafeAI ${counts.AI}` },
    { key: 'BUYER', label: `Buyer ${counts.BUYER}` },
    { key: 'SELLER', label: `Seller ${counts.SELLER}` },
    { key: 'CONTRACT', label: `Contract ${counts.CONTRACT}` },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-[#0f172a]/50 backdrop-blur-[2px] flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-[900px] rounded-t-[24px] md:rounded-[20px] max-h-[90vh] md:max-h-[84vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-[18px_22px] border-b border-[#f3f4f6] shrink-0">
          <div>
            <h2 className="font-['Inter_Tight',sans-serif] text-[17px] font-extrabold text-[#0f172a] tracking-[-.01em]">Case evidence</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">{items.length} items · SafeAI has indexed everything</p>
          </div>
          <button onClick={onClose} className="w-[34px] h-[34px] rounded-[9px] border border-[#e9eaec] bg-[#f7f8f9] flex items-center justify-center">
            <X size={13} className="text-[#64748b]" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto px-[22px] py-3 border-b border-[#f3f4f6] hide-scrollbar shrink-0">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`whitespace-nowrap px-[14px] py-[7px] rounded-full text-xs font-semibold border transition-colors ${
                filter === tab.key ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-[#64748b] border-[#e9eaec]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SafeAI banner */}
        {items.length > 0 && (
          <div className="mx-[22px] mt-[14px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-[11px] p-[10px_14px] flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#0f172a] flex items-center justify-center shrink-0">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /></svg>
            </div>
            <p className="text-xs text-[#166534]">
              I've indexed all {items.length} items. {counts.AI > 0 ? `${counts.AI} flagged as decisive.` : 'Reviewing all evidence.'}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-[14px_22px_22px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[#94a3b8] text-sm font-medium">No evidence in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((item, i) => {
                const meta = OWNER_META[item.owner];
                return (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-[#e9eaec] rounded-[14px] overflow-hidden hover:border-[#10b981] transition-colors"
                  >
                    {/* Preview area */}
                    <div className="relative aspect-square bg-[#f7f8f9] flex items-center justify-center">
                      {item.type.startsWith('image/') && item.url ? (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          {item.type.startsWith('video/') && (
                            <div className="absolute top-2 left-2 bg-black/40 rounded px-1.5 py-0.5 text-white text-[10px] flex items-center gap-1">
                              <Video size={10} /> video
                            </div>
                          )}
                          <FileIcon type={item.type} />
                        </div>
                      )}
                      {/* Owner badge */}
                      <span className="absolute top-2 right-2 text-[9.5px] font-bold px-[7px] py-[2px] rounded-full" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      {/* Decisive tag */}
                      {item.isDecisive && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded-full">+ SafeAI flag</span>
                      )}
                    </div>
                    {/* Card footer */}
                    <div className="p-[9px_11px]">
                      <p className="text-[11.5px] font-bold text-[#0f172a] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#94a3b8] truncate mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {item.size ? ` · ${formatBytes(item.size)}` : ''}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
