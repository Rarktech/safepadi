"use client";
import { useEffect, useRef } from "react";

const CARDS = [
  { num: "01.", title: "Funds locked from the start", desc: "The moment a buyer pays, Safeeely seals the money in a secure AI-monitored vault. Nobody touches a cent until both sides confirm.", img: "/uploads/solution cards.webp" },
  { num: "02.", title: "Lives where your deal does", desc: "No redirects, no new apps. Our bot lives inside Telegram, WhatsApp, Discord and Instagram — escrow happens right in the chat.", img: "/uploads/New Project.webp" },
  { num: "03.", title: "Confirmed delivery, instant pay", desc: "The buyer taps confirm and funds move instantly. Crypto or fiat — the seller gets paid in seconds, not days.", img: "/uploads/solution 3.webp" },
  { num: "04.", title: "We step in when things go wrong", desc: "Raise a dispute and our AI reviews the evidence and resolves it in under 2 hours. Complex cases escalate instantly to a human arbiter.", img: "/uploads/solution 3 (1)-a044636f.webp" },
];

export function TrustSection() {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const onScroll = () => {
      const outer = outerRef.current;
      const track = trackRef.current;
      if (!outer || !track) return;
      const r = outer.getBoundingClientRect();
      const outerH = outer.offsetHeight;
      const vh = window.innerHeight;
      const scrolled = -r.top;
      const totalScroll = outerH - vh;
      const progress = Math.max(0, Math.min(1, scrolled / totalScroll));
      const trackW = track.scrollWidth;
      const containerW = track.parentElement ? track.parentElement.offsetWidth : 0;
      const maxT = Math.max(0, trackW - containerW);
      track.style.transform = `translateX(${(-progress * maxT).toFixed(1)}px)`;
      const dotIdx = Math.min(3, Math.floor(progress * 4));
      dotsRef.current.forEach((d, i) => {
        if (!d) return;
        d.style.width = i === dotIdx ? "24px" : "8px";
        d.style.background = i === dotIdx ? "#0f172a" : "#e2e8f0";
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={outerRef} className="sf-solution-outer" style={{ position: "relative", height: "380vh" }}>
      <div className="sf-solution-sticky" style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", background: "#f8fafb" }}>

        {/* Left panel */}
        <div className="sf-solution-left" style={{ width: "340px", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 44px 0 60px", borderRight: "1px solid #e2e8f0" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "999px", background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: "20px", alignSelf: "flex-start" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#10b981" }} />
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#047857", letterSpacing: ".04em" }}>The fix</span>
          </div>
          <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, fontSize: "32px", lineHeight: 1.2, letterSpacing: "-.035em", color: "#0f172a", margin: "0 0 14px" }}>Safeeely closes the gap no payment tool ever filled.</h2>
          <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#64748b", margin: "0 0 32px" }}>From the moment a deal is struck to the second funds land — every step is covered.</p>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                ref={(el) => { if (el) dotsRef.current[i] = el; }}
                style={{ width: i === 0 ? "24px" : "8px", height: "4px", borderRadius: "999px", background: i === 0 ? "#0f172a" : "#e2e8f0", transition: "width .3s,background .3s" }}
              />
            ))}
          </div>
        </div>

        {/* Right: scrolling track */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div ref={trackRef} className="sf-solution-track" style={{ display: "flex", gap: "20px", padding: "0 80px 0 40px", willChange: "transform" }}>
            {CARDS.map((c) => (
              <div key={c.num} className="sf-solution-card" style={{ width: "520px", flexShrink: 0, background: "#fff", borderRadius: "22px", border: "1px solid #e8ebf0", padding: "10px", display: "flex", flexDirection: "column", gap: "10px", height: "440px" }}>
                <div style={{ flex: 1, borderRadius: "14px", overflow: "hidden", position: "relative" }}>
                  <img src={c.img} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
                </div>
                <div style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px 22px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".06em", color: "#94a3b8", marginBottom: "10px" }}>{c.num}</div>
                  <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "-.025em", color: "#0f172a", margin: "0 0 8px", lineHeight: 1.2 }}>{c.title}</h3>
                  <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#64748b", margin: 0 }}>{c.desc}</p>
                </div>
              </div>
            ))}
            <div style={{ width: "60px", flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
