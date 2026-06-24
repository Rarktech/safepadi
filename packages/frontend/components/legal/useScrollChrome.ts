"use client";
import { RefObject, useEffect, useRef, useState } from "react";

export interface ScrollChrome {
    scrolled: boolean;
    menuOpen: boolean;
    progress: number;
    activeSection: string | null;
    toggleMenu: () => void;
    closeMenu: () => void;
    scrollToHash: (id: string) => void;
}

// Ports the mockup's DCLogic scroll handler 1:1: scroll-position polling (not
// IntersectionObserver) so the exact `top <= 110` scroll-spy threshold and the
// forward-iteration "last match wins" section-activation behavior are preserved.
export function useScrollChrome(rootRef: RefObject<HTMLDivElement | null>): ScrollChrome {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const scrolledRef = useRef(scrolled);
    const activeRef = useRef(activeSection);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const onScroll = () => {
            const sy = window.scrollY;

            const s = sy > 40;
            if (s !== scrolledRef.current) {
                scrolledRef.current = s;
                setScrolled(s);
            }

            const total = document.documentElement.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(100, (sy / total) * 100) : 0);

            let active: string | null = null;
            root.querySelectorAll<HTMLElement>("[data-section]").forEach((sec) => {
                if (sec.getBoundingClientRect().top <= 110) active = sec.dataset.section ?? null;
            });
            if (active !== activeRef.current) {
                activeRef.current = active;
                setActiveSection(active);
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [rootRef]);

    const scrollToHash = (id: string) => {
        const target = document.getElementById(id);
        if (target) {
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
        }
        setMenuOpen(false);
    };

    return {
        scrolled,
        menuOpen,
        progress,
        activeSection,
        toggleMenu: () => setMenuOpen((o) => !o),
        closeMenu: () => setMenuOpen(false),
        scrollToHash,
    };
}
