import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  TrendingUp,
  PiggyBank,
  History,
  FileText,
  Target,
  MessageCircle,
} from "lucide-react";
import { SUPPORT_WHATSAPP_URL } from "@/components/WhatsAppButton";

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
import { HeroAnimation } from "@/components/landing/HeroAnimation";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ConceptsSection } from "@/components/landing/ConceptsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ValuePropositionSection } from "@/components/landing/ValuePropositionSection";
import { AuthoritySection } from "@/components/landing/AuthoritySection";
import { AppScreenshots } from "@/components/landing/AppScreenshots";

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
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_70%_0%,hsl(var(--accent)/0.18),transparent)]" />
        <div className="absolute -left-24 top-10 -z-10 h-56 w-56 rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute -right-24 bottom-10 -z-10 h-56 w-56 rounded-full bg-accent/20 blur-[80px]" />
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Texto */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Gestão inteligente de flips
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-display">
                House flipping não é obra.{" "}
                <span className="text-primary">É número.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                Controle compra, obra, taxas e lucro real dos seus flips em um só lugar.
              </p>
              <p className="mt-4 text-base text-muted-foreground">
                Chega de planilhas quebradas, contas soltas e surpresa no final do flip.
                O meuflip te mostra se o negócio dá dinheiro antes, durante e depois.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "ROI médio", value: "+24%" },
                  { label: "Tempo poupado", value: "4h/sem" },
                  { label: "Decisão segura", value: "em 30s" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Teste o meuflip agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto"
                >
                  <Link href="/calculator">
                    Ver calculadora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Sem cartão • Cancele quando quiser
              </p>
            </div>

            {/* Animação */}
            <div className="lg:justify-self-end">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <ProblemSection />

      {/* Value Proposition */}
      <ValuePropositionSection />

      {/* App Screenshots */}
      <AppScreenshots />

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-16">
        <HowItWorks />
      </section>

      {/* Authority */}
      <AuthoritySection />

      {/* Concepts */}
      <ConceptsSection />

      {/* Features */}
      <section id="features" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl font-display">
              Tudo que você precisa para flips lucrativos
            </h2>
            <p className="mt-3 text-muted-foreground">
              Da prospecção à venda: ferramentas inteligentes para cada etapa
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="group rounded-2xl border border-border/60 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-display">
                  Priorize os 10% que valem a pena
                </CardTitle>
                <CardDescription>
                  Score 0-100 automático classifica por lucro real. Descarte os
                  ruins em 5s, foque nos promissores.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ 3x mais negócios analisados por dia
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group rounded-2xl border border-border/60 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-display">2 minutos, não 2 horas</CardTitle>
                <CardDescription>
                  Cole URL → dados extraídos → score calculado. Vivareal, ZAP,
                  Quintoandar suportados.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ 20+ prospects/dia vs 5 no Excel
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group rounded-2xl border border-border/60 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-display">
                  Saiba se vale antes de visitar
                </CardTitle>
                <CardDescription>
                  ROI, lucro líquido, break-even instantâneos. Todos custos
                  inclusos (ITBI, registro, PJ).
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Evite visitas que não fecham (R$ 500+ economizados/mês)
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group rounded-2xl border border-border/60 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-display">
                  À vista ou financiado? Resposta em 30s
                </CardTitle>
                <CardDescription>
                  Compare lado a lado com taxas reais. Simule entrada, prestações,
                  saldo devedor.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Negocie com confiança, feche 2x mais rápido
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group rounded-2xl border border-border/60 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-display">
                  Opere em várias cidades sem confusão
                </CardTitle>
                <CardDescription>
                  Taxas diferentes, prospects separados, histórico independente. SP
                  capital ≠ Interior ≠ Litoral.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Expanda território sem perder controle
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group rounded-2xl border border-border/60 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-display">
                  Timeline realista, sem surpresas
                </CardTitle>
                <CardDescription>
                  Custos de reforma, docs, timeline versionado. Snapshots mostram
                  evolução do negócio.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Margem real (evite R$ 20k+ em custos ocultos)
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection isLoggedIn={isLoggedIn} />

      {/* FAQ */}
      <section className="border-t border-border bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.08),transparent)]">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl font-display">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-12 space-y-6">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Mas uma planilha não resolve?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Resolve… até você errar uma fórmula ou perder tempo demais organizando tudo.
                Flip bom é aquele que dá lucro sem dor de cabeça.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Funciona para iniciantes?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Interface simples, cálculos explicados. Se está começando, perfeito para aprender.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">E se eu não gostar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cancele com 1 clique. Sem fidelidade, sem burocracia.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Meus dados são seguros?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Criptografia, dados nunca compartilhados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-background/70 px-6 py-12 shadow-[0_30px_80px_-60px_hsl(var(--primary)/0.6)]">
            <h2 className="text-2xl font-semibold sm:text-3xl font-display">
            Pare de trabalhar no escuro.
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Comece a gerir seus flips como um negócio.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button size="lg" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Teste o meuflip agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Sem cartão • Cancele quando quiser
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
