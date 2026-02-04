import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Acabamento que Vende — Ebook Grátis | Meu Flip",
  description:
    "Guia prático do flipper para escolher piso, bancada, revestimento e metais sem estourar orçamento e sem perder margem. Baixe grátis.",
  openGraph: {
    title: "Acabamento que Vende — Ebook Grátis",
    description:
      "Guia prático do flipper para escolher acabamento sem estourar orçamento. Baixe grátis.",
    type: "website",
  },
};

export default function EbookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      {/* Minimal header — no distractions */}
      <header className="py-5 px-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="opacity-70 hover:opacity-100 transition-opacity">
            <Logo size="full" iconSize={28} />
          </Link>
          <span className="text-xs tracking-widest uppercase text-muted-foreground/60 font-medium hidden sm:block">
            Ebook gratuito
          </span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="py-8 px-4 border-t border-black/5">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/50">
          <span>Meu Flip &copy; {new Date().getFullYear()}</span>
          <span>Conteúdo exclusivo para investidores imobiliários</span>
        </div>
      </footer>
    </div>
  );
}
