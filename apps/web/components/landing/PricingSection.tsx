"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { type BillingInterval, type PaidBillingTier, TIER_PRICES } from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingSectionProps {
  isLoggedIn: boolean;
}

function formatPrice(tier: PaidBillingTier, interval: BillingInterval): string {
  const prices = TIER_PRICES[tier];
  if (interval === "yearly") {
    return `R$ ${Math.floor(prices.yearly / 12)}`;
  }
  return `R$ ${prices.monthly}`;
}

export function PricingSection({ isLoggedIn }: PricingSectionProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <section id="pricing" className="relative scroll-mt-16 border-t border-border">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_0%,hsl(var(--primary)/0.08),transparent)]" />
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-display">
            Escolha o plano ideal para sua operação
          </h2>
          <p className="mt-3 text-muted-foreground">
            Comece grátis, valide o primeiro deal e faça upgrade quando o volume pedir.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant={interval === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval("monthly")}
          >
            Mensal
          </Button>
          <Button
            variant={interval === "yearly" ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval("yearly")}
          >
            Anual
            <Badge variant="secondary" className="ml-2 text-xs">2 meses grátis</Badge>
          </Button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="flex flex-col rounded-2xl border border-border/60 bg-background/70">
            <CardHeader className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-display">Grátis</CardTitle>
                <Badge variant="outline" className="text-xs">Entrada</Badge>
              </div>
              <CardDescription>Para testar o fluxo e chegar ao primeiro valor</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "1 projeto ativo",
                  "5 prospects",
                  "1 análise salva",
                  "1 documento",
                  "5 imports URL",
                  "1 Oferta Inteligente completa",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Começar grátis
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col rounded-2xl border border-border/60 bg-background/70">
            <CardHeader className="flex-1">
              <CardTitle className="text-xl font-display">Essencial</CardTitle>
              <CardDescription>Para operar com mais volume sem complicar</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("starter", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "1 projeto ativo",
                  "50 imóveis/mês",
                  "30 análises/mês",
                  "5 documentos/mês",
                  "5 imports URL/mês",
                  "100 MB de armazenamento",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href={isLoggedIn ? "/app/billing" : "/login?tab=signup"}>
                  Assinar Essencial
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="relative flex flex-col rounded-2xl border border-primary/60 bg-gradient-to-b from-primary/5 to-background/80 shadow-[0_30px_80px_-60px_hsl(var(--primary)/0.6)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Mais popular
              </span>
            </div>
            <CardHeader className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-display">Investidor</CardTitle>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <CardDescription>Para quem faz flip com frequência</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("pro", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "3 projetos ativos",
                  "300 imóveis/mês",
                  "200 análises/mês",
                  "50 documentos/mês",
                  "50 imports URL/mês",
                  "Flip Score v1",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button className="w-full" asChild>
                <Link href={isLoggedIn ? "/app/billing" : "/login?tab=signup"}>
                  Assinar Investidor
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col rounded-2xl border border-border/60 bg-background/70">
            <CardHeader className="flex-1">
              <CardTitle className="text-xl font-display">Profissional</CardTitle>
              <CardDescription>Para operação recorrente e escala</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("growth", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "10 projetos ativos",
                  "Imóveis ilimitados",
                  "Análises ilimitadas",
                  "200 documentos/mês",
                  "Imports URL ilimitados",
                  "20 GB de armazenamento",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href={isLoggedIn ? "/app/billing" : "/login?tab=signup"}>
                  Assinar Profissional
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
