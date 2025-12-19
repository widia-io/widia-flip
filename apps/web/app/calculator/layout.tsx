import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getServerSession } from "@/lib/serverAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "Calculadora de Viabilidade | Widia Flip",
  description:
    "Calcule a viabilidade do seu flip imobiliário. Descubra lucro, ROI e investimento total em segundos.",
};

export default async function CalculatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();
  const isLoggedIn = !!session;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-lg font-semibold">Widia Flip</span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button asChild>
                <Link href="/app">
                  Acessar App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link href="/login?tab=signup">Criar conta</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          Widia Flip &copy; {new Date().getFullYear()} — Calculadora de
          viabilidade para flips imobiliários
        </div>
      </footer>
    </div>
  );
}
