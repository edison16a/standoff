import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { SITE } from "@/shared/site";
import "./globals.css";
import "@/styles/ui.css";
import "@/styles/tabs.css";
import "@/styles/range.css";
import "@/styles/landing.css";
import "@/styles/stage.css";
import "@/styles/stage-overlays.css";
import "@/styles/controller.css";
import "@/styles/controller-pad.css";

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Phones are controllers. A stray pinch should not zoom the page mid swing.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/**
 * Applies the saved theme, or the system one, before the first paint so
 * the page never flashes the wrong colours.
 */
const themeBootScript = `
(function () {
  try {
    var saved = localStorage.getItem("standoff:theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
