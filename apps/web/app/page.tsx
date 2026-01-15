import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  MessageCircle,
  Lock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SUPPORT_WHATSAPP_URL } from "@/components/WhatsAppButton";

import { getServerSession } from "@/lib/serverAuth";
import { Button } from "@/components/ui/button";
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
import { MobileStickyBar } from "@/components/landing/MobileStickyBar";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

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
                <Zap className="h-3.5 w-3.5" />
                Feito por flippers, para flippers
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-display">
                Pare de perder{" "}
                <span className="text-primary">R$20k por flip</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                Custos ocultos, taxas esquecidas e ROI errado acabam com seu lucro.
                O meuflip calcula <strong className="text-foreground">tudo</strong> antes que você feche negócio.
              </p>
              <p className="mt-4 text-base text-muted-foreground">
                ITBI, registro, corretagem, imposto PJ, custo de obra — tudo incluído no cálculo.
                Saiba o lucro real em 30 segundos.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "ROI médio dos usuários", value: "+24%" },
                  { label: "Tempo poupado", value: "4h/sem" },
                  { label: "Análise completa", value: "em 30s" },
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
                <Button size="lg" asChild className="w-full sm:w-auto shadow-lg shadow-primary/25">
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Testar grátis por 7 dias
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
                    Calculadora grátis
                    <Calculator className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Sem cartão
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-green-600" />
                  Dados criptografados
                </span>
                <span>Leva 30 segundos</span>
              </div>
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
      <FeaturesSection />

      {/* Pricing */}
      <PricingSection isLoggedIn={isLoggedIn} />

      {/* FAQ */}
      <section className="bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-display">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Quanto tempo leva para começar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                30 segundos. Crie conta, configure suas taxas locais, e analise o primeiro imóvel.
                Não precisa instalar nada.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Funciona se eu faço 1-2 flips por ano?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Perfeito para você. Justamente quem faz poucos flips precisa acertar cada um.
                Um erro de R$20k em 2 flips = prejuízo anual.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Mas uma planilha não resolve?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Resolve… até você esquecer uma taxa ou errar uma fórmula.
                O meuflip tem todas taxas brasileiras pré-configuradas e nunca erra conta.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Funciona para iniciantes?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Interface simples, cálculos explicados passo a passo.
                Se está começando, perfeito para aprender sem queimar dinheiro.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Preciso saber programar ou usar sistemas?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Zero. Se você usa WhatsApp e email, usa o meuflip.
                Pensado para quem trabalha na rua, não no computador.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">E se eu não gostar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cancele com 1 clique. Sem fidelidade, sem multa, sem burocracia.
                Seus dados são excluídos em 30 dias se preferir.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Meus dados são seguros?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                100%. Criptografia ponta a ponta, servidores no Brasil, conformidade com LGPD.
                Seus negócios nunca são compartilhados.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <h3 className="font-medium font-display">Funciona em qualquer cidade do Brasil?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Configure ITBI, registro e taxas específicas da sua região.
                Use workspaces diferentes para cada mercado que atua.
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
              Seu próximo flip pode ser o mais lucrativo
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Com os números certos na mão, você negocia melhor e lucra mais.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button size="lg" asChild className="shadow-lg shadow-primary/25">
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Começar agora — é grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Sem cartão
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-green-600" />
                  LGPD compliant
                </span>
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pb-20 sm:pb-0">
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

      {/* Mobile Sticky CTA */}
      <MobileStickyBar isLoggedIn={isLoggedIn} />
    </div>
  );
}
