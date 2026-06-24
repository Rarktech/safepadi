import { ReactNode } from "react";

export function LegalPillRow({ children }: { children: ReactNode }) {
    return <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>{children}</div>;
}

export function LegalPill({ children }: { children: ReactNode }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", background: "#f1f5f9", color: "#475569", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
            {children}
        </span>
    );
}
