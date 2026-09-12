import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LobbToaster, OfflineState } from "@/providers/lobb-global-state";
import { LobbPostHogProvider } from "@/providers/posthog-provider";
import { LobbMixpanelProvider } from "@/providers/mixpanel-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { GoogleAnalytics } from "@next/third-parties/google";

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
    apple: "/icons/apple-touch-icon-180.png",
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0D0D" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable, geistMono.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-4 py-2 text-sm font-medium text-[var(--lobb-text-inverse)] focus:not-sr-only">
          Skip to content
        </a>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = localStorage.getItem('lobb-theme');
                var theme = storedTheme === 'dark' || storedTheme === 'light'
                  ? storedTheme
                  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme !== 'dark' && theme !== 'light') theme = 'light';
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
              } catch (_) {
                document.documentElement.dataset.theme = 'light';
                document.documentElement.style.colorScheme = 'light';
              }
            `,
          }}
        />
        {/* App launch splash — installed-PWA only (gated in CSS). Mark only,
            no wordmark underneath: the icon that's about to be the app icon
            on their home screen is the entire point of this moment. */}
        <div className="lobb-pwa-boot" aria-hidden="true">
          <div className="lobb-pwa-boot-mark">
            <svg width="96" height="96" viewBox="0 0 64 64" fill="none" className="lobb-boot-svg">
              <path
                d="M 12 54 C 9 25 20 7 35 6 C 50 5 59 15 58 29 C 57.5 39 51 47 41 51"
                stroke="url(#boot-grad)"
                strokeWidth="6.5"
                strokeLinecap="round"
                pathLength="1"
                className="lobb-boot-path"
              />
              <circle cx="36" cy="7.5" r="8.5" fill="#C4622D" className="lobb-boot-circle" />
              <defs>
                <linearGradient id="boot-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C4622D" />
                  <stop offset="100%" stopColor="#E08048" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ThemeProvider>
          <LobbPostHogProvider>
            <LobbMixpanelProvider />
            <LobbToaster />
            <OfflineState />
            {children}
          </LobbPostHogProvider>
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
