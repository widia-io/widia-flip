import "./globals.css";

import type { ReactNode } from "react";

export const metadata = {
  title: "Widia Flip",
  description: "Widia Flip — MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased">
        {children}
      </body>
    </html>
  );
}


