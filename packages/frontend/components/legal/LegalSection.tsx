import { ReactNode } from "react";

interface LegalSectionProps {
    id: string;
    number: string;
    title: string;
    tone?: "default" | "highlight" | "danger";
    children: ReactNode;
}

const TONE_STYLES = {
    default: { pillBg: "#f0fdf4", pillColor: "#059669", boxBg: null, boxBorder: null },
    highlight: { pillBg: "#f0fdf4", pillColor: "#059669", boxBg: "#f0fdf4", boxBorder: "#d1fae5" },
    danger: { pillBg: "#fff1f2", pillColor: "#e11d48", boxBg: "#fff1f2", boxBorder: "#fecdd3" },
} as const;

export function LegalSection({ id, number, title, tone = "default", children }: LegalSectionProps) {
    const t = TONE_STYLES[tone];
    const body = t.boxBg ? (
        <div style={{ background: t.boxBg, border: `1px solid ${t.boxBorder}`, borderRadius: 16, padding: "26px 28px" }}>{children}</div>
    ) : (
        children
    );

    return (
        <div id={id} data-section={number} style={{ marginBottom: 60, scrollMarginTop: 90 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ display: "inline-flex", padding: "3px 10px", background: t.pillBg, color: t.pillColor, borderRadius: 99, fontSize: 10, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: ".05em", flexShrink: 0 }}>
                    {number.padStart(2, "0")}
                </span>
                <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-.02em", lineHeight: 1.2 }}>{title}</h2>
            </div>
            {body}
        </div>
    );
}
