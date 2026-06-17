"use client";
import { useEffect, useRef, useState } from "react";

type Tab = "general" | "buyers" | "sellers";
type FaqItem = { q: string; a: string };

const FAQ: Record<Tab, FaqItem[]> = {
  general: [
    { q: "What is Safeeely and how does it work?", a: "Safeeely is an escrow service that works inside your existing social media apps — WhatsApp, Telegram, Discord and Instagram. Send a voice note or message describing your deal, Safeeely locks the payment securely, and releases it only when both parties are satisfied. No app downloads, no new accounts." },
    { q: "Which platforms does Safeeely support?", a: "Safeeely works natively inside WhatsApp, Telegram, Discord, and Instagram. Simply invite the Safeeely bot to your existing chat and you're ready to transact securely — no switching apps." },
    { q: "How much does Safeeely charge?", a: "We charge less than 1/4th the fees of platforms like Upwork and Fiverr. Our pricing is transparent — no hidden costs, no surprises. You keep significantly more of every deal." },
    { q: "Is my money safe with Safeeely?", a: "Absolutely. Funds are held in a secure escrow account and never released until both parties confirm delivery. In the event of a dispute, our AI reviews evidence from both sides and resolves it within 2 hours." },
  ],
  buyers: [
    { q: "How do I start a transaction as a buyer?", a: "Simply send a voice note or text message describing the deal in your chat. Safeeely's AI will structure the transaction details and prompt you to confirm before locking any funds." },
    { q: "When does the seller receive my payment?", a: "Your payment is held securely in escrow until you confirm you've received what was agreed. For milestone deals, each payment only releases after you approve that specific milestone." },
    { q: "What if I'm not satisfied with what I received?", a: "Raise a dispute directly in the chat. Our AI reviews evidence from both sides and resolves within 2 hours. Complex cases escalate instantly to a human mediator — your money stays protected throughout." },
    { q: "Can I cancel a transaction?", a: "Yes. If the seller hasn't yet delivered, you can request a mutual cancellation. If both parties agree, funds are returned immediately. Otherwise you can open a dispute and Safeeely will investigate." },
  ],
  sellers: [
    { q: "How do I receive payment as a seller?", a: "Once the buyer confirms delivery, Safeeely releases your funds instantly to your linked account. You'll receive a notification in the same chat where the deal was made — no chasing payments." },
    { q: "How quickly do I get paid after delivery?", a: "Payment is released within minutes of buyer confirmation. Safeeely processes payouts to your bank account or digital wallet same-day — no waiting periods, no holds." },
    { q: "What fees do I pay as a seller?", a: "Safeeely's fees are less than 1/4th of what Upwork or Fiverr charge. Fees can be split between buyer and seller by agreement — you keep significantly more of every deal you close." },
    { q: "Can I split a project into milestone payments?", a: "Yes. Break any project into milestone payments right inside your social chat. Each milestone releases independently — you get paid progressively as you deliver, and the buyer only pays for completed work." },
  ],
};

function Accordion({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={i}
            style={{
              background: isOpen ? "#f0fdf4" : "#f8fafb",
              borderRadius: "16px",
              padding: "20px 24px",
              cursor: "pointer",
              transition: "background .22s,transform .22s,box-shadow .22s",
            }}
            onMouseEnter={(e) => { if (!isOpen) { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(0,0,0,.07)"; } }}
            onMouseLeave={(e) => { if (!isOpen) { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; } }}
          >
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
              onClick={() => setOpenIdx(isOpen ? null : i)}
            >
              <span style={{ fontSize: "15px", fontWeight: 500, color: isOpen ? "#047857" : "#111", lineHeight: 1.4 }}>{item.q}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform .3s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div
              ref={(el) => { answerRefs.current[i] = el; }}
              style={{
                maxHeight: isOpen ? (answerRefs.current[i] ? answerRefs.current[i]!.scrollHeight + 40 + "px" : "500px") : "0",
                overflow: "hidden",
                opacity: isOpen ? 1 : 0,
                transition: "max-height .38s ease,opacity .28s ease",
              }}
            >
              <p style={{ paddingTop: "14px", fontSize: "14px", color: "#6b7280", lineHeight: 1.75, margin: 0 }}>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FaqSection() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          (en.target as HTMLElement).style.opacity = "1";
          (en.target as HTMLElement).style.transform = "translateY(0)";
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.2 });
    if (headingRef.current) io.observe(headingRef.current);
    if (subRef.current) io.observe(subRef.current);
    return () => io.disconnect();
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "buyers", label: "For Buyers" },
    { id: "sellers", label: "For Sellers" },
  ];

  return (
    <section style={{ background: "#fff", padding: "100px 40px 120px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2
            ref={headingRef}
            style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: "clamp(36px,4vw,52px)", lineHeight: 1.1, letterSpacing: "-.03em", color: "#111111", margin: "0 0 16px", opacity: 0, transform: "translateY(32px)", transition: "opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)" }}
          >
            Frequently Asked<br />Questions
          </h2>
          <p
            ref={subRef}
            style={{ fontSize: "15px", color: "#6b7280", margin: 0, lineHeight: 1.6, opacity: 0, transform: "translateY(20px)", transition: "opacity .6s .15s cubic-bezier(.16,1,.3,1),transform .6s .15s cubic-bezier(.16,1,.3,1)" }}
          >
            Everything you need to know about using Safeeely.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "40px" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? "#0f172a" : "#f1f5f9",
                color: activeTab === t.id ? "#fff" : "#64748b",
                border: "none", borderRadius: "999px", padding: "11px 26px",
                fontFamily: "inherit", fontSize: "14px",
                fontWeight: activeTab === t.id ? 600 : 500,
                cursor: "pointer", transition: "all .22s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Accordion key={activeTab} items={FAQ[activeTab]} />
      </div>
    </section>
  );
}
