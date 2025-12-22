import "./globals.css";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "Widia Flip",
  description: "Gestão inteligente de flips imobiliários",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
