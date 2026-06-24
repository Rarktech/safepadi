"use client";
import Link from "next/link";

interface LegalNavProps {
    scrolled: boolean;
    menuOpen: boolean;
    toggleMenu: () => void;
    closeMenu: () => void;
    crossPageHref: string;
    crossPageLabel: string;
}

const NAV_LINKS = ["Product", "Services", "Pricing"];

export function LegalNav({ scrolled, menuOpen, toggleMenu, closeMenu, crossPageHref, crossPageLabel }: LegalNavProps) {
    const linkColor = scrolled ? "#475569" : "rgba(255,255,255,.78)";
    const navBtnStyle: React.CSSProperties = {
        background: scrolled ? "#0f172a" : "rgba(255,255,255,.13)",
        color: "#fff",
        border: scrolled ? "none" : "1px solid rgba(255,255,255,.22)",
        borderRadius: "999px",
        padding: "9px 20px",
        fontSize: "13.5px",
        fontWeight: 700,
        textDecoration: "none",
        cursor: "pointer",
        transition: "all .18s",
        display: "inline-block",
        whiteSpace: "nowrap",
    };

    return (
        <>
            <nav
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: scrolled ? "rgba(255,255,255,.97)" : "transparent",
                    backdropFilter: scrolled ? "blur(14px)" : "none",
                    WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
                    borderBottom: `1px solid ${scrolled ? "#e9eaec" : "rgba(255,255,255,.1)"}`,
                    transition: "all .22s ease",
                    display: "flex",
                    alignItems: "center",
                    height: "64px",
                }}
            >
                <div style={{ maxWidth: 1240, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
                        <img
                            src={scrolled ? "/assets/safeeely-logo.png" : "/logo-main.svg"}
                            alt="Safeeely"
                            style={{ height: scrolled ? 24 : 30, width: "auto", display: "block", transition: "opacity .15s" }}
                        />
                    </Link>
                    <div className="sf-legal-navlinks" style={{ alignItems: "center", gap: 30, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
                        {NAV_LINKS.map((l) => (
                            <a key={l} href="#" style={{ fontSize: 14, fontWeight: 500, color: linkColor, textDecoration: "none", transition: "color .14s" }}>
                                {l}
                            </a>
                        ))}
                        <Link href={crossPageHref} style={{ fontSize: 14, fontWeight: 500, color: linkColor, textDecoration: "none", transition: "color .14s" }}>
                            {crossPageLabel}
                        </Link>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <Link href="/@safeeely" style={navBtnStyle}>
                            Get Started →
                        </Link>
                        <button
                            className="sf-legal-burger"
                            onClick={toggleMenu}
                            aria-label="Menu"
                            style={{
                                width: 40,
                                height: 40,
                                border: "1px solid rgba(255,255,255,.2)",
                                borderRadius: 10,
                                background: "rgba(255,255,255,.1)",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                flexDirection: "column",
                                gap: 4,
                            }}
                        >
                            <span style={{ display: "block", width: 16, height: 2, background: "#fff", borderRadius: 2 }} />
                            <span style={{ display: "block", width: 16, height: 2, background: "#fff", borderRadius: 2 }} />
                            <span style={{ display: "block", width: 16, height: 2, background: "#fff", borderRadius: 2 }} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile menu */}
            <div
                style={{
                    position: "fixed",
                    top: 64,
                    left: 0,
                    right: 0,
                    zIndex: 99,
                    background: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    maxHeight: menuOpen ? 400 : 0,
                    overflow: "hidden",
                    padding: menuOpen ? "20px 24px 28px" : "0 24px",
                    transition: "all .28s cubic-bezier(.16,1,.3,1)",
                    borderBottom: menuOpen ? "1px solid #e9eaec" : "none",
                    boxShadow: menuOpen ? "0 16px 40px rgba(0,0,0,.1)" : "none",
                }}
            >
                <Link href="/" onClick={closeMenu} style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 19, fontWeight: 700, color: "#0f172a", textDecoration: "none", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    Home
                </Link>
                {NAV_LINKS.map((l) => (
                    <a key={l} href="#" onClick={closeMenu} style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 19, fontWeight: 700, color: "#0f172a", textDecoration: "none", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        {l}
                    </a>
                ))}
                <Link href={crossPageHref} onClick={closeMenu} style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 19, fontWeight: 700, color: "#0f172a", textDecoration: "none", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    {crossPageLabel}
                </Link>
                <Link href="/@safeeely" onClick={closeMenu} style={{ marginTop: 16, background: "#0f172a", color: "#fff", textDecoration: "none", borderRadius: 999, padding: 14, textAlign: "center", fontWeight: 700, fontSize: 15 }}>
                    Get Started →
                </Link>
            </div>
        </>
    );
}
