'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, CreditCard, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface LinkedAccount {
  platform: string;
  platform_id: string;
  is_primary: boolean;
}

interface ContinueTransactionModalProps {
  txnId: string;
  txnCode: string;
  txnTitle?: string;
  safetag: string;
  onClose: () => void;
}

const PLATFORM_META: Record<string, { label: string; color: string; icon: string; openUrl?: string }> = {
  telegram:  { label: 'Telegram',  color: 'bg-sky-500',    icon: '✈️',  openUrl: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL },
  discord:   { label: 'Discord',   color: 'bg-indigo-500', icon: '🎮',  openUrl: process.env.NEXT_PUBLIC_DISCORD_BOT_URL },
  whatsapp:  { label: 'WhatsApp',  color: 'bg-emerald-500',icon: '💬' },
  instagram: { label: 'Instagram', color: 'bg-pink-500',   icon: '📸' },
  messenger: { label: 'Messenger', color: 'bg-blue-500',   icon: '💙' },
  apple:     { label: 'Apple',     color: 'bg-slate-800',  icon: '🍎' },
};

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

function PlatformCard({
  account,
  txnId,
  txnCode,
}: {
  account: LinkedAccount;
  txnId: string;
  txnCode: string;
}) {
  const meta = PLATFORM_META[account.platform] ?? { label: account.platform, color: 'bg-slate-500', icon: '🔗' };
  const resumeMsg = `resume ${txnCode}`;
  const { copied, copy } = useCopy(resumeMsg);

  // Telegram gets a direct deep link; others get copy + open
  const isTelegram = account.platform === 'telegram';
  const telegramUrl = isTelegram && meta.openUrl
    ? `${meta.openUrl}?start=resume_${txnId}`
    : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
      <div className={`w-10 h-10 rounded-full ${meta.color} flex items-center justify-center text-lg shrink-0`}>
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
        {!isTelegram && (
          <p className="text-xs text-slate-400 truncate">Send: <span className="font-mono text-slate-600">{resumeMsg}</span></p>
        )}
        {isTelegram && (
          <p className="text-xs text-slate-400">Opens bot and resumes automatically</p>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {/* Copy message button (non-Telegram platforms, or fallback) */}
        {!isTelegram && (
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}

        {/* Open platform button */}
        {(telegramUrl || meta.openUrl) && (
          <a
            href={telegramUrl ?? meta.openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs text-white px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-90 ${meta.color}`}
          >
            {isTelegram ? 'Continue' : 'Open'}
            <ExternalLink size={11} />
          </a>
        )}

        {/* If no URL configured, just show copy */}
        {!telegramUrl && !meta.openUrl && !isTelegram && null}
      </div>
    </div>
  );
}

export function ContinueTransactionModal({
  txnId,
  txnCode,
  txnTitle,
  safetag,
  onClose,
}: ContinueTransactionModalProps) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/profiles/${encodeURIComponent(safetag)}/linked-accounts`)
      .then(res => setAccounts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [safetag]);

  const payUrl = `/pay/${txnId}`;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Continue Transaction</h2>
            {txnTitle && <p className="text-xs text-slate-500 mt-0.5 truncate">"{txnTitle}"</p>}
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{txnCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6">
          <p className="text-xs text-slate-500 mb-3">
            Choose a platform to continue this trade and proceed to payment:
          </p>

          {/* Platform list */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No connected platforms found.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {accounts.map((acc, i) => (
                <PlatformCard key={i} account={acc} txnId={txnId} txnCode={txnCode} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Direct web pay */}
          <a
            href={payUrl}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            <CreditCard size={16} />
            Pay Now on Web
          </a>
        </div>
      </div>
    </div>
  );
}
