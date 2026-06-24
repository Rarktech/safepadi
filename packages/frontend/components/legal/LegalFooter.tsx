import Link from "next/link";

export interface ContactEmail {
    label: string;
    email: string;
}

interface LegalFooterProps {
    crossPageHref: string;
    crossPageLabel: string;
    contactEmails: ContactEmail[];
    copyrightLine: string;
}

export function LegalFooter({ crossPageHref, crossPageLabel, contactEmails, copyrightLine }: LegalFooterProps) {
    return (
        <footer style={{ background: "#0f172a", padding: "60px 32px 36px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 48, flexWrap: "wrap", marginBottom: 48, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ maxWidth: 280 }}>
                        <img src="/logo-main.svg" alt="Safeeely" style={{ height: 28, width: "auto", display: "block", marginBottom: 14 }} />
                        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,.45)", margin: "0 0 20px" }}>
                            Secure every social-media deal through a single escrow link — protected end to end.
                        </p>
                        <Link href={crossPageHref} style={{ fontSize: 13, fontWeight: 600, color: "#10b981", textDecoration: "none" }}>
                            {crossPageLabel} →
                        </Link>
                    </div>
                    <div style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16 }}>Legal</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <Link href="/terms" style={{ fontSize: 13.5, color: "rgba(255,255,255,.6)", textDecoration: "none" }}>
                                    Terms of Service
                                </Link>
                                <Link href="/privacy" style={{ fontSize: 13.5, color: "rgba(255,255,255,.6)", textDecoration: "none" }}>
                                    Privacy Policy
                                </Link>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16 }}>Contact</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {contactEmails.map((c) => (
                                    <a key={c.email} href={`mailto:${c.email}`} style={{ fontSize: 13.5, color: "rgba(255,255,255,.6)", textDecoration: "none" }}>
                                        {c.email}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)", margin: 0 }}>{copyrightLine}</p>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.2)", margin: 0 }}>Built for secure transactions.</p>
                </div>
            </div>
        </footer>
    );
}
