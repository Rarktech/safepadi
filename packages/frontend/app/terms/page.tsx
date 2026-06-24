import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { TermsSections, termsHeroStats, termsTocEntries } from "@/components/legal/content/terms";

export default function TermsOfService() {
    return (
        <LegalPageShell
            titlePrefix="Terms of"
            titleEmphasis="Service"
            description="This agreement governs your use of the Safeeely platform. By using Safeeely, you accept these terms in full. Please read carefully before proceeding."
            heroStats={termsHeroStats}
            dateCaption="Effective: May 18, 2026 — Last Updated: May 18, 2026"
            tocEntries={termsTocEntries}
            tocCardTitle="Questions?"
            tocCardEmail="legal@safeeely.io"
            crossPageHref="/privacy"
            crossPageLabel="Privacy"
            footerCrossPageLabel="View Privacy Policy"
            contactEmails={[{ label: "Support", email: "support@safeeely.io" }, { label: "Legal", email: "legal@safeeely.io" }, { label: "Privacy", email: "privacy@safeeely.io" }]}
            copyrightLine="© 2026 Safeeely Technology. These Terms were last updated on May 18, 2026."
        >
            <TermsSections />
        </LegalPageShell>
    );
}
