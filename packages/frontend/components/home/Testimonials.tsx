type TestiCard = { img: string; quote: string; name: string };

const COL1: TestiCard[] = [
  { img: "3", quote: "I've flipped hundreds of sneakers through Discord and always had that fear of getting scammed. Safeeely just solved that problem completely.", name: "Jordan K." },
  { img: "8", quote: "I was really skeptical at first but after my first transaction on WhatsApp I was hooked. My clients actually trust me more now.", name: "Bolaji A." },
];
const COL2: TestiCard[] = [
  { img: "5", quote: "I do all my freelance dev work through Telegram. Safeeely means I never send a single line of code without the money locked first. Game changer.", name: "Amara O." },
  { img: "11", quote: "As a freelance designer I used to lose sleep wondering if clients would pay. Now I set milestones and Safeeely handles the rest.", name: "Kolade F." },
];
const COL3: TestiCard[] = [
  { img: "15", quote: "Sold a watch worth $3,400 to someone on Instagram. Safeeely held the money, I shipped, funds hit my wallet same day. Zero stress.", name: "Marcus T." },
  { img: "47", quote: "I was nervous paying a vendor I found on WhatsApp. Safeeely made the whole thing feel professional. Would use it for every single deal.", name: "Sophia M." },
];
const COL4: TestiCard[] = [
  { img: "12", quote: "Used it to pay a contractor building my store. Milestone payments kept us both accountable. Never going back to bank transfers.", name: "David A." },
  { img: "52", quote: "The voice note feature blew my mind. Said the deal details out loud and it set up the entire escrow automatically. My clients loved it.", name: "Taiwo B." },
];
const COL5: TestiCard[] = [
  { img: "44", quote: "No app to download, no new account. I used it right inside Telegram. Money locked before I even knew what happened. Felt like magic.", name: "Ngozi E." },
  { img: "16", quote: "Cheaper than every other escrow I tried. I used to lose 15–20% on platform fees. Now I keep almost everything I earn.", name: "Chidi N." },
];

const MOBILE_ALL: TestiCard[] = [...COL1, ...COL2, ...COL3, ...COL4, ...COL5];

function Card({ c }: { c: TestiCard }) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px", flexShrink: 0, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={`https://i.pravatar.cc/44?img=${c.img}`} alt="" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
        <span style={{ color: "#f59e0b", fontSize: "13px", letterSpacing: "2px" }}>★★★★★</span>
      </div>
      <p style={{ fontSize: "13px", fontWeight: 400, lineHeight: 1.55, color: "#222", margin: 0, letterSpacing: "-.01em" }}>"{c.quote}"</p>
      <div style={{ fontSize: "13px", fontWeight: 500, color: "#777" }}>{c.name}</div>
    </div>
  );
}

function Col({ cards, anim, offset = 0 }: { cards: TestiCard[]; anim: string; offset?: number }) {
  const doubled = [...cards, ...cards];
  return (
    <div style={{ marginTop: offset }}>
      <div className="sf-testi-clip" style={{ overflow: "hidden", height: "480px" }}>
        <div className="sf-testi-track" style={{ display: "flex", flexDirection: "column", animation: anim }}>
          {doubled.map((c, i) => <Card key={`${c.name}-${i}`} c={c} />)}
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section style={{ background: "#f8fafb", padding: "100px 40px 120px", position: "relative", overflow: "hidden" }}>
      <img src="/uploads/safeeely lofo.webp" alt="" style={{ position: "absolute", top: "-30px", right: "-50px", width: "220px", height: "auto", opacity: .85, transform: "rotate(14deg)", pointerEvents: "none", userSelect: "none", zIndex: 10 }} />
      <img src="/uploads/New Project (54).png" alt="" style={{ position: "absolute", bottom: "-60px", left: "-90px", width: "360px", height: "auto", opacity: .85, transform: "rotate(-8deg)", pointerEvents: "none", userSelect: "none", zIndex: 10 }} />

      <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "clamp(42px,5vw,64px)", lineHeight: 1.1, letterSpacing: "-.03em", color: "#111111", margin: 0 }}>
            Real people,<br />real <span style={{ color: "#10b981" }}>results</span>
          </h2>
        </div>

        {/* Desktop 5-column */}
        <div className="sf-testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", columnGap: "16px", rowGap: 0, alignItems: "start" }}>
          <Col cards={COL1} anim="testimDown 14s linear infinite" offset={60} />
          <Col cards={COL2} anim="testimUp 12s linear infinite" />
          <Col cards={COL3} anim="testimDown 16s linear infinite" offset={32} />
          <Col cards={COL4} anim="testimUp 13s linear infinite" />
          <Col cards={COL5} anim="testimDown 15s linear infinite" offset={60} />
        </div>

        {/* Mobile single column */}
        <div className="sf-testi-mobile-col">
          <div className="sf-testi-clip" style={{ overflow: "hidden", height: "520px" }}>
            <div className="sf-testi-track" style={{ display: "flex", flexDirection: "column", animation: "testimDown 28s linear infinite" }}>
              {[...MOBILE_ALL, ...MOBILE_ALL].map((c, i) => <Card key={`m-${c.name}-${i}`} c={c} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
