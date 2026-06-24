export interface TocEntry {
    id: string;
    number: string;
    label: string;
}

interface LegalSidebarTocProps {
    entries: TocEntry[];
    activeSection: string | null;
    cardTitle: string;
    cardEmail: string;
    onLinkClick: (id: string) => void;
}

export function LegalSidebarToc({ entries, activeSection, cardTitle, cardEmail, onLinkClick }: LegalSidebarTocProps) {
    return (
        <aside className="sf-legal-toc-wrap sf-legal-sb" style={{ width: 228, flexShrink: 0, position: "sticky", top: 80, maxHeight: "calc(100vh - 96px)", overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", padding: "0 14px 10px 16px", marginBottom: 4 }}>On This Page</div>
            {entries.map((entry) => {
                const on = entry.number === activeSection;
                return (
                    <a
                        key={entry.id}
                        href={`#${entry.id}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onLinkClick(entry.id);
                        }}
                        className="sf-legal-tl"
                        style={{
                            display: "block",
                            padding: "6px 14px 6px 16px",
                            fontSize: 12,
                            fontWeight: on ? 700 : 500,
                            color: on ? "#10b981" : "#64748b",
                            textDecoration: "none",
                            borderLeft: `2px solid ${on ? "#10b981" : "transparent"}`,
                            background: on ? "#f0fdf4" : "transparent",
                            transition: "color .13s,background .13s,border-color .13s,font-weight .13s",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {entry.number}. {entry.label}
                    </a>
                );
            })}
            <div style={{ marginTop: 24, padding: "14px 16px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #d1fae5" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#065f46", marginBottom: 4 }}>{cardTitle}</div>
                <div style={{ fontSize: 11.5, color: "#059669", lineHeight: 1.5 }}>
                    <a href={`mailto:${cardEmail}`} style={{ color: "#059669", textDecoration: "none" }}>
                        {cardEmail}
                    </a>
                </div>
            </div>
        </aside>
    );
}
