"use client";
import { useEffect, useState } from "react";

export function Navbar() {
  const [shrunk, setShrunk] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector("[data-hero]") as HTMLElement | null;
      const heroH = hero ? hero.offsetHeight : window.innerHeight;
      setShrunk(window.scrollY > heroH * 0.45);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navTop = shrunk ? "10px" : "12px";
  const navWidth = shrunk ? "min(820px,calc(100% - 32px))" : "min(1160px,calc(100% - 32px))";
  const navPad = shrunk ? "7px 7px 7px 22px" : "10px 10px 10px 26px";
  const btnPad = shrunk ? "8px 16px" : "10px 20px";

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: navTop,
          left: "50%",
          transform: "translateX(-50%)",
          width: navWidth,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          padding: navPad,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(200,210,220,0.45)",
          borderRadius: "999px",
          boxShadow: "0 8px 40px rgba(15,23,42,.1),inset 0 1px 0 rgba(255,255,255,.8)",
          transition: "top .45s cubic-bezier(.16,1,.3,1),width .45s cubic-bezier(.16,1,.3,1),padding .35s ease",
        }}
      >
        <div style={{ maxWidth: "100%", margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <img src="/assets/safeeely-logo.png" alt="Safeeely" style={{ height: "26px", width: "auto", display: "block", objectFit: "contain" }} />
          </a>

          <div className="sf-navlinks" style={{ alignItems: "center", gap: "34px", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            {["Product", "Services", "Jobs", "Pricing"].map((l) => (
              <a
                key={l}
                href="#"
                style={{ fontSize: "14.5px", fontWeight: 500, color: "#475569", textDecoration: "none", transition: "color .18s" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "#10b981"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "#475569"; }}
              >
                {l}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <a
              href="#"
              style={{
                background: "#0f172a", color: "#fff", textDecoration: "none", borderRadius: "999px",
                padding: btnPad, fontWeight: 700, fontSize: "14px",
                boxShadow: "0 4px 12px rgba(15,23,42,.2)", cursor: "pointer",
                transition: "transform .2s ease-out, box-shadow .2s", display: "inline-block",
              }}
            >
              Join for Free →
            </a>
            <button
              className="sf-burger"
              onClick={(e) => { e.preventDefault(); setMenuOpen((o) => !o); }}
              aria-label="Menu"
              style={{
                width: "42px", height: "42px", borderRadius: "12px", border: "1px solid #e7eaee",
                background: "#fff", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexDirection: "column", gap: "4px",
              }}
            >
              <span style={{ display: "block", width: "18px", height: "2px", background: "#0f172a", borderRadius: "2px" }} />
              <span style={{ display: "block", width: "18px", height: "2px", background: "#0f172a", borderRadius: "2px" }} />
              <span style={{ display: "block", width: "18px", height: "2px", background: "#0f172a", borderRadius: "2px" }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 55,
          background: "#fff", padding: "96px 28px 28px",
          display: "flex", flexDirection: "column",
          transition: "opacity .3s ease, transform .35s cubic-bezier(.16,1,.3,1)",
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? "translateY(0)" : "translateY(-12px)",
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      >
        {["Product", "Services", "Jobs", "Pricing"].map((l) => (
          <a
            key={l}
            href="#"
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: "'Inter Tight', sans-serif", fontSize: "22px", fontWeight: 700,
              color: "#0f172a", textDecoration: "none", padding: "14px 0", borderBottom: "1px solid #f1f5f9",
            }}
          >
            {l}
          </a>
        ))}
        <a
          href="#"
          onClick={() => setMenuOpen(false)}
          style={{
            marginTop: "18px", background: "#0f172a", color: "#fff", textDecoration: "none",
            borderRadius: "999px", padding: "15px", textAlign: "center", fontWeight: 700, fontSize: "16px",
          }}
        >
          Join for Free →
        </a>
      </div>
    </>
  );
}
