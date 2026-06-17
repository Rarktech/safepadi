"use client";
import { useEffect, useRef } from "react";

export function InstantBlock() {
  const textRef = useRef<HTMLDivElement>(null);
  const padlockRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const padlockEl = padlockRef.current;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          (en.target as HTMLElement).style.opacity = "1";
          (en.target as HTMLElement).style.transform = "translateY(0)";
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });

    if (textEl) io.observe(textEl);

    if (padlockEl) {
      padlockEl.style.opacity = "0";
      padlockEl.style.transform = "translateY(40px) rotate(-4deg)";
      const padlockIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            (en.target as HTMLElement).style.transition = "opacity .7s .1s cubic-bezier(.16,1,.3,1), transform .7s .1s cubic-bezier(.16,1,.3,1)";
            (en.target as HTMLElement).style.opacity = "1";
            (en.target as HTMLElement).style.transform = "translateY(0) rotate(-4deg)";
            (en.target as HTMLElement).style.animation = "floatPadlock 6s ease-in-out infinite .7s";
            padlockIO.unobserve(en.target);
          }
        });
      }, { threshold: 0.1 });
      padlockIO.observe(padlockEl);
    }

    return () => io.disconnect();
  }, []);

  return (
    <section
      className="sf-lost-section"
      style={{
        position: "relative", width: "100%", minHeight: "360px", display: "flex", alignItems: "center",
        backgroundImage: "url('/uploads/lost cta (2).webp')",
        backgroundSize: "cover", backgroundPosition: "left center", backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}
    >
      {/* Mobile padlock */}
      <img
        ref={padlockRef}
        src="/uploads/padlock.webp"
        className="sf-lost-mobile-bg"
        alt=""
        style={{ position: "absolute", right: "-80px", bottom: "-10px", width: "260px", height: "auto", opacity: 1, pointerEvents: "none", zIndex: 10 }}
      />

      <div
        ref={textRef}
        className="sf-lost-text-inner"
        style={{ position: "relative", zIndex: 1, padding: "72px 64px", maxWidth: "520px", opacity: 0, transform: "translateY(32px)", transition: "opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <span style={{ display: "block", width: "7px", height: "7px", borderRadius: "999px", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: ".15em", color: "#059669", textTransform: "uppercase", whiteSpace: "nowrap" }}>Instant Block</span>
        </div>
        <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: "36px", lineHeight: 1.15, letterSpacing: "-.02em", color: "#0b0b0b", margin: "0 0 16px" }}>
          Lost your phone?<br />Freeze your account <span style={{ color: "#10b981", fontStyle: "italic" }}>instantly.</span>
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.4, letterSpacing: "-.01em", color: "#707070", margin: "0 0 32px", maxWidth: "400px" }}>
          If your device is stolen or compromised, freeze your Safeeely account from any device in seconds — pausing all activity and protecting your funds.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <a href="#" style={{ background: "#0f172a", color: "#fff", textDecoration: "none", borderRadius: "999px", padding: "13px 26px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(15,23,42,.18)", cursor: "pointer", display: "inline-block" }}>
            Block Account Now
          </a>
          <a href="#" style={{ background: "rgba(255,255,255,0.8)", color: "#0f172a", textDecoration: "none", borderRadius: "999px", padding: "12px 24px", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "14px", whiteSpace: "nowrap", cursor: "pointer", display: "inline-block", border: "1.5px solid rgba(0,0,0,0.08)" }}>
            Unblock Account
          </a>
        </div>
      </div>
    </section>
  );
}
