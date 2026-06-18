"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

const FEATURES = [
  { title: "Voice Capture", desc: "Just send a voice note to start a deal. Our AI understands, structures and locks the escrow automatically. No typing, no forms.", img: "/uploads/features 1 voice Deal initiaiton.webp" },
  { title: "Cheaper Fees", desc: "We charge less than 1/4th the fee of Upwork and Fiverr. More money stays where it belongs — right in your pocket.", img: "/uploads/cheap fees.webp" },
  { title: "Milestone Transactions", desc: "Break any deal into staged payments inside your social chat. Money releases milestone by milestone — both sides protected.", img: "/uploads/mileston transactions (2).webp" },
  { title: "No App Downloads", desc: "No app store visits, no new accounts. Works natively inside WhatsApp, Telegram, Discord and Instagram.", img: "/uploads/no app download (1).webp" },
];

export function ReviewSection() {
  const outerRef = useRef<HTMLElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const outer = outerRef.current;
      const spacer = spacerRef.current;
      const track = trackRef.current;
      if (!outer || !spacer || !track) return;
      const fRect = outer.getBoundingClientRect();
      const stickyEl = outer.querySelector<HTMLElement>("[data-feat-sticky]");
      const stickyH = stickyEl ? stickyEl.offsetHeight : window.innerHeight;
      const enterOffset = Math.max(0, window.innerHeight - stickyH);
      const fScrolled = -fRect.top - enterOffset;
      const fTotal = spacer.offsetHeight - enterOffset;
      if (fScrolled >= 0 && fTotal > 0) {
        const fProgress = Math.max(0, Math.min(0.9999, fScrolled / fTotal));
        const tW = track.scrollWidth;
        const cW = track.parentElement ? track.parentElement.offsetWidth : 0;
        const maxT = Math.max(0, tW - cW);
        track.style.transform = `translateX(${(-fProgress * maxT).toFixed(1)}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={outerRef} style={{ position: "relative", background: "#f9f9f9", overflowX: "clip" }}>
      {/* Desktop */}
      <div className="sf-feat-desktop">
        <div data-feat-sticky style={{ position: "sticky", top: 0, height: "min(680px,100vh)", display: "flex", flexDirection: "column", overflow: "hidden", padding: "64px 0 48px 64px", boxSizing: "border-box" }}>
          <div style={{ flexShrink: 0, marginBottom: "48px", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: "36px", lineHeight: 1.15, letterSpacing: "-.02em", color: "#0b0b0b", margin: 0 }}>
              Four features that put<br />more money in your pocket.
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.4, letterSpacing: "-.01em", color: "#707070", margin: 0 }}>
              From how you start a deal to how you get paid — faster, cheaper and safer than anything else.
            </p>
          </div>
          <div style={{ flexShrink: 0, height: "420px" }}>
            <div ref={trackRef} style={{ display: "flex", gap: "16px", height: "100%", willChange: "transform" }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ width: "calc(90vw - 128px)", flexShrink: 0, background: "#fff", borderRadius: "20px", overflow: "hidden", display: "flex" }}>
                  <div style={{ flex: "0 0 38%", padding: "36px 40px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                    <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: "17px", letterSpacing: "-.01em", color: "#111", margin: "0 0 16px", lineHeight: 1.3 }}>{f.title}</h3>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", lineHeight: 1.65, color: "#888", margin: 0, flex: 1 }}>{f.desc}</p>
                    <Link href="/@safeeely" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f5f5f5", border: "none", borderRadius: "999px", padding: "9px 20px", fontFamily: "inherit", fontSize: "13px", fontWeight: 500, color: "#111", textDecoration: "none", alignSelf: "flex-start", marginTop: "32px" }}>
                      Get Started →
                    </Link>
                  </div>
                  <div style={{ flex: 1, padding: "12px 12px 12px 0" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "14px", overflow: "hidden" }}>
                      <img src={f.img} alt={f.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ width: "64px", flexShrink: 0 }} />
            </div>
          </div>
        </div>
        <div ref={spacerRef} className="sf-feat-spacer" style={{ height: "400vh" }} />
      </div>

      {/* Mobile */}
      <div className="sf-feat-mobile" style={{ padding: "64px 20px 80px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "32px", letterSpacing: "-.035em", color: "#0f172a", margin: "0 0 12px", lineHeight: 1.1 }}>
            Four features that put<br />more money in your pocket.
          </h2>
          <p style={{ fontSize: "14.5px", color: "#6b7280", lineHeight: 1.65, margin: 0 }}>Faster, cheaper and safer than anything else.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
              <div style={{ margin: "12px 12px 0", borderRadius: "14px", overflow: "hidden", background: "#ebebeb", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)", height: "200px" }}>
                <img src={f.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
              </div>
              <div style={{ padding: "24px 24px 28px" }}>
                <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "22px", color: "#0d0d0d", margin: "0 0 10px", letterSpacing: "-.025em" }}>{f.title}</h3>
                <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.7, margin: "0 0 22px" }}>{f.desc}</p>
                <Link href="/@safeeely" style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid rgba(0,0,0,.18)", borderRadius: "999px", padding: "9px 18px", fontFamily: "inherit", fontSize: "13px", fontWeight: 500, color: "#111", textDecoration: "none" }}>
                  Get Started →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
