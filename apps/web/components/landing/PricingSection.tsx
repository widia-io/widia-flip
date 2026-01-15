"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { type BillingInterval, TIER_PRICES } from "@widia/shared";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PricingSectionProps {
  isLoggedIn: boolean;
}

function formatPrice(tier: keyof typeof TIER_PRICES, interval: BillingInterval): string {
  const prices = TIER_PRICES[tier];
  if (interval === "yearly") {
    return `R$ ${Math.floor(prices.yearly / 12)}`;
  }
  return `R$ ${prices.monthly}`;
}

export function PricingSection({ isLoggedIn }: PricingSectionProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_0%,hsl(var(--primary)/0.08),transparent)]" />
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-display">
            Escolha o plano ideal para sua operação
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cancele quando quiser. Sem fidelidade.
          </p>
        </div>

        {/* Interval Toggle */}
        <div className="flex justify-center gap-2 mt-8">
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

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* Essencial */}
          <Card className="flex flex-col rounded-2xl border border-border/60 bg-background/70">
            <CardHeader className="flex-1">
              <CardTitle className="text-xl font-display">Essencial</CardTitle>
              <CardDescription>Pra quem saiu da planilha agora</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("starter", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>1 projeto ativo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>50 imóveis/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>30 análises/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>5 documentos/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>100 MB de armazenamento</span>
                </li>
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Começar agora
                </Link>
              </Button>
            </div>
          </Card>

          {/* Investidor */}
          <Card className="relative flex flex-col rounded-2xl border border-primary/60 bg-gradient-to-b from-primary/5 to-background/80 shadow-[0_30px_80px_-60px_hsl(var(--primary)/0.6)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Mais popular
              </span>
            </div>
            <CardHeader className="flex-1">
              <CardTitle className="text-xl font-display">Investidor</CardTitle>
              <CardDescription>Pra quem faz flip com frequência</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("pro", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>3 projetos ativos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>300 imóveis/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>200 análises/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>50 documentos/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>2 GB de armazenamento</span>
                </li>
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button className="w-full" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Começar agora
                </Link>
              </Button>
            </div>
          </Card>

          {/* Profissional */}
          <Card className="flex flex-col rounded-2xl border border-border/60 bg-background/70">
            <CardHeader className="flex-1">
              <CardTitle className="text-xl font-display">Profissional</CardTitle>
              <CardDescription>Pra quem vive de flip</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("growth", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>10 projetos ativos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>imóveis ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>análises ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>200 documentos/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>20 GB de armazenamento</span>
                </li>
              </ul>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href={isLoggedIn ? "/app" : "/login?tab=signup"}>
                  Começar agora
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
