import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  TrendingUp,
  PiggyBank,
  History,
  FileText,
  Target,
  Check,
  ChevronDown,
  Star,
  Users,
  Building2,
} from "lucide-react";

import { getServerSession } from "@/lib/serverAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function HomePage() {
  const session = await getServerSession();
  const isLoggedIn = !!session;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-base font-bold text-primary-foreground">
                W
              </span>
            </div>
            <span className="text-lg font-semibold">Widia Flip</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/calculator">Calculadora</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#pricing">Planos</a>
            </Button>
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
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link href="/login?tab=signup">Testar 7 dias grátis</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center lg:py-28">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Pare de perder dinheiro em{" "}
              <span className="text-primary">flips mal calculados</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Analise viabilidade, calcule ROI real e gerencie suas operações
              imobiliárias em um só lugar. Usado por +500 investidores.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Testar 7 dias grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto"
              >
                <a href="#features">
                  Ver como funciona
                  <ChevronDown className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">+500</span>
              <span className="text-muted-foreground">flippers ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">R$120M+</span>
              <span className="text-muted-foreground">em imóveis analisados</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-lg font-semibold">4.9/5</span>
              <span className="text-muted-foreground">satisfação</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Tudo que você precisa para flips lucrativos
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ferramentas simples e poderosas para investidores imobiliários
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Flip Score Inteligente</CardTitle>
                <CardDescription>
                  Nota de 0-100 que indica o potencial do negócio. Identifique
                  oportunidades de alto retorno em segundos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Viabilidade em Segundos</CardTitle>
                <CardDescription>
                  ROI, lucro líquido e break-even calculados automaticamente.
                  Inclui ITBI, registro, corretagem e impostos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">
                  Simulador de Financiamento
                </CardTitle>
                <CardDescription>
                  Compare cenários à vista vs financiado. Simule entrada,
                  prestações e saldo devedor com precisão.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Gestão de Prospecção</CardTitle>
                <CardDescription>
                  Organize seus leads com status e filtros inteligentes. Nunca
                  perca uma oportunidade por falta de organização.
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
                  Snapshots versionados para acompanhar a evolução de cada
                  negócio ao longo do tempo.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Documentos Centralizados</CardTitle>
                <CardDescription>
                  Anexe contratos, fotos e laudos por imóvel. Tudo organizado e
                  acessível em um só lugar.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Escolha o plano ideal para sua operação
            </h2>
            <p className="mt-3 text-muted-foreground">
              Todos os planos incluem 7 dias grátis. Cancele quando quiser.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {/* Starter */}
            <Card className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl">Starter</CardTitle>
                <CardDescription>Para começar</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 29</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>1 projeto</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>50 prospects/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>30 snapshots/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Viabilidade cash</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Flip Score básico</span>
                  </li>
                </ul>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Começar trial
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Pro */}
            <Card className="relative flex flex-col border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Mais popular
                </span>
              </div>
              <CardHeader className="flex-1">
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>Para crescer</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 97</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>3 projetos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>300 prospects/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>200 snapshots/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Financiamento completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Flip Score v1</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Custos e documentos</span>
                  </li>
                </ul>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button className="w-full" asChild>
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Começar trial
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Growth */}
            <Card className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl">Growth</CardTitle>
                <CardDescription>Para escalar</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 297</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>10 projetos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Prospects ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Snapshots ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Import via URL</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Suporte prioritário</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Tudo do Pro</span>
                  </li>
                </ul>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Começar trial
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-12 space-y-6">
            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Como funciona o trial de 7 dias?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Você tem acesso completo ao plano escolhido por 7 dias sem
                cobrança. Se não cancelar antes do término, a assinatura é
                ativada automaticamente.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Posso trocar de plano depois?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O
                valor é ajustado proporcionalmente no próximo ciclo de cobrança.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Meus dados são seguros?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Absolutamente. Utilizamos criptografia de ponta e seguimos as
                melhores práticas de segurança. Seus dados nunca são
                compartilhados com terceiros.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">O que acontece se eu cancelar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Você continua com acesso até o fim do período pago. Após isso,
                sua conta permanece ativa mas com funcionalidades limitadas.
                Seus dados são mantidos por 90 dias.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Preciso de cartão para testar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim, pedimos um cartão para iniciar o trial, mas você não será
                cobrado durante os 7 dias. Cancele a qualquer momento antes do
                término sem custos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Pronto para fazer flips mais lucrativos?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sem compromisso. Cancele a qualquer momento.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                Começar meu trial grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">
                  W
                </span>
              </div>
              <span className="text-sm font-medium">Widia Flip</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/calculator" className="hover:text-foreground">
                Calculadora
              </Link>
              <a href="#pricing" className="hover:text-foreground">
                Planos
              </a>
              <a href="#features" className="hover:text-foreground">
                Recursos
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Widia Flip
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
