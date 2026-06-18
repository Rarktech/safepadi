"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

const STEPS = [
  { num: "STEP 01 / 04", title: "Agreement", desc: "Buyers and sellers agree on deal terms within our secure interface or their preferred social platform.", img: "/assets/step-agreement.png" },
  { num: "STEP 02 / 04", title: "Initiation", desc: "The seller creates a unique Safeeely secure transaction link and shares it with the buyer.", img: "/assets/step-initiation.png" },
  { num: "STEP 03 / 04", title: "Escrow Hold", desc: "Buyer makes payment; Safeeely locks the funds in a secure, AI-monitored smart vault.", img: "/assets/step-escrow.png" },
  { num: "STEP 04 / 04", title: "Payment Release", desc: "Once delivery is confirmed, funds are instantly released to the seller's wallet.", img: "/assets/step-release.png" },
];

export function HowItWorks() {
  const outerRef = useRef<HTMLElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dotsRef = useRef<HTMLDivElement[]>([]);
  const lastStep = useRef(-1);

  const updateStep = (step: number) => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const s = STEPS[step];
    if (counterRef.current) counterRef.current.textContent = s.num;
    if (titleRef.current) {
      titleRef.current.style.opacity = "0"; titleRef.current.style.transform = "translateY(14px)";
      setTimeout(() => { if (titleRef.current) { titleRef.current.textContent = s.title; titleRef.current.style.opacity = "1"; titleRef.current.style.transform = "translateY(0)"; } }, 100);
    }
    if (descRef.current) {
      descRef.current.style.opacity = "0";
      setTimeout(() => { if (descRef.current) { descRef.current.textContent = s.desc; descRef.current.style.opacity = "1"; } }, 120);
    }
    if (imgRef.current) {
      imgRef.current.style.opacity = "0"; imgRef.current.style.transform = "scale(.96)";
      setTimeout(() => { if (imgRef.current) { imgRef.current.src = s.img; imgRef.current.style.opacity = "1"; imgRef.current.style.transform = "scale(1)"; } }, 80);
    }
    dotsRef.current.forEach((d, i) => {
      if (!d) return;
      d.style.width = i === step ? "28px" : "6px";
      d.style.background = i === step ? "#0f172a" : "#e2e8f0";
    });
  };

  useEffect(() => {
    const onScroll = () => {
      const outer = outerRef.current;
      const spacer = spacerRef.current;
      if (!outer || !spacer) return;
      const r = outer.getBoundingClientRect();
      const scrolled = -r.top;
      const total = spacer.offsetHeight;
      if (scrolled >= 0 && total > 0) {
        const progress = Math.max(0, Math.min(0.9999, scrolled / total));
        updateStep(Math.min(3, Math.floor(progress * 4)));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={outerRef} style={{ position: "relative", background: "#fff" }}>
      {/* Desktop sticky split */}
      <div className="sf-hiw-desktop">
        <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", overflow: "hidden" }}>
          {/* Left: step info */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px", maxWidth: "600px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "999px", background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: "22px", alignSelf: "flex-start" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#10b981" }} />
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#047857", letterSpacing: ".04em" }}>Easy &amp; Smart</span>
            </div>
            <div ref={counterRef} style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: "13px", fontWeight: 800, letterSpacing: ".04em", color: "#b0bac6", marginBottom: "14px" }}>STEP 01 / 04</div>
            <h2 ref={titleRef} style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, fontSize: "32px", lineHeight: 1.06, letterSpacing: "-.035em", color: "#0f172a", margin: "0 0 16px", transition: "opacity .4s ease,transform .4s ease" }}>Agreement</h2>
            <p ref={descRef} style={{ fontSize: "17px", lineHeight: 1.65, color: "#64748b", fontWeight: 450 as unknown as number, maxWidth: "420px", margin: "0 0 30px", transition: "opacity .4s ease,transform .4s ease" }}>
              Buyers and sellers agree on deal terms within our secure interface or their preferred social platform.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "36px" }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} ref={(el) => { if (el) dotsRef.current[i] = el; }} style={{ width: i === 0 ? "28px" : "6px", height: "6px", borderRadius: "999px", background: i === 0 ? "#0f172a" : "#e2e8f0", transition: "all .3s ease" }} />
              ))}
            </div>
            <Link href="/@safeeely" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#0f172a", color: "#fff", textDecoration: "none", borderRadius: "999px", padding: "14px 26px", fontFamily: "inherit", fontWeight: 700, fontSize: "15px", boxShadow: "0 12px 28px rgba(15,23,42,.18)", transition: "transform .2s ease-out", alignSelf: "flex-start" }}>
              Get Started →
            </Link>
          </div>
          {/* Right: step image */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", backgroundColor: "#f7f8f8" }}>
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(17,17,17,0.016)" }} />
            <div style={{ position: "relative", zIndex: 2, width: "88%", maxWidth: "480px" }}>
              <img ref={imgRef} src="/assets/step-agreement.png" alt="" style={{ width: "100%", height: "auto", display: "block", borderRadius: "24px", boxShadow: "0 40px 80px -24px rgba(15,23,42,.3)", transition: "opacity .4s ease,transform .4s ease" }} />
            </div>
          </div>
        </div>
        {/* Scroll spacer */}
        <div ref={spacerRef} className="sf-hiw-spacer" style={{ height: "400vh" }} />
      </div>

      {/* Mobile stacked */}
      <div className="sf-hiw-mobile" style={{ padding: "64px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "34px", letterSpacing: "-.03em", color: "#0f172a", margin: "0 0 12px" }}>How it works</h2>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.6, maxWidth: "320px", margin: "0 auto" }}>Four simple steps to protect every deal.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ background: "#f8fffe", borderRadius: "24px", overflow: "hidden", border: "1px solid #e8f5f0" }}>
              <img src={s.img} alt="" style={{ width: "100%", height: "180px", objectFit: "cover", objectPosition: "top" }} />
              <div style={{ padding: "20px 22px 24px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "999px", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px", fontWeight: 800, marginBottom: "10px" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "19px", color: "#0f172a", margin: "0 0 7px" }}>{s.title}</h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
