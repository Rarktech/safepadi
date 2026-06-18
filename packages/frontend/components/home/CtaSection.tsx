"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

export function CtaSection() {
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ctaRef.current;
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
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ background: "#0f172a", width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Barcode QR */}
      <img
        src="/uploads/barcode.webp"
        alt="Scan to join Safeeely"
        className="sf-cta-barcode"
        style={{ position: "absolute", left: "-28px", top: "50%", transform: "translateY(-60%) rotate(-12deg)", width: "200px", height: "auto", opacity: 0.82, pointerEvents: "none", zIndex: 10, borderRadius: "16px" }}
      />

      {/* CTA upper */}
      <div
        ref={ctaRef}
        style={{ maxWidth: "600px", margin: "0 auto", padding: "96px 40px 72px", textAlign: "center", position: "relative", zIndex: 2, opacity: 0, transform: "translateY(32px)", transition: "opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)" }}
      >
        <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: "clamp(32px,4vw,44px)", lineHeight: 1.15, letterSpacing: "-.02em", color: "#fff", margin: "0 0 16px" }}>
          Trade anywhere.<br /><span style={{ fontStyle: "italic", color: "#34d399" }}>Stay Safeee.</span>
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.6, color: "#475569", margin: "0 0 36px" }}>
          Join thousands of traders protecting every deal across WhatsApp, Telegram, Discord &amp; Instagram.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link
            href="/@safeeely"
            style={{ background: "#10b981", color: "#fff", textDecoration: "none", borderRadius: "999px", padding: "14px 32px", fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 12px 28px rgba(16,185,129,.35)" }}
          >
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
