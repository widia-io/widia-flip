import "./globals.css";

import type { ReactNode } from "react";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PromoBanner } from "@/components/PromoBanner";

export const metadata = {
  title: "Meu Flip - Analise flips em 30 segundos",
  description: "Flip Score, viabilidade cash/financiada, custos e documentos. O sistema completo para investidores imobiliários.",
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
      <body className="min-h-screen" suppressHydrationWarning>
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
