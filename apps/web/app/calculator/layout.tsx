import type { ReactNode } from "react";
import Link from "next/link";

import { getServerSession } from "@/lib/serverAuth";

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
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-neutral-100">
            Widia Flip
          </Link>
          <nav className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/app"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Acessar App
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-neutral-500">
          Widia Flip &copy; {new Date().getFullYear()} — Calculadora de
          viabilidade para flips imobiliários
        </div>
      </footer>
    </div>
  );
}
