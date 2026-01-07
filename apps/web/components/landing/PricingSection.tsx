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
          {/* Starter */}
          <Card className="flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="text-xl">Starter</CardTitle>
              <CardDescription>Para quem fecha 1-2 flips/mês</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("starter", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-primary">
                Economize 15h/mês vs Excel manual
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>1 projeto</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>50 prospects/mês → ~2 deals</span>
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
              <CardDescription>Para quem fecha 3-5 flips/mês</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("pro", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-primary">
                1 flip a mais/mês = ROI de 10-30x
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>3 projetos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>300 prospects/mês → ~5 deals</span>
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
              <CardDescription>Para quem fecha 10+ flips/mês</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{formatPrice("growth", interval)}</span>
                <span className="text-muted-foreground">/mês</span>
                {interval === "yearly" && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (cobrado anualmente)
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-primary">
                Economize R$ 5k/mês vs contratar analista
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>10 projetos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Prospects ilimitados → 10+ deals</span>
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
  );
}
