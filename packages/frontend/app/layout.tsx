import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safeeely | Secure Your Deals",
  description: "AI-powered escrow protection for social media trades, freelance gigs, and crypto.",
  icons: {
    icon: "/logo-mark.svg",
  },
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
