import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LobbToaster, OfflineState } from "@/components/lobb-global-state";

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <LobbToaster />
        <OfflineState />
        {children}
      </body>
    </html>
  );
}
