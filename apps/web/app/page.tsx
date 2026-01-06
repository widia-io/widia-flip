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
  MessageCircle,
} from "lucide-react";
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_URL } from "@/components/WhatsAppButton";

import { getServerSession } from "@/lib/serverAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MeuFlipLogo } from "@/components/MeuFlipLogo";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import { HeroAnimation } from "@/components/landing/HeroAnimation";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ConceptsSection } from "@/components/landing/ConceptsSection";

export default async function HomePage() {
  const session = await getServerSession();
  const isLoggedIn = !!session;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <MeuFlipLogo size={36} />
            <span className="text-lg font-bold">Meu Flip</span>
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
                  <Link href="/login?tab=signup">Testar grátis</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Texto */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Analise flips em 30 segundos.{" "}
                <span className="text-primary">Lucre com mais certeza.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                De prospect a venda: Flip Score, viabilidade cash/financiada,
                custos e documentos. Tudo num só sistema.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
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
                  <a href="#how-it-works">
                    Ver como funciona
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Animação */}
            <div className="hidden lg:block">
              <HeroAnimation />
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
              <span className="text-lg font-semibold">
                <AnimatedCounter end={500} prefix="+" />
              </span>
              <span className="text-muted-foreground">investidores</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">
                <AnimatedCounter end={120} prefix="R$" suffix="M+" />
              </span>
              <span className="text-muted-foreground">analisados</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-lg font-semibold">4.9/5</span>
              <span className="text-muted-foreground">satisfação</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-16">
        <HowItWorks />
      </section>

      {/* Concepts */}
      <ConceptsSection />

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
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Nota de Potencial</CardTitle>
                <CardDescription>
                  Saiba em segundos se vale a pena. Score de 0-100 que identifica
                  oportunidades de alto retorno automaticamente.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Calculadora Completa</CardTitle>
                <CardDescription>
                  ROI, lucro líquido e break-even com 1 clique. Inclui ITBI,
                  registro, corretagem e impostos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Compare Cenários</CardTitle>
                <CardDescription>
                  À vista vs financiado lado a lado. Simule entrada, prestações
                  e saldo devedor com precisão.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Pipeline de Leads</CardTitle>
                <CardDescription>
                  Nunca perca uma oportunidade. Organize seus leads com status e
                  filtros inteligentes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Histórico Completo</CardTitle>
                <CardDescription>
                  Snapshots marcam a evolução do negócio. Acompanhe cada análise
                  ao longo do tempo.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Docs Organizados</CardTitle>
                <CardDescription>
                  Contratos, fotos e laudos por imóvel. Tudo organizado e
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
              Comece com 7 dias grátis no plano Pro. Cancele quando quiser.
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
                    <span>5 docs/mês • 100MB storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>5 importações URL/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Viabilidade cash</span>
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
                  Trial grátis
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
                    <span>50 docs/mês • 2GB storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>50 importações URL/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Financiamento + Flip Score v1</span>
                  </li>
                </ul>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button className="w-full" asChild>
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Começar trial grátis
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
                    <span>200 docs/mês • 20GB storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Importações URL ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Tudo do Pro + Suporte prioritário</span>
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
              <h3 className="font-medium">O que é o Flip Score?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                É uma nota de 0 a 100 que indica o potencial do negócio. O Score v0
                usa critérios como preço/m², custos de carregamento e liquidez para
                triagem rápida. O Score v1 adiciona análise econômica completa: ROI,
                lucro líquido e margem de segurança.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">O que é um Snapshot?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                É uma &ldquo;foto&rdquo; da sua análise em um momento específico. Quando você
                clica em &ldquo;Salvar análise&rdquo;, criamos um snapshot versionado que fica
                no histórico. Assim você acompanha como o negócio evoluiu ao longo
                do tempo.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Posso ter mais de um projeto?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim! Cada projeto (workspace) é independente, com suas próprias
                configurações de taxas, prospects e histórico. O plano Starter
                permite 1 projeto, Pro permite 3 e Growth permite até 10.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Como funciona o trial de 7 dias?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Você começa com acesso completo ao plano Pro por 7 dias sem
                cobrança. Assim você testa todos os recursos avançados como
                financiamento, Flip Score v1 e importação de URLs.
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
      </section>      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <MeuFlipLogo size={28} />
              <span className="text-sm font-medium">Meu Flip</span>
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
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                Suporte
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Meu Flip
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
