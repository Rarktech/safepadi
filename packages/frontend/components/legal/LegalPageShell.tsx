"use client";
import { ReactNode, useRef } from "react";
import { useScrollChrome } from "./useScrollChrome";
import { LegalNav } from "./LegalNav";
import { LegalHero, HeroStat } from "./LegalHero";
import { LegalSidebarToc, TocEntry } from "./LegalSidebarToc";
import { LegalFooter, ContactEmail } from "./LegalFooter";

interface LegalPageShellProps {
    titlePrefix: string;
    titleEmphasis: string;
    description: string;
    heroStats: HeroStat[];
    dateCaption: string;
    tocEntries: TocEntry[];
    tocCardTitle: string;
    tocCardEmail: string;
    crossPageHref: string;
    crossPageLabel: string;
    footerCrossPageLabel: string;
    contactEmails: ContactEmail[];
    copyrightLine: string;
    children: ReactNode;
}

export function LegalPageShell({
    titlePrefix,
    titleEmphasis,
    description,
    heroStats,
    dateCaption,
    tocEntries,
    tocCardTitle,
    tocCardEmail,
    crossPageHref,
    crossPageLabel,
    footerCrossPageLabel,
    contactEmails,
    copyrightLine,
    children,
}: LegalPageShellProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const { scrolled, menuOpen, progress, activeSection, toggleMenu, closeMenu, scrollToHash } = useScrollChrome(rootRef);

    return (
        <div ref={rootRef} style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter',sans-serif" }}>
            <div style={{ position: "fixed", top: 0, left: 0, height: 3, background: "linear-gradient(90deg,#10b981,#34d399)", zIndex: 300, width: `${progress}%`, transition: "width .1s linear", pointerEvents: "none" }} />

            <LegalNav scrolled={scrolled} menuOpen={menuOpen} toggleMenu={toggleMenu} closeMenu={closeMenu} crossPageHref={crossPageHref} crossPageLabel={crossPageLabel} />

            <LegalHero titlePrefix={titlePrefix} titleEmphasis={titleEmphasis} description={description} stats={heroStats} dateCaption={dateCaption} />

            <div className="sf-legal-content-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 36px", display: "flex", alignItems: "flex-start", gap: 56 }}>
                <LegalSidebarToc entries={tocEntries} activeSection={activeSection} cardTitle={tocCardTitle} cardEmail={tocCardEmail} onLinkClick={scrollToHash} />
                <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
            </div>

            <LegalFooter crossPageHref={crossPageHref} crossPageLabel={footerCrossPageLabel} contactEmails={contactEmails} copyrightLine={copyrightLine} />

            <style jsx global>{`
                .sf-legal-toc-wrap {
                    scrollbar-width: thin;
                    scrollbar-color: #e2e8f0 transparent;
                }
                .sf-legal-toc-wrap::-webkit-scrollbar {
                    width: 3px;
                }
                .sf-legal-toc-wrap::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 4px;
                }
                .sf-legal-tl:hover {
                    color: #0f172a;
                    background: #f8fafb;
                }
                .sf-legal-burger {
                    display: none !important;
                }
                .sf-legal-navlinks {
                    display: flex;
                }
                .sf-legal-sb {
                    display: block;
                }
                @media (max-width: 1000px) {
                    .sf-legal-g3 {
                        grid-template-columns: 1fr 1fr !important;
                    }
                }
                @media (max-width: 768px) {
                    .sf-legal-g2,
                    .sf-legal-g3 {
                        grid-template-columns: 1fr !important;
                    }
                    .sf-legal-navlinks {
                        display: none !important;
                    }
                    .sf-legal-burger {
                        display: flex !important;
                    }
                    .sf-legal-sb {
                        display: none !important;
                    }
                    .sf-legal-hero-stats {
                        flex-direction: column !important;
                        border-radius: 12px !important;
                    }
                    .sf-legal-hero-stat {
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                    }
                    .sf-legal-hero-stat:last-child {
                        border-bottom: none !important;
                    }
                    .sf-legal-content-wrap {
                        flex-direction: column !important;
                        padding: 40px 20px !important;
                    }
                    .sf-legal-hero-inner {
                        padding: 96px 20px 56px !important;
                    }
                }
            `}</style>
        </div>
    );
}
