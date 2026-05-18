import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng"),
  title: {
    default: "LOBB — Book a coach. Not a favor.",
    template: "%s | LOBB",
  },
  description:
    "Lagos's verified tennis coaches, bookable in under 90 seconds. Video-reviewed, rated by real players, guaranteed.",
  applicationName: "LOBB",
  keywords: ["tennis coach Lagos", "book tennis coach", "Lagos tennis", "verified tennis coach Nigeria"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "LOBB — Book a coach. Not a favor.",
    description: "Lagos's verified tennis coaches, bookable in under 90 seconds.",
    url: "https://lobb.ng",
    siteName: "LOBB",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LOBB",
    description: "Book a coach. Not a favor.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable, geistMono.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
