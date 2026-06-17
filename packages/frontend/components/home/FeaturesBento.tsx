"use client";
import { useEffect, useRef } from "react";

const STATS = [
  { prefix: "~", count: 2, suffix: " min", label: "To Create a Deal" },
  { prefix: "$", count: 0, suffix: "", label: "Lost to Fraud" },
  { prefix: "$", count: 2, suffix: "M+", label: "Funds Escrowed" },
  { prefix: "<", count: 2, suffix: " hrs", label: "Dispute Resolution" },
];

export function FeaturesBento() {
  const sectionRef = useRef<HTMLElement>(null);
  const spanRefs = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const spans = spanRefs.current;
    const animateCount = (el: HTMLSpanElement, target: number, suffix: string) => {
      const isInt = Number.isInteger(target);
      const dur = 1600;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const ease = 1 - Math.pow(1 - t, 3);
        const v = target * ease;
        el.textContent = (isInt ? Math.round(v).toLocaleString() : v.toFixed(1)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const idx = spans.indexOf(en.target as HTMLSpanElement);
          if (idx !== -1) animateCount(spans[idx], STATS[idx].count, STATS[idx].suffix);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 });

    spans.forEach((s) => { if (s) io.observe(s); });
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ background: "#0f172a", padding: "80px 40px 140px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, fontSize: "32px", letterSpacing: "-.035em", color: "#fff", margin: "0 0 56px" }}>
          Numbers that power our story
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "56px 80px" }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, fontSize: "52px", letterSpacing: "-.04em", color: "#fff", lineHeight: 1 }}>
                {s.prefix}<span ref={(el) => { if (el) spanRefs.current[i] = el; }}>0</span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: ".12em", color: "#475569", marginTop: "10px", textTransform: "uppercase" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
