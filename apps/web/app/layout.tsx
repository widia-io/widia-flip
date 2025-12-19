import "./globals.css";

import type { ReactNode } from "react";

export const metadata = {
  title: "Widia Flip",
  description: "Gestão inteligente de flips imobiliários",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}


