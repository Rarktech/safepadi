export function UseCasesSection() {
  return (
    <div style={{ padding: "0 24px", marginTop: "-110px", position: "relative", zIndex: 5 }}>
      <div style={{ maxWidth: "1340px", margin: "0 auto" }}>
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", minHeight: "220px", display: "flex", alignItems: "center", boxShadow: "0 32px 80px rgba(0,0,0,.45)" }}>
          <img
            src="/uploads/cta desktop.webp"
            alt=""
            className="sf-cta-img"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
          />
          <div className="sf-cta-text" style={{ position: "relative", zIndex: 2, padding: "52px 60px" }}>
            <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "40px", lineHeight: 1.06, letterSpacing: "-.04em", color: "#fff", margin: "0 0 26px" }}>
              Every deal.<br />Every platform.<br />Protected.
            </h2>
            <a
              href="#"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "rgba(255,255,255,.12)", color: "#fff", textDecoration: "none",
                borderRadius: "999px", padding: "12px 24px", fontWeight: 700, fontSize: "14px",
                border: "1px solid rgba(255,255,255,.2)", backdropFilter: "blur(8px)", cursor: "pointer",
              }}
            >
              Start for free →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
