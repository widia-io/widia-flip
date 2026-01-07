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
  Shield,
  Zap,
  Lock,
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
                Pare de perder negócios{" "}
                <span className="text-primary">por análise lenta.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                Score 0-100 automático prioriza os melhores flips. Viabilidade
                completa em 30s. Enquanto você analisa 1 negócio no Excel, seu
                concorrente já fechou 3.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                    Começar trial grátis
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
                    Ver análise completa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                ⚡ Acesso imediato • Sem cartão • Cancele quando quiser
              </p>
            </div>

            {/* Animação */}
            <div className="hidden lg:block">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <ProblemSection />

      {/* Social Proof / Trust Badges */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div className="text-center sm:text-left">
                <div className="text-sm font-semibold">Fórmulas transparentes</div>
                <div className="text-xs text-muted-foreground">Cálculos corretos, sem caixa-preta</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <div className="text-center sm:text-left">
                <div className="text-sm font-semibold">Análise 20x mais rápida</div>
                <div className="text-xs text-muted-foreground">30s vs 4h no Excel</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <div className="text-center sm:text-left">
                <div className="text-sm font-semibold">Dados protegidos</div>
                <div className="text-xs text-muted-foreground">Criptografia ponta-a-ponta</div>
              </div>
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
              Da prospecção à venda: ferramentas inteligentes para cada etapa
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Priorize os 10% que valem a pena</CardTitle>
                <CardDescription>
                  Score 0-100 automático classifica por lucro real. Descarte os
                  ruins em 5s, foque nos promissores.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ 3x mais negócios analisados por dia
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">2 minutos, não 2 horas</CardTitle>
                <CardDescription>
                  Cole URL → dados extraídos → score calculado. Vivareal, ZAP,
                  Quintoandar suportados.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ 20+ prospects/dia vs 5 no Excel
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Saiba se vale antes de visitar</CardTitle>
                <CardDescription>
                  ROI, lucro líquido, break-even instantâneos. Todos custos
                  inclusos (ITBI, registro, PJ).
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Evite visitas que não fecham (R$ 500+ economizados/mês)
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">À vista ou financiado? Resposta em 30s</CardTitle>
                <CardDescription>
                  Compare lado a lado com taxas reais. Simule entrada, prestações,
                  saldo devedor.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Negocie com confiança, feche 2x mais rápido
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Opere em várias cidades sem confusão</CardTitle>
                <CardDescription>
                  Taxas diferentes, prospects separados, histórico independente. SP
                  capital ≠ Interior ≠ Litoral.
                  <span className="mt-2 block text-xs font-medium text-primary">
                    ↳ Expanda território sem perder controle
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Timeline realista, sem surpresas</CardTitle>
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
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-12 space-y-6">
            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Vale a pena vs minha planilha Excel?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Excel não tem Score automático, não importa URLs, não calcula
                ITBI/PJ automaticamente. Você perde 4h/prospect e não sabe se
                esqueceu algum custo. Meu Flip paga o investimento no primeiro
                flip fechado mais rápido (1 deal a mais/mês = R$ 10-30k).
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Funciona para iniciantes?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Sistema guia cada campo, explica cada cálculo. Se está
                começando, Score v0 já filtra os melhores. Se já tem experiência,
                Score v1 usa seus dados de investimento para análise completa.
                Tutorial interativo na primeira vez.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">E se eu não gostar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Trial 7 dias grátis, sem cartão. Cancele com 1 clique a qualquer
                momento. Se não fizer pelo menos 1 deal a mais no primeiro mês,
                pedimos feedback do que faltou para melhorar o sistema.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Posso usar só quando preciso?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Plano Starter (R$ 29/mês) para uso casual (1-2 deals/mês).
                Pro (trial grátis) para quem fecha 3-5 deals/mês. Growth para
                operações profissionais (10+ deals). Pause e retome quando quiser.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">O que é o Flip Score?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                É uma nota de 0 a 100 calculada automaticamente para cada prospect.
                O Score v0 usa preço/m², custos e liquidez para triagem rápida.
                O Score v1 analisa ROI, lucro líquido e margem de segurança usando
                seus dados de investimento. Priorize os melhores negócios sem análise manual.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Como funciona a importação de URLs?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cole a URL de anúncios de sites como Vivareal, Quintoandar e ZAP.
                Nosso sistema extrai automaticamente bairro, área, quartos, valor
                e outros dados. Economize tempo na prospecção manual.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Posso ter mais de um projeto?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim! Cada projeto é independente com suas taxas (ITBI, corretagem),
                prospects e histórico próprios. Starter permite 1 projeto, Pro
                permite 3 e Growth permite 10. Ideal para separar operações ou regiões.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">O que é um Snapshot?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                É uma &ldquo;foto&rdquo; versionada da análise. Quando você clica &ldquo;Salvar
                análise&rdquo;, criamos um snapshot com timestamp no histórico. Acompanhe
                como o negócio evoluiu desde a prospecção até a venda.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Como funciona o trial de 7 dias?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Trial completo do plano Pro por 7 dias sem cobrança. Teste Flip
                Score v1, financiamento, importação de URLs e múltiplos projetos.
                Cancele quando quiser sem compromisso.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="font-medium">Meus dados são seguros?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sim. Usamos criptografia de ponta e seguimos melhores práticas de
                segurança. Seus dados nunca são compartilhados com terceiros.
                Multi-tenant com isolamento completo entre projetos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Seu próximo flip lucrativo está esperando
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada dia sem Meu Flip = negócios perdidos para quem decide mais rápido
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button size="lg" asChild>
              <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                Começar trial grátis (7 dias)
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              ⚡ Acesso imediato • Sem cartão • Cancele quando quiser
            </p>
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
