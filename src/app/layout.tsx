import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LobbToaster, OfflineState } from "@/providers/lobb-global-state";
import { DevRoleSwitcher } from "@/components/dev/dev-role-switcher";
import { LobbPostHogProvider } from "@/providers/posthog-provider";

const siteUrl = "https://lobb.ng";
const siteDescription =
  "LOBB helps players in Lagos book verified tennis coaches with clear availability, trusted reviews, and secure payments.";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || siteUrl),
  title: {
    default: "LOBB - Book Verified Tennis Coaches in Lagos",
    template: "%s | LOBB",
  },
  description: siteDescription,
  applicationName: "LOBB",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LOBB",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
  },
  keywords: [
    "LOBB",
    "LOBB Nigeria",
    "tennis coach Lagos",
    "book tennis coach",
    "Lagos tennis",
    "verified tennis coach Nigeria",
    "private tennis lessons Lagos",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "LOBB - Book Verified Tennis Coaches in Lagos",
    description: siteDescription,
    url: siteUrl,
    siteName: "LOBB",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LOBB - Book Verified Tennis Coaches in Lagos",
    description: siteDescription,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "LOBB",
      alternateName: ["LOBB Nigeria", "LOBB Tennis"],
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      description: siteDescription,
      areaServed: {
        "@type": "City",
        name: "Lagos",
        addressCountry: "NG",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "LOBB",
      alternateName: ["LOBB Nigeria", "LOBB Tennis"],
      url: siteUrl,
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: "en-NG",
      description: siteDescription,
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0D0D0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable, geistMono.variable)}>
      <body className="antialiased">
        <div className="lobb-pwa-boot" aria-hidden="true">
          <div className="lobb-pwa-boot-mark">
            <svg width="68" height="68" viewBox="0 0 64 64" fill="none" className="lobb-boot-svg">
              <path
                d="M 8 56 C 8 4 56 4 56 56"
                stroke="url(#boot-logo-grad)"
                strokeWidth="5"
                strokeLinecap="round"
                className="lobb-boot-path"
              />
              <circle
                cx="32"
                cy="17"
                r="6.5"
                fill="var(--lobb-clay)"
                className="lobb-boot-circle"
              />
              <defs>
                <linearGradient id="boot-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C4622D" />
                  <stop offset="100%" stopColor="#E2824C" />
                </linearGradient>
              </defs>
            </svg>
            <span className="lobb-boot-title">LOBB</span>
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <LobbPostHogProvider>
          <LobbToaster />
          <OfflineState />
          <DevRoleSwitcher />
          {children}
        </LobbPostHogProvider>
      </body>
    </html>
  );
}
