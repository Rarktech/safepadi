"use client";
import { useEffect, useRef } from "react";

export function StorySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-problem-card]"));
    const pTrans = "flex .5s cubic-bezier(.16,1,.3,1), opacity .52s cubic-bezier(.16,1,.3,1), transform .52s cubic-bezier(.16,1,.3,1)";
    cards.forEach((c) => { c.style.transition = pTrans; });
    const shown = [false, false, false];

    const onScroll = () => {
      if (!section) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const sH = r.height;
      if (r.top > vh) {
        cards.forEach((c, i) => {
          if (shown[i]) { c.style.transition = "none"; c.style.opacity = "0"; c.style.transform = "translateY(44px)"; shown[i] = false; }
        });
        return;
      }
      if (r.bottom < 0) {
        cards.forEach((c, i) => {
          if (shown[i]) { c.style.transition = "none"; c.style.opacity = "0"; c.style.transform = "translateY(-44px)"; shown[i] = false; }
        });
        return;
      }
      const entryP = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.8)));
      const exitP = Math.max(0, Math.min(1, -r.top / (sH * 0.6)));
      cards.forEach((c, i) => {
        const entryThr = i * 0.28;
        const exitThr = i * 0.28;
        const shouldShow = entryP > entryThr && exitP < exitThr + 0.38;
        if (shouldShow && !shown[i]) {
          c.style.transition = pTrans; c.style.opacity = "1"; c.style.transform = "translateY(0)"; shown[i] = true;
        } else if (!shouldShow && shown[i]) {
          c.style.transition = pTrans; c.style.opacity = "0";
          c.style.transform = exitP > 0 ? "translateY(-28px)" : "translateY(44px)"; shown[i] = false;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Hover flex-grow
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        cards.forEach((c) => { c.style.flex = c === card ? "1.15" : "0.925"; });
      });
      card.addEventListener("mouseleave", () => {
        cards.forEach((c) => { c.style.flex = "1"; });
      });
    });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={sectionRef} className="sf-problem-section" style={{ background: "#fff", padding: "100px 40px 90px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2 className="sf-problem-heading" style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "32px", lineHeight: 1.06, letterSpacing: "-.035em", color: "#0f172a", margin: "0 0 56px", maxWidth: "660px" }}>
          The DM economy is worth billions.<br />It has <span style={{ fontStyle: "italic", color: "#10b981", fontWeight: 800 }}>no safety net.</span>
        </h2>

        <div data-problem-cards className="sf-problem-cards" style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
          {/* Card 1 */}
          <div data-problem-card style={{ flex: 1, background: "#fff", borderRadius: "22px", border: "1px solid #e8ebf0", cursor: "default", transition: "flex .5s cubic-bezier(.16,1,.3,1)", opacity: 0, transform: "translateY(32px)", padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ height: "240px", background: "#f0f0f1", backgroundImage: "url('/uploads/69d321443e21f4b57f81532f540a306d (1).jpg')", backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px", position: "relative", overflow: "hidden", borderRadius: "14px" }}>
              <div style={{ width: "100%", maxWidth: "300px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ alignSelf: "flex-end", background: "#0f172a", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "10px 16px", fontSize: "13.5px", fontWeight: 600, maxWidth: "72%" }}>I just sent the $400 🙏</div>
                <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: "4px", paddingRight: "2px" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>Delivered</span>
                  <svg width="14" height="10" viewBox="0 0 16 12" fill="none"><path d="M1 6l4 4L15 1" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ alignSelf: "flex-start", width: "52px", height: "30px", background: "#e2e8f0", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#94a3b8", animation: "pulseDot 1.2s ease-in-out infinite" }} />
                  <div style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#94a3b8", animation: "pulseDot 1.2s ease-in-out infinite .2s" }} />
                  <div style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#94a3b8", animation: "pulseDot 1.2s ease-in-out infinite .4s" }} />
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", background: "rgba(255,255,255,.7)", borderRadius: "6px", padding: "2px 6px", display: "inline-block" }}>last seen 3 days ago</div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "20px 22px 26px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".06em", color: "#94a3b8", marginBottom: "12px" }}>01.</div>
              <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "-.025em", color: "#0f172a", margin: "0 0 10px", lineHeight: 1.2 }}>Ghosted after payment</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#64748b", margin: 0 }}>Social platforms have no escrow, no dispute mechanism, no way to recover funds. Pay first, trust blindly — that's the only deal on the table.</p>
            </div>
          </div>

          {/* Card 2 */}
          <div data-problem-card style={{ flex: 1, background: "#fff", borderRadius: "22px", border: "1px solid #e8ebf0", cursor: "default", transition: "flex .5s cubic-bezier(.16,1,.3,1)", opacity: 0, transform: "translateY(32px)", padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ height: "240px", background: "#f0fdf4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "28px", position: "relative", overflow: "hidden", borderRadius: "14px" }}>
              <div style={{ position: "absolute", top: "14px", right: "18px", display: "flex", alignItems: "center", gap: "6px", background: "#dcfce7", borderRadius: "999px", padding: "5px 11px" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#047857" }}>High risk</span>
              </div>
              <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: "76px", letterSpacing: "-.05em", color: "#10b981", lineHeight: 1 }}>$5.7B</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#059669", textAlign: "center", maxWidth: "220px", lineHeight: 1.4 }}>lost to social media scams in 2024 — FTC</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "20px 22px 26px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".06em", color: "#94a3b8", marginBottom: "12px" }}>02.</div>
              <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "-.025em", color: "#0f172a", margin: "0 0 10px", lineHeight: 1.2 }}>Social commerce fraud is exploding</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#64748b", margin: 0 }}>Fake sellers, counterfeit goods, advance-fee scams — they thrive in unprotected DMs. Every deal without escrow is a gamble.</p>
            </div>
          </div>

          {/* Card 3 */}
          <div data-problem-card style={{ flex: 1, background: "#fff", borderRadius: "22px", border: "1px solid #e8ebf0", cursor: "default", transition: "flex .5s cubic-bezier(.16,1,.3,1)", opacity: 0, transform: "translateY(32px)", padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ height: "240px", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ width: "100%", maxWidth: "290px", display: "flex", flexDirection: "column", gap: "9px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: "12px", padding: "11px 14px", border: "1.5px solid #bbf7d0" }}>
                  <img src="/uploads/580b57fcd9996e24bc43c530.png" alt="PayPal" style={{ height: "20px", width: "auto", objectFit: "contain" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>Reverses digital goods ✗</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: "12px", padding: "11px 14px", border: "1.5px solid #bbf7d0" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img src="/uploads/Circle_USDC_Logo.svg.png" alt="USDC" style={{ height: "22px", width: "22px", objectFit: "contain" }} />
                    <img src="/uploads/Ethereum_Logo.png" alt="ETH" style={{ height: "22px", width: "22px", objectFit: "contain", marginLeft: "-6px" }} />
                    <img src="/uploads/USDT_Logo.png" alt="USDT" style={{ height: "22px", width: "22px", objectFit: "contain", marginLeft: "-6px" }} />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>Irreversible if scammed ✗</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: "12px", padding: "11px 14px", border: "1.5px solid #bbf7d0" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img src="/uploads/FirstBank-Stacked-Logo.png" alt="FirstBank" style={{ height: "22px", width: "auto", objectFit: "contain", borderRadius: "4px" }} />
                    <img src="/uploads/Opay-New-2023-Logo-Vector.svg--300x99.png" alt="OPay" style={{ height: "18px", width: "auto", objectFit: "contain", marginLeft: "-6px", borderRadius: "4px" }} />
                    <img src="/uploads/BAC-e7995069.png" alt="Bank of America" style={{ height: "20px", width: "auto", objectFit: "contain", marginLeft: "-6px", borderRadius: "4px" }} />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>No buyer protection ✗</span>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "20px 22px 26px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: ".06em", color: "#94a3b8", marginBottom: "12px" }}>03.</div>
              <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "-.025em", color: "#0f172a", margin: "0 0 10px", lineHeight: 1.2 }}>No payment tool was built for this</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#64748b", margin: 0 }}>PayPal reverses. Crypto is permanent. Bank transfers take days with zero recourse. None of these were made for peer-to-peer social deals.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
