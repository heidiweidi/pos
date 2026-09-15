import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/ui/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Restohub POS",
  description: "Restohub Trading Co. point-of-sale terminal",
  applicationName: "Restohub POS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Restohub POS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#006948",
  width: "device-width",
  initialScale: 1,
  // A register is a fixed-size touch surface; pinch-zoom only causes mis-taps.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts load as stylesheets rather than via next/font so the build never
          depends on network access to Google Fonts (CI, air-gapped runners,
          Cloudflare build images). The service worker caches fonts.gstatic.com,
          and every family has a real system fallback stack in tailwind.config.ts,
          so a lane that boots offline still renders correctly.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
          no-page-custom-font targets the Pages Router, where a <link> outside
          pages/_document.js loads on one page only. This is the App Router root
          layout, so these apply app-wide — the rule does not apply here.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=Inter:opsz,wght@14..32,400..700&display=swap"
        />
        {/*
          display=block, not swap, is deliberate for the icon font: Material
          Symbols renders by ligature, so a fallback face shows the raw words
          ("barcode_scanner", "point_of_sale") across the UI until it loads.
          A brief blank is far better than that on a checkout screen.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen select-none">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
