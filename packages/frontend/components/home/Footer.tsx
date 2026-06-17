"use client";
import { useEffect, useRef } from "react";

export function Footer() {
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = linksRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          (en.target as HTMLElement).style.opacity = "1";
          (en.target as HTMLElement).style.transform = "translateY(0)";
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    setTimeout(() => { if (el) io.observe(el); }, 120);
    return () => io.disconnect();
  }, []);

  const linkStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 400,
    color: "#475569", textDecoration: "none",
  };
  const headerStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600,
    color: "#fff", marginBottom: "4px",
  };

  return (
    <div style={{ background: "#0f172a", width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Divider */}
      <div style={{ borderTop: "1px solid #1e293b", width: "100%", position: "relative", zIndex: 2 }} />

      {/* Footer links */}
      <div
        ref={linksRef}
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "52px 48px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "48px", position: "relative", zIndex: 2, flexWrap: "wrap", opacity: 0, transform: "translateY(28px)", transition: "opacity .75s .15s cubic-bezier(.16,1,.3,1),transform .75s .15s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* Brand */}
        <div style={{ maxWidth: "260px" }}>
          <a href="#" style={{ display: "inline-block", marginBottom: "14px", textDecoration: "none" }}>
            <img src="/uploads/Safeeely Wordmark -w (3)-9003ad04.webp" alt="Safeeely" style={{ height: "28px", width: "auto", display: "block" }} />
          </a>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.4, color: "#475569", margin: 0 }}>
            The escrow layer for the social economy. Secure every deal, anywhere.
          </p>
        </div>

        {/* Link columns */}
        <div className="sf-footer-links" style={{ display: "flex", gap: "64px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={headerStyle}>Product</div>
            <a href="#" style={linkStyle}>How it works</a>
            <a href="#" style={linkStyle}>Pricing</a>
            <a href="#" style={linkStyle}>Security</a>
            <a href="#" style={linkStyle}>Changelog</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={headerStyle}>Support</div>
            <a href="#" style={linkStyle}>Help Center</a>
            <a href="#" style={linkStyle}>FAQ</a>
            <a href="#" style={linkStyle}>Contact</a>
            <a href="#" style={linkStyle}>Ambassadors</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={headerStyle}>Legal</div>
            <a href="#" style={linkStyle}>Privacy Policy</a>
            <a href="#" style={linkStyle}>Terms of Service</a>
            <a href="#" style={linkStyle}>Cookie Policy</a>
            <a href="#" style={linkStyle}>AML Policy</a>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", overflow: "hidden", height: "160px", marginTop: "-20px" }}>
        <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: "clamp(120px,14vw,190px)", color: "#111c2e", letterSpacing: "-.04em", lineHeight: 1, whiteSpace: "nowrap", position: "absolute", bottom: "-16px", left: "48px", pointerEvents: "none", userSelect: "none" }}>
          Safeeely
        </div>
      </div>
    </div>
  );
}
