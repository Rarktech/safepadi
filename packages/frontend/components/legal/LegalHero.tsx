export interface HeroStat {
    value: string;
    label: string;
    accent?: boolean;
}

interface LegalHeroProps {
    titlePrefix: string;
    titleEmphasis: string;
    description: string;
    stats: HeroStat[];
    dateCaption: string;
}

export function LegalHero({ titlePrefix, titleEmphasis, description, stats, dateCaption }: LegalHeroProps) {
    return (
        <header style={{ background: "#0f172a", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(16,185,129,.15) 0%,transparent 60%)", pointerEvents: "none" }} />
            <div className="sf-legal-hero-inner" style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", padding: "128px 32px 80px", position: "relative", zIndex: 2 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 99, padding: "5px 14px", marginBottom: 26 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#10b981", letterSpacing: ".07em", textTransform: "uppercase", fontFamily: "'Inter Tight', sans-serif" }}>Legal Document</span>
                </div>
                <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 58, fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-.035em", lineHeight: 1.04 }}>
                    {titlePrefix} <em style={{ color: "#10b981", fontStyle: "italic" }}>{titleEmphasis}</em>
                </h1>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,.55)", margin: "0 0 48px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>{description}</p>
                <div className="sf-legal-hero-stats" style={{ display: "flex", alignItems: "stretch", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, overflow: "hidden", maxWidth: 660, margin: "0 auto", background: "rgba(255,255,255,.04)" }}>
                    {stats.map((stat, i) => (
                        <div
                            key={stat.label}
                            className="sf-legal-hero-stat"
                            style={{ flex: 1, padding: "20px 22px", borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,.1)" : "none", textAlign: "center" }}
                        >
                            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 800, color: stat.accent ? "#10b981" : "#fff", marginBottom: 3 }}>{stat.value}</div>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", fontWeight: 500, letterSpacing: ".02em" }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)", marginTop: 20 }}>{dateCaption}</p>
            </div>
        </header>
    );
}
