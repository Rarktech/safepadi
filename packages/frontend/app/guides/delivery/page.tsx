"use client";

import type { ReactNode } from "react";
import Link from "next/link";

function StepIcon({ danger, children }: { danger?: boolean; children: ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={danger ? "#dc2626" : "#059669"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function CatIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function RuleIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function Step({ icon, title, desc, danger, last }: { icon: ReactNode; title: string; desc: string; danger?: boolean; last?: boolean }) {
  return (
    <div
      className="sdg-step"
      style={{
        padding: "20px 28px",
        borderBottom: last ? undefined : "1px solid #f1f5f9",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        transition: "background .15s, border-color .15s",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          background: danger ? "#fef2f2" : "#f0fdf4",
          border: danger ? "1px solid #fecaca" : "1px solid #bbf7d0",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <StepIcon danger={danger}>{icon}</StepIcon>
      </div>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>{title}</p>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: "#64748b", margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function CategoryCard({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="sdg-cat-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden", transition: "border-color .2s, box-shadow .2s" }}>
      <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "24px 28px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CatIcon>{icon}</CatIcon>
        </div>
        <div>
          <h3 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-.025em", color: "#0f172a", margin: "0 0 3px" }}>{title}</h3>
          <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, fontWeight: 500 }}>{subtitle}</p>
        </div>
        <div style={{ marginLeft: "auto", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "4px 12px", fontSize: 11.5, fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>6 steps</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function RuleItem({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="sdg-rule-item" style={{ padding: "22px 24px", borderRadius: 14, transition: "background .15s", cursor: "default" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 36, height: 36, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <RuleIcon>{icon}</RuleIcon>
        </div>
        <div>
          <p style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 6px", letterSpacing: "-.015em" }}>{title}</p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: "#94a3b8", margin: 0 }}>{desc}</p>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryGuidelines() {
  return (
    <>
      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/assets/safeeely-logo.png" alt="Safeeely" style={{ height: 24, width: "auto", objectFit: "contain" }} />
          </a>
          <div className="sdg-nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <a href="#" style={{ fontSize: 14, fontWeight: 500, color: "#475569", textDecoration: "none" }}>Product</a>
            <a href="#" style={{ fontSize: 14, fontWeight: 500, color: "#475569", textDecoration: "none" }}>Services</a>
            <a href="#" style={{ fontSize: 14, fontWeight: 500, color: "#475569", textDecoration: "none" }}>Jobs</a>
            <Link href="/guides/delivery" style={{ fontSize: 14, fontWeight: 600, color: "#10b981", textDecoration: "none" }}>Guides</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="sdg-hero" style={{ padding: "136px 32px 72px", maxWidth: 1160, margin: "0 auto", animation: "sdgRiseIn .7s cubic-bezier(.16,1,.3,1) both" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "6px 16px", marginBottom: 28 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "#059669", textTransform: "uppercase" }}>Seller Protection Guide</span>
        </div>
        <h1 className="sdg-hero-h1" style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, fontSize: 58, lineHeight: 1.04, letterSpacing: "-.04em", color: "#0f172a", margin: "0 0 22px", maxWidth: 780 }}>
          Delivery Guidelines.<br />
          <span style={{ color: "#10b981", fontStyle: "italic" }}>Protect your funds, every time.</span>
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#64748b", maxWidth: 620, margin: "0 0 40px", fontWeight: 450 }}>
          How to deliver safely and defend your payout. Follow these steps for every transaction — documented proof is your strongest defence in any dispute with Safeeely&apos;s escrow system.
        </p>

        {/* stat bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, border: "1px solid #e2e8f0", borderRadius: 20, overflow: "hidden", maxWidth: 740 }}>
          <div style={{ flex: 1, minWidth: 160, padding: "22px 28px", borderRight: "1px solid #e2e8f0" }}>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: "-.04em", color: "#10b981", lineHeight: 1 }}>7 days</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 5, fontWeight: 500 }}>auto-release window after you mark delivery done</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: "22px 28px", borderRight: "1px solid #e2e8f0" }}>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: "-.04em", color: "#0f172a", lineHeight: 1 }}>4 types</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 5, fontWeight: 500 }}>of deliveries — each with its own proof protocol</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: "22px 28px" }}>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: "-.04em", color: "#0f172a", lineHeight: 1 }}>100%</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 5, fontWeight: 500 }}>dispute resolutions rely on your uploaded evidence</div>
          </div>
        </div>
      </section>

      {/* ALERT BANNER */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 32px 48px" }}>
        <div className="sdg-alert" style={{ display: "flex", alignItems: "flex-start", gap: 20, background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 20, padding: "28px 32px" }}>
          <div style={{ width: 44, height: 44, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 17, color: "#991b1b", margin: "0 0 8px", letterSpacing: "-.02em" }}>No proof = no protection</p>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#b91c1c", margin: 0 }}>
              If a buyer disputes your delivery and you have no documented evidence on file, <strong>funds may be automatically returned to the buyer</strong>. The 7-day auto-release rule applies — if a buyer does not respond within 7 days of you marking delivery complete, funds are automatically released to you. Document everything, every time. Upload via the Proof Portal — not just the chat window.
            </p>
          </div>
        </div>
      </div>

      {/* DELIVERY CATEGORIES */}
      <div className="sdg-content" style={{ maxWidth: 1160, margin: "0 auto", padding: "0 32px 100px" }}>

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 12px" }}>Delivery Type Protocols</p>
          <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-.03em", color: "#0f172a", margin: 0 }}>Follow the exact steps for your delivery type.</h2>
        </div>

        <div className="sdg-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 72 }}>

          {/* PHYSICAL GOODS */}
          <CategoryCard
            icon={
              <>
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </>
            }
            title="Physical Goods"
            subtitle="Tangible items shipped by courier or handed in person"
          >
            <Step
              icon={<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>}
              title="Record a packaging video"
              desc="Film the item in its pre-packaged state, then continue recording as you seal and box it. The video must show the item is intact, undamaged, and matches what was advertised. This is your first and most powerful proof."
            />
            <Step
              icon={<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>}
              title="Multi-angle item photos"
              desc="Take a minimum of 4 clear photographs from different angles before sealing the package — front, back, sides, and any identifying labels or serial numbers. Upload all photos to the Proof Portal before shipping."
            />
            <Step
              icon={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>}
              title="Get a receipt with tracking number"
              desc="Obtain a shipping receipt that clearly shows a tracking number, the recipient's address, and the shipment date. Never skip this step — this single document proves dispatch and is critical in any dispute. Upload a photo of the receipt to the Proof Portal immediately."
            />
            <Step
              icon={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
              title="Share tracking with the buyer immediately"
              desc="Send the full tracking number to the buyer via the Safeeely transaction chat as soon as the item is shipped. This eliminates ambiguity, sets delivery expectations, and creates a timestamped communication trail that supports your case if any dispute is raised."
            />
            <Step
              icon={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></>}
              title="Request a delivery confirmation or signature"
              desc={`Where possible, request a signed delivery confirmation from the courier or the recipient. For in-person handoffs, ask the buyer to confirm receipt in writing — even a short message saying "received, thank you" counts as written confirmation and significantly strengthens your position.`}
            />
            <Step
              danger
              last
              icon={<><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>}
              title="Never mark complete before physical receipt"
              desc="Do not mark the transaction as complete until the buyer has physically received the item and confirmed receipt. Marking complete prematurely removes your ability to add further proof and may trigger the escrow release before delivery is verified."
            />
          </CategoryCard>

          {/* DIGITAL PRODUCTS */}
          <CategoryCard
            icon={
              <>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </>
            }
            title="Digital Products & Files"
            subtitle="Software, designs, documents, downloads, access keys"
          >
            <Step
              icon={<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>}
              title="Screenshot the completed file before sending"
              desc="Take a clear screenshot of the final file, product, or output in its completed state before you transfer it to the buyer. This screenshot, timestamped by your device, proves the deliverable existed and was ready for transfer at a specific point in time."
            />
            <Step
              icon={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>}
              title="Upload via the Proof Portal — not just chat"
              desc="All deliverables must be submitted through the Safeeely Proof Portal. Chat messages can be deleted by either party and are not admissible as primary evidence in a dispute. The Proof Portal creates a permanent, tamper-proof record of what you submitted and exactly when."
            />
            <Step
              icon={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>}
              title="Send deliverables to the buyer's email"
              desc="In addition to the Proof Portal upload, send the final files to the buyer's registered email address. An email delivery creates an independent timestamped paper trail that is completely separate from the Safeeely platform, giving you a second, external layer of delivery evidence."
            />
            <Step
              icon={<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></>}
              title="Document download links with screenshots"
              desc="If delivery involves a download link, record the full URL and take a screenshot of the destination page before sharing. This proves the link existed, was functional, and pointed to the correct content at the time of delivery — and protects you if the buyer later claims the link was broken or invalid."
            />
            <Step
              icon={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
              title="Set a clear access/download timeline"
              desc="State clearly in the transaction chat when the buyer can access or download the files, and document the exact date and time the files were sent. Ambiguity about when something was delivered is one of the most common grounds for disputes — eliminate it entirely with explicit timestamps."
            />
            <Step
              last
              icon={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
              title="Get written receipt confirmation from buyer"
              desc={`Before marking the transaction complete, ask the buyer to confirm receipt in writing via the transaction chat. A simple acknowledgement — "received the files, looks good" — is legally meaningful and protects both parties. Do not close the transaction without this written confirmation.`}
            />
          </CategoryCard>

          {/* SERVICES */}
          <CategoryCard
            icon={<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />}
            title="Services & Freelance Work"
            subtitle="Writing, design, development, consulting, and other skilled work"
          >
            <Step
              icon={<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>}
              title="Screen-record a full deliverable walkthrough"
              desc="A screen-recording walkthrough of your completed work is the single most persuasive piece of evidence you can produce for a service delivery. Walk through every element — show functionality, completeness, and quality. This is far harder to dispute than screenshots alone and demonstrates you delivered exactly what was agreed."
            />
            <Step
              icon={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></>}
              title="Export and save a complete copy of all work"
              desc="Before delivery, export and retain a copy of everything you have produced — every file, every version, every document. Code repositories, design files, written drafts, data exports. Store them in a labelled folder. If a dispute arises days or weeks later, you will need to retrieve specific work items quickly to support your evidence submission."
            />
            <Step
              icon={<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></>}
              title="Share live links as timestamped evidence"
              desc="If your deliverable is accessible via a URL — a live website, a hosted portfolio, a deployed application — share the link in the transaction chat alongside a screenshot of the live page. The chat timestamp plus the screenshot together create irrefutable evidence of delivery at a specific moment."
            />
            <Step
              icon={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>}
              title="Deliver final work via email for a timestamped record"
              desc="Email your final deliverable directly to the buyer's registered address. Email headers are legally admissible and contain precise delivery timestamps, server routing data, and sender verification metadata. This creates an independent delivery record entirely separate from the Safeeely platform."
            />
            <Step
              icon={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></>}
              title="Maintain a shared task checklist"
              desc="Create a written checklist of every agreed deliverable at the start of the transaction and share it with the buyer via the transaction chat. Tick off items as you complete them and share each update. This demonstrates organised, transparent progress and eliminates any ambiguity about what was agreed versus what was delivered."
            />
            <Step
              last
              icon={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
              title="Get written sign-off before marking done"
              desc="Do not mark any service transaction as complete without first receiving written confirmation from the buyer that they have received, reviewed, and accepted the work. This is your final, definitive record of buyer acceptance and is the most important single proof element you can hold."
            />
          </CategoryCard>

          {/* MILESTONE */}
          <CategoryCard
            icon={
              <>
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
              </>
            }
            title="Milestone Projects"
            subtitle="Phased deliveries — each phase treated as its own transaction"
          >
            <Step
              icon={<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>}
              title="Document each phase separately as a mini-delivery"
              desc="Treat every milestone as its own standalone delivery. Create a dedicated folder of screenshots, recordings, and files for each phase. Label each folder with the phase name and completion date. This discipline means that if a dispute arises on Phase 3, your Phase 1 and Phase 2 evidence is instantly retrievable and clearly separated."
            />
            <Step
              icon={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></>}
              title="Get written sign-off after each completed phase"
              desc="Require explicit written approval from the buyer after every completed phase before you begin the next. This sign-off is critical — it prevents the buyer from retroactively claiming earlier phases were incomplete and ensures that any scope dispute is limited only to the current phase, not the entire project."
            />
            <Step
              icon={<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>}
              title="Record a walkthrough video per milestone handover"
              desc="At each milestone handover point, record a short walkthrough video demonstrating the completed deliverable. A 2–5 minute recording that narrates what you built, what was agreed, and how the output meets the specification is compelling evidence that no single screenshot can replicate."
            />
            <Step
              icon={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
              title="Retain all milestone-related communication"
              desc="Keep a complete log of all messages, emails, and comments related to each milestone. Communications serve as a contextual backbone for your evidence — they show that you were responsive, that requirements were agreed upon, and that delivery was acknowledged. Never delete project-related messages until funds are fully released."
            />
            <Step
              icon={<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />}
              title="Save phase files in clearly labelled folders"
              desc={`Organise every phase's deliverables into clearly labelled folders — for example: "Phase 1 — Wireframes — Delivered 12 Jun" or "Phase 3 — Final Code — Signed Off 28 Jun". Logical naming and clean organisation means you can locate and present any piece of evidence in under 60 seconds, which matters enormously during a dispute review window.`}
            />
            <Step
              danger
              last
              icon={<><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>}
              title="Never start the next phase without written sign-off"
              desc="This is the most important rule for milestone projects: do not begin work on any subsequent phase until the previous phase has been explicitly signed off in writing by the buyer. Starting phase 2 before phase 1 is approved means you are working at financial risk, with no protected escrow to fall back on if the buyer disputes earlier work."
            />
          </CategoryCard>
        </div>

        {/* GENERAL RULES */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 12px" }}>Universal Rules</p>
          <h2 style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-.03em", color: "#0f172a", margin: 0 }}>Apply these to every transaction, without exception.</h2>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 24, padding: "40px 40px 32px", overflow: "hidden", position: "relative" }}>
          {/* subtle glow */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, background: "radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div className="sdg-rules-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <RuleItem
              icon={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>}
              title="When in doubt, document it"
              desc="Over-documenting has never cost anyone their payout. Under-documenting has. If you are unsure whether something is worth capturing, capture it anyway — the Proof Portal has no upload limit and every piece of evidence you add strengthens your position."
            />
            <RuleItem
              icon={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>}
              title="Always upload via the Proof Portal"
              desc="Chat messages can be deleted by either party at any time and are not considered primary evidence during dispute resolution. The Proof Portal is the only official evidence channel — everything you upload there is immutable, timestamped, and reviewed directly by Safeeely's dispute team."
            />
            <RuleItem
              icon={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
              title="The 7-day auto-release rule"
              desc="After you mark delivery complete, the buyer has exactly 7 days to confirm receipt or raise a dispute. If they do neither, funds are automatically and irreversibly released to you. There is nothing you need to do to trigger this — it is automatic. But if a dispute IS raised, your uploaded evidence is everything."
            />
            <RuleItem
              icon={<><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>}
              title="Never mark complete prematurely"
              desc="Marking a transaction complete before delivery is confirmed locks in the status and begins the 7-day countdown. If delivery has not actually occurred and the buyer disputes, you will have no factual basis to contest. Only mark complete when the item or service has been received and acknowledged."
            />
            <RuleItem
              icon={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
              title="Communicate delays in writing"
              desc="If your delivery will be delayed for any reason, communicate this to the buyer in writing via the transaction chat immediately — before the delay occurs, not after. Proactive, written communication demonstrates good faith. During a dispute review, good-faith communication is one of the factors that weighs in your favour."
            />
            <RuleItem
              icon={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>}
              title="Safeeely escrow protects both sides"
              desc="The escrow system exists to protect both buyers and sellers. Funds are held securely until delivery is confirmed — the buyer cannot be scammed by a non-delivering seller, and the seller cannot be scammed by a non-paying buyer. Use the system correctly and it protects you completely."
            />
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div style={{ marginTop: 48, padding: "28px 32px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 16, color: "#0f172a", margin: "0 0 5px", letterSpacing: "-.02em" }}>Need support with a delivery dispute?</p>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>Contact Safeeely support through your messaging bot or visit your dashboard at any time.</p>
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes sdgRiseIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sdgFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        :global(.sdg-step:hover) { background: #f8fafc !important; border-color: #bbf7d0 !important; }
        :global(.sdg-cat-card:hover) { border-color: #10b981 !important; box-shadow: 0 8px 32px rgba(16,185,129,.1) !important; }
        :global(.sdg-rule-item:hover) { background: rgba(255,255,255,.07) !important; }
        @media (max-width: 768px) {
          :global(.sdg-hero-h1) { font-size: 38px !important; }
          :global(.sdg-nav-links) { display: none !important; }
          :global(.sdg-content) { padding: 32px 20px 80px !important; }
          :global(.sdg-grid) { grid-template-columns: 1fr !important; }
          :global(.sdg-hero) { padding: 120px 20px 56px !important; }
          :global(.sdg-alert) { flex-direction: column !important; gap: 16px !important; }
          :global(.sdg-rules-grid) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
