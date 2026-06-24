import { CSSProperties, ReactNode } from "react";

export function LegalP({ children, mb = 14, color = "#374151" }: { children: ReactNode; mb?: number; color?: string }) {
    return <p style={{ fontSize: 15, lineHeight: 1.78, color, margin: `0 0 ${mb}px` }}>{children}</p>;
}

export function LegalH3({ children, mb = 12 }: { children: ReactNode; mb?: number }) {
    return <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a", margin: `0 0 ${mb}px`, letterSpacing: "-.01em" }}>{children}</h3>;
}

export function LegalUl({ children, mb = 16, color = "#374151" }: { children: ReactNode; mb?: number; color?: string }) {
    return <ul style={{ fontSize: 15, lineHeight: 1.78, color, paddingLeft: 22, margin: `0 0 ${mb}px` }}>{children}</ul>;
}

export function LegalOl({ children, mb = 16, color = "#374151" }: { children: ReactNode; mb?: number; color?: string }) {
    return <ol style={{ fontSize: 15, lineHeight: 1.78, color, paddingLeft: 22, margin: `0 0 ${mb}px` }}>{children}</ol>;
}

export function LegalLi({ children, mb = 8 }: { children: ReactNode; mb?: number }) {
    return <li style={{ marginBottom: mb }}>{children}</li>;
}

const CALLOUT_TONES: Record<string, { bg: string; border: string; titleColor: string; textColor: string }> = {
    emerald: { bg: "#f0fdf4", border: "#d1fae5", titleColor: "#064e3b", textColor: "#065f46" },
    amber: { bg: "#fff8ed", border: "#fed7aa", titleColor: "#92400e", textColor: "#78350f" },
    rose: { bg: "#fff1f2", border: "#fecdd3", titleColor: "#881337", textColor: "#881337" },
};

export function LegalCallout({ tone, title, children, mb = 22 }: { tone: "emerald" | "amber" | "rose"; title?: string; children: ReactNode; mb?: number }) {
    const t = CALLOUT_TONES[tone];
    return (
        <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 16, padding: tone === "emerald" && !title ? "18px 22px" : "24px 28px", marginBottom: mb }}>
            {title && (
                <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 17, fontWeight: 800, color: t.titleColor, margin: "0 0 12px" }}>{title}</h3>
            )}
            <div style={{ fontSize: 15, lineHeight: 1.78, color: t.textColor } as CSSProperties}>{children}</div>
        </div>
    );
}

export function LegalNotice({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "1px solid #e9eaec", borderRadius: 12, padding: "14px 18px", marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0, display: "inline-block" }} />
            <p style={{ fontSize: 13.5, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{children}</p>
        </div>
    );
}
