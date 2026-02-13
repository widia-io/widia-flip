import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Manrope, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PromoBanner } from "@/components/PromoBanner";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

const displayFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const defaultTitle = "Meu Flip - Analise flips em 30 segundos";
const defaultDescription =
  "Flip Score, viabilidade cash/financiada, custos e documentos. O sistema completo para investidores imobiliários.";
const defaultOgImage = absoluteUrl("/screenshots/dashboard-new.png");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: defaultTitle,
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: SITE_URL,
    siteName: "Meu Flip",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: defaultOgImage,
        width: 1920,
        height: 1080,
        alt: "Meu Flip - Plataforma de House Flipping",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NEL2T3C1VW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NEL2T3C1VW');
          `}
        </Script>
      </head>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <PromoBanner />
          {children}
          <Toaster />
          <WhatsAppButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
