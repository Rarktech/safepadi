import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { PrivacySections, privacyHeroStats, privacyTocEntries } from "@/components/legal/content/privacy";

export default function PrivacyPolicy() {
    return (
        <LegalPageShell
            titlePrefix="Privacy"
            titleEmphasis="Policy"
            description="How Safeeely collects, uses, and protects your personal data. Your privacy is fundamental to how we build our platform."
            heroStats={privacyHeroStats}
            dateCaption="Effective: March 9, 2026 — Questions? privacy@safeeely.io"
            tocEntries={privacyTocEntries}
            tocCardTitle="Data Requests"
            tocCardEmail="privacy@safeeely.io"
            crossPageHref="/terms"
            crossPageLabel="Terms"
            footerCrossPageLabel="View Terms of Service"
            contactEmails={[{ label: "Privacy", email: "privacy@safeeely.io" }, { label: "Legal", email: "legal@safeeely.io" }, { label: "Security", email: "security@safeeely.io" }]}
            copyrightLine="© 2026 Safeeely Technology. Effective: March 9, 2026. Privacy compliant."
        >
            <PrivacySections />
        </LegalPageShell>
    );
}
