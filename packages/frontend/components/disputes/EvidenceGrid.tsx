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

const OWNER_COLORS: Record<string, string> = {
  BUYER: 'bg-emerald-100 text-emerald-700',
  SELLER: 'bg-orange-100 text-orange-700',
  CONTRACT: 'bg-stone-100 text-stone-600',
  AI: 'bg-teal-100 text-teal-700',
};

const OWNER_LABELS: Record<string, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  CONTRACT: 'Contract',
  AI: 'SafeAI',
};

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image size={28} className="text-stone-300" />;
  if (type.startsWith('video/')) return <Video size={28} className="text-stone-300" />;
  if (type === 'application/pdf' || type.includes('document')) return <FileText size={28} className="text-stone-300" />;
  return <Link size={28} className="text-stone-300" />;
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
    { key: 'AI', label: `SafeAI-flagged ${counts.AI}` },
    { key: 'BUYER', label: `Buyer ${counts.BUYER}` },
    { key: 'SELLER', label: `Seller ${counts.SELLER}` },
    { key: 'CONTRACT', label: `Contract ${counts.CONTRACT}` },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-4xl md:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-900 text-lg">Case evidence</h2>
            <p className="text-sm text-stone-500">{items.length} items · SafeAI has indexed everything</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-stone-100 no-scrollbar">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === tab.key ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SafeAI banner */}
        {items.length > 0 && (
          <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
            <img src="/logo-main.svg" alt="SafeAI" className="h-5 w-5 object-contain mt-0.5" />
            <p className="text-xs text-emerald-700">
              I've indexed all {items.length} items. {counts.AI > 0 ? `Flagged ${counts.AI} as decisive.` : 'Reviewing all evidence.'}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-stone-400 text-sm">No evidence in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  {/* Preview area */}
                  <div className="relative aspect-square bg-stone-50 flex items-center justify-center border-b border-stone-100">
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
                    <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${OWNER_COLORS[item.owner]}`}>
                      {OWNER_LABELS[item.owner]}
                    </span>
                    {/* Decisive tag */}
                    {item.isDecisive && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">+ SafeAI flag</span>
                    )}
                  </div>
                  {/* Card footer */}
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-stone-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {item.size ? ` · ${formatBytes(item.size)}` : ''}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
