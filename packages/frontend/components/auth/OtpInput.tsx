'use client';

import { useRef } from 'react';

export function OtpInput({
    value,
    onChange,
    error,
    onEnter,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    error?: boolean;
    onEnter?: () => void;
}) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const setDigit = (idx: number, digit: string) => {
        const next = value.slice();
        next[idx] = digit;
        onChange(next);
    };

    return (
        <div className="flex gap-[7px] w-full justify-between">
            {value.map((digit, i) => (
                <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoComplete="one-time-code"
                    className={`w-11 min-w-0 h-[58px] text-center font-['Inter_Tight',sans-serif] text-[22px] font-bold text-[#0f172a] bg-[#f7f8f9] border-[1.5px] rounded-[13px] outline-none transition-all duration-150 caret-[#10b981] focus:border-[#10b981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:bg-white focus:-translate-y-0.5 ${digit ? 'border-[#0f172a] bg-white' : 'border-[#edeff3]'} ${error ? 'border-[#e11d48]' : ''}`}
                    onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(-1);
                        setDigit(i, v);
                        if (v && i < value.length - 1) refs.current[i + 1]?.focus();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                            if (!value[i] && i > 0) {
                                setDigit(i - 1, '');
                                refs.current[i - 1]?.focus();
                            } else {
                                setDigit(i, '');
                            }
                        } else if (e.key === 'Enter') {
                            onEnter?.();
                        } else if (e.key === 'ArrowLeft' && i > 0) {
                            refs.current[i - 1]?.focus();
                        } else if (e.key === 'ArrowRight' && i < value.length - 1) {
                            refs.current[i + 1]?.focus();
                        }
                    }}
                    onPaste={(e) => {
                        e.preventDefault();
                        const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, value.length - i);
                        if (!txt) return;
                        const next = value.slice();
                        txt.split('').forEach((c, k) => { next[i + k] = c; });
                        onChange(next);
                        const last = Math.min(i + txt.length, value.length - 1);
                        refs.current[last]?.focus();
                    }}
                />
            ))}
        </div>
    );
}

export function focusOtpBox(idx: number) {
    document.getElementById(`otp-${idx}`)?.focus();
}
