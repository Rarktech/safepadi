"use client";
import { useEffect, useRef } from "react";

export function Hero() {
  const coinRRef = useRef<HTMLDivElement>(null);
  const coinLRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const onPointerMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      if (coinRRef.current) coinRRef.current.style.transform = `translate3d(${(-cx * 0.55 * 60).toFixed(1)}px,${(-cy * 0.55 * 60).toFixed(1)}px,0)`;
      if (coinLRef.current) coinLRef.current.style.transform = `translate3d(${(-cx * 0.85 * 60).toFixed(1)}px,${(-cy * 0.85 * 60).toFixed(1)}px,0)`;
    };
    const onPointerLeave = () => {
      if (coinRRef.current) coinRRef.current.style.transform = "translate3d(0,0,0)";
      if (coinLRef.current) coinLRef.current.style.transform = "translate3d(0,0,0)";
    };
    hero.addEventListener("pointermove", onPointerMove);
    hero.addEventListener("pointerleave", onPointerLeave);

    // Magnetic buttons
    const magnets = Array.from(hero.querySelectorAll<HTMLElement>("[data-magnet]"));
    type Handler = { el: HTMLElement; move: (e: PointerEvent) => void; leave: () => void };
    const handlers: Handler[] = magnets.map((btn) => {
      const move = (e: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${(x * 0.3).toFixed(1)}px,${(y * 0.4).toFixed(1)}px)`;
      };
      const leave = () => { btn.style.transform = "translate(0,0)"; };
      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerleave", leave);
      return { el: btn, move, leave };
    });

    // Video autoplay
    const vid = hero.querySelector("video");
    if (vid) {
      vid.muted = true; vid.loop = true; vid.playsInline = true;
      const tryPlay = () => { try { const p = vid.play(); if (p?.catch) p.catch(() => {}); } catch (_) {} };
      setTimeout(tryPlay, 400);
      vid.addEventListener("canplay", tryPlay);
    }

    return () => {
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      handlers.forEach(({ el, move, leave }) => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      });
    };
  }, []);

  return (
    <section ref={heroRef} data-hero="1" style={{ position: "relative", width: "100%", minHeight: "100vh", background: "#ffffff" }}>
      {/* Vignette */}
      <div className="sf-vignette" style={{ position: "absolute", inset: 0, zIndex: 12, background: "radial-gradient(ellipse 52% 58% at 50% 38%, rgba(255,255,255,.92) 0%, rgba(255,255,255,0) 58%)", pointerEvents: "none" }} />

      {/* Mobile coins */}
      <img className="sf-mobile-coin" src="/assets/coin-whatsapp.webp" alt="" style={{ position: "absolute", width: "190px", height: "auto", top: "348px", left: "-100px", zIndex: 25, pointerEvents: "none", animation: "bobA 7s ease-in-out infinite", filter: "drop-shadow(0 16px 26px rgba(4,120,87,.22))" }} />
      <img className="sf-mobile-coin" src="/assets/coin-telegram.webp" alt="" style={{ position: "absolute", width: "140px", height: "auto", top: "510px", right: "-76px", zIndex: 25, pointerEvents: "none", animation: "bobB 8.4s ease-in-out infinite .6s", filter: "drop-shadow(0 12px 20px rgba(4,120,87,.18))" }} />
      <img className="sf-mobile-coin" src="/assets/coin-discord.webp" alt="" style={{ position: "absolute", width: "175px", height: "auto", top: "688px", left: "-92px", zIndex: 25, pointerEvents: "none", animation: "bobC 9s ease-in-out infinite 1s", filter: "drop-shadow(0 16px 26px rgba(4,120,87,.22))" }} />

      {/* Corner coins — desktop */}
      <div ref={coinRRef} className="sf-coin-r" style={{ position: "absolute", top: "20px", right: "-110px", pointerEvents: "none", zIndex: 5, transition: "transform .3s ease-out", width: "480px" }}>
        <div style={{ animation: "bobA 7s ease-in-out infinite" }}>
          <img src="/assets/coins-right.webp" alt="" style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 28px 38px rgba(4,120,87,.18))" }} />
        </div>
      </div>
      <div ref={coinLRef} className="sf-coin-l" style={{ position: "absolute", top: "180px", left: "-60px", pointerEvents: "none", zIndex: 5, transition: "transform .3s ease-out", width: "430px" }}>
        <div style={{ animation: "bobB 8.4s ease-in-out infinite" }}>
          <img src="/assets/coins-left.webp" alt="" style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 28px 38px rgba(4,120,87,.18))" }} />
        </div>
      </div>

      {/* Content */}
      <div className="sf-hero-pad" style={{ position: "relative", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "150px 24px 32px" }}>
        <h1 className="sf-h1" style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, lineHeight: 1.06, letterSpacing: "-.035em", color: "#0f172a", margin: "0 0 20px", animation: "riseIn .8s cubic-bezier(.16,1,.3,1) .06s both", fontSize: "54px" }}>
          Trade anywhere.<br />Stay <span style={{ color: "#10b981", fontStyle: "italic", fontWeight: 800 }}>Safeee.</span>
        </h1>
        <p style={{ fontSize: "17.5px", lineHeight: 1.6, color: "#64748b", maxWidth: "540px", margin: "0 0 30px", fontWeight: 450 as unknown as number, animation: "riseIn .8s cubic-bezier(.16,1,.3,1) .12s both" }}>
          Secure every social-media deal, freelance gig and crypto trade through a single link — protected end to end across WhatsApp, Telegram, Discord &amp; Instagram.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap", animation: "riseIn .8s cubic-bezier(.16,1,.3,1) .18s both" }}>
          <a href="#" data-magnet="1" style={{ background: "#0f172a", color: "#fff", textDecoration: "none", border: "none", borderRadius: "999px", padding: "15px 28px", fontFamily: "inherit", fontWeight: 700, fontSize: "15.5px", boxShadow: "0 14px 30px rgba(15,23,42,.2)", cursor: "pointer", transition: "transform .2s ease-out", display: "inline-block" }}>
            Get Started
          </a>
          <a href="#" data-magnet="1" style={{ background: "#fff", color: "#0f172a", textDecoration: "none", border: "1px solid #e2e8f0", borderRadius: "999px", padding: "15px 26px", fontFamily: "inherit", fontWeight: 700, fontSize: "15.5px", boxShadow: "0 8px 18px rgba(15,23,42,.05)", cursor: "pointer", transition: "transform .2s ease-out", display: "inline-block" }}>
            See how it works
          </a>
        </div>

        {/* Video mockup */}
        <div style={{ marginTop: "36px", animation: "riseIn 1s cubic-bezier(.16,1,.3,1) .24s both" }}>
          <div className="sf-card" style={{ overflow: "hidden", background: "transparent", aspectRatio: "1/1", borderRadius: "28px", width: "440px" }}>
            <video src="/assets/hero-product.mp4" autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", borderRadius: "28px" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
