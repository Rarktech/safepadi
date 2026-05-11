'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, CreditCard, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ─── Brand SVG Icons ─────────────────────────────────────────────────────────

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
    </svg>
  );
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, {
  label: string;
  bg: string;
  icon: React.ReactNode;
  getOpenUrl?: (txnId: string) => string | null;
}> = {
  telegram: {
    label: 'Telegram',
    bg: 'bg-[#2AABEE]',
    icon: <TelegramIcon />,
    getOpenUrl: (txnId) => {
      const base = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;
      return base ? `${base}?start=resume_${txnId}` : null;
    },
  },
  discord: {
    label: 'Discord',
    bg: 'bg-[#5865F2]',
    icon: <DiscordIcon />,
    getOpenUrl: () => process.env.NEXT_PUBLIC_DISCORD_BOT_URL ?? null,
  },
  whatsapp: {
    label: 'WhatsApp',
    bg: 'bg-[#25D366]',
    icon: <WhatsAppIcon />,
  },
  instagram: {
    label: 'Instagram',
    bg: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]',
    icon: <InstagramIcon />,
  },
  messenger: {
    label: 'Messenger',
    bg: 'bg-[#0084FF]',
    icon: <MessengerIcon />,
  },
  apple: {
    label: 'Apple',
    bg: 'bg-slate-900',
    icon: <AppleIcon />,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── useCopy hook ─────────────────────────────────────────────────────────────

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

// ─── Platform card ────────────────────────────────────────────────────────────

function PlatformCard({ account, txnId, txnCode }: { account: LinkedAccount; txnId: string; txnCode: string }) {
  const meta = PLATFORM_META[account.platform] ?? {
    label: account.platform,
    bg: 'bg-slate-500',
    icon: null,
  };
  const resumeMsg = `resume ${txnCode}`;
  const { copied, copy } = useCopy(resumeMsg);
  const openUrl = meta.getOpenUrl ? meta.getOpenUrl(txnId) : null;
  const isTelegram = account.platform === 'telegram';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
      {/* Brand icon */}
      <div className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
        {meta.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
        {isTelegram
          ? <p className="text-xs text-slate-400">Taps in and resumes automatically</p>
          : <p className="text-xs text-slate-400 truncate">Send: <span className="font-mono text-slate-600">{resumeMsg}</span></p>
        }
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        {!isTelegram && (
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs text-white px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-90 ${meta.bg}`}
          >
            {isTelegram ? 'Continue' : 'Open'}
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function ContinueTransactionModal({ txnId, txnCode, txnTitle, safetag, onClose }: ContinueTransactionModalProps) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/profiles/${encodeURIComponent(safetag)}/linked-accounts`)
      .then(res => setAccounts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [safetag]);

  return (
    /* Backdrop — z-[60] guarantees above the mobile nav (z-50) */
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Sheet — max-h + flex-col so footer is always pinned */}
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Continue Transaction</h2>
            {txnTitle && <p className="text-xs text-slate-500 mt-0.5 truncate">"{txnTitle}"</p>}
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{txnCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          <p className="text-xs text-slate-500 mb-3">
            Choose a platform to continue this trade and proceed to payment:
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No connected platforms found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((acc, i) => (
                <PlatformCard key={i} account={acc} txnId={txnId} txnCode={txnCode} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
        </div>

        {/* Pinned footer — always visible above home indicator */}
        <div className="shrink-0 px-5 pt-3 pb-8 border-t border-slate-100 bg-white">
          <a
            href={`/pay/${txnId}`}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
          >
            <CreditCard size={16} />
            Pay Now on Web
          </a>
        </div>
      </div>
    </div>
  );
}
