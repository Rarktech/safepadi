import { ReactNode } from "react";

interface LegalCardProps {
    title: string;
    children: ReactNode;
}

export function LegalCard({ title, children }: LegalCardProps) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e9eaec", borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 700, color: "#059669", margin: "0 0 8px" }}>{title}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#64748b", margin: 0 }}>{children}</p>
        </div>
    );
}

export function LegalCardGrid({ columns, children }: { columns: 2 | 3; children: ReactNode }) {
    return (
        <div
            className={columns === 3 ? "sf-legal-g3" : "sf-legal-g2"}
            style={{ display: "grid", gridTemplateColumns: columns === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14, marginBottom: 22 }}
        >
            {children}
        </div>
    );
}
