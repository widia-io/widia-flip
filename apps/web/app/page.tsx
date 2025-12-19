import Link from "next/link";
import { ArrowRight, Calculator, TrendingUp, PiggyBank, History } from "lucide-react";

import { getServerSession } from "@/lib/serverAuth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await getServerSession();
  const isLoggedIn = !!session;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-base font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-lg font-semibold">Widia Flip</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/calculator">Calculadora</Link>
            </Button>
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
                  <Link href="/login?tab=signup">Começar grátis</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Calcule a viabilidade do seu{" "}
              <span className="text-primary">flip imobiliário</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Descubra lucro, ROI e investimento total em segundos. 
              Gerencie suas prospecções e análises em um só lugar.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/calculator">
                  <Calculator className="mr-2 h-5 w-5" />
                  Testar Calculadora
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  {isLoggedIn ? "Acessar minha conta" : "Criar conta grátis"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="text-center">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Tudo que você precisa para analisar flips
              </h2>
              <p className="mt-3 text-muted-foreground">
                Ferramentas simples e poderosas para investidores imobiliários
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Cálculo de ROI</CardTitle>
                  <CardDescription>
                    Calcule automaticamente o retorno sobre investimento considerando 
                    ITBI, registro, corretagem e impostos.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <PiggyBank className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Análise de Financiamento</CardTitle>
                  <CardDescription>
                    Simule flips financiados com entrada, prestações e saldo devedor. 
                    Compare cenários à vista e financiado.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Histórico de Análises</CardTitle>
                  <CardDescription>
                    Salve snapshots das suas análises e acompanhe a evolução 
                    de cada negócio ao longo do tempo.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Pronto para começar?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Crie sua conta gratuitamente e comece a analisar seus flips hoje.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  {isLoggedIn ? "Acessar minha conta" : "Começar agora"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">W</span>
              </div>
              <span className="text-sm font-medium">Widia Flip</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Widia Flip. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
