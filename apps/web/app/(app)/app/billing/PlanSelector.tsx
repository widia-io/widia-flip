"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Loader2, Check, Tag, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { type ActiveBanner, type BillingInterval, type BillingTier, type PaidBillingTier, TIER_PRICES } from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlanSelectorProps {
  currentTier: BillingTier;
  hasSubscription: boolean;
}

interface PlanOption {
  tier: BillingTier;
  name: string;
  description: string;
  features: string[];
  paidTier?: PaidBillingTier;
  highlight?: string;
}

const PLANS: PlanOption[] = [
  {
    tier: "free",
    name: "Grátis",
    description: "Entrada leve para chegar ao primeiro valor",
    features: [
      "1 projeto",
      "5 prospects",
      "1 análise salva",
      "1 documento",
      "5 imports URL",
      "1 Oferta Inteligente completa",
    ],
  },
  {
    tier: "starter",
    name: "Essencial",
    description: "Para operar com mais volume sem sair do simples",
    features: [
      "1 projeto",
      "50 prospects/mês",
      "5 docs/mês",
      "5 imports URL/mês",
      "100MB storage",
    ],
    paidTier: "starter",
  },
  {
    tier: "pro",
    name: "Investidor",
    description: "Para quem faz flip com frequência",
    features: [
      "3 projetos",
      "300 prospects/mês",
      "50 docs/mês",
      "50 imports URL/mês",
      "2GB storage",
      "Flip Score v1",
    ],
    paidTier: "pro",
    highlight: "Mais popular",
  },
  {
    tier: "growth",
    name: "Profissional",
    description: "Para operação recorrente e carteira maior",
    features: [
      "10 projetos",
      "Prospects ilimitados",
      "200 docs/mês",
      "Imports URL ilimitados",
      "20GB storage",
      "Suporte prioritário",
    ],
    paidTier: "growth",
  },
];

function formatPrice(tier: PaidBillingTier, interval: BillingInterval): string {
  const prices = TIER_PRICES[tier];
  if (interval === "yearly") {
    const monthlyEquiv = Math.floor(prices.yearly / 12);
    return `R$ ${monthlyEquiv}`;
  }
  return `R$ ${prices.monthly}`;
}

const TIER_ORDER: BillingTier[] = ["free", "starter", "pro", "growth"];

export function PlanSelector({ currentTier, hasSubscription }: PlanSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingTier, setPendingTier] = useState<PaidBillingTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [voucherCode, setVoucherCode] = useState("");
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [activeBanner, setActiveBanner] = useState<ActiveBanner | null>(null);

  const effectiveCurrentTier = currentTier === "free" ? "free" : hasSubscription ? currentTier : null;
  const currentIndex = effectiveCurrentTier ? TIER_ORDER.indexOf(effectiveCurrentTier) : -1;

  useEffect(() => {
    async function fetchBanner() {
      try {
        const res = await fetch("/api/promotions/active-banner");
        if (res.ok) {
          const data = await res.json();
          setActiveBanner(data.banner);
        }
      } catch {
        // Ignore banner failures on pricing UI.
      }
    }
    fetchBanner();
  }, []);

  const hasAutoDiscount = activeBanner?.stripeCouponId != null;

  const handleChangePlan = (tier: PaidBillingTier) => {
    setError(null);
    setPendingTier(tier);

    startTransition(async () => {
      try {
        if (hasSubscription) {
          const returnUrl = `${window.location.origin}/app/billing`;
          const res = await fetch("/api/billing/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ return_url: returnUrl }),
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.error?.message ?? "Erro ao abrir portal");
            setPendingTier(null);
            return;
          }

          const data = await res.json();
          if (data.portal_url) {
            window.location.href = data.portal_url;
          }
          return;
        }

        const successUrl = `${window.location.origin}/app/billing?success=checkout_success`;
        const cancelUrl = `${window.location.origin}/app/billing?error=checkout_canceled`;

        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            interval,
            success_url: successUrl,
            cancel_url: cancelUrl,
            voucher_code: voucherCode.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error?.message ?? "Erro ao iniciar checkout");
          setPendingTier(null);
          return;
        }

        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        }
      } catch {
        setError("Erro ao processar solicitação");
        setPendingTier(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-2">
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

      {hasAutoDiscount && !hasSubscription && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Tag className="h-4 w-4" />
          <span>Desconto aplicado automaticamente no checkout!</span>
        </div>
      )}

      {!hasSubscription && !hasAutoDiscount && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowVoucherInput(!showVoucherInput)}
            className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Tag className="h-3.5 w-3.5" />
            Tem um cupom de desconto?
            {showVoucherInput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showVoucherInput && (
            <div className="mx-auto flex max-w-xs gap-2">
              <Input
                placeholder="Digite o código"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="text-center uppercase"
              />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const planIndex = TIER_ORDER.indexOf(plan.tier);
          const isCurrent = effectiveCurrentTier === plan.tier;
          const isUpgrade = currentIndex === -1 || planIndex > currentIndex;
          const isDowngrade = currentIndex !== -1 && planIndex < currentIndex;
          const isFreePlan = plan.paidTier == null;

          return (
            <div
              key={plan.tier}
              className={`flex flex-col rounded-lg border p-4 transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : plan.highlight
                    ? "border-primary/60 bg-primary/5"
                    : "hover:border-primary/50"
              }`}
            >
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {plan.highlight && (
                    <Badge variant="default" className="text-xs">{plan.highlight}</Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">Atual</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-3 text-lg font-bold text-primary">
                  {isFreePlan ? "Grátis" : `${formatPrice(plan.paidTier!, interval)}/mês`}
                  {!isFreePlan && interval === "yearly" && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (cobrado anualmente)
                    </span>
                  )}
                </p>
              </div>

              <ul className="mb-4 flex-1 space-y-1.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  Plano atual
                </Button>
              ) : isFreePlan ? (
                <Button variant="outline" disabled className="w-full">
                  Disponível por padrão
                </Button>
              ) : (
                <Button
                  variant={isDowngrade ? "outline" : "default"}
                  onClick={() => handleChangePlan(plan.paidTier!)}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending && pendingTier === plan.paidTier! ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : currentIndex === -1 ? (
                    <Sparkles className="mr-2 h-4 w-4" />
                  ) : isUpgrade ? (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  ) : (
                    <ArrowDown className="mr-2 h-4 w-4" />
                  )}
                  {currentIndex === -1 ? "Assinar" : isUpgrade ? "Upgrade" : "Downgrade"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {hasSubscription && (
        <p className="text-center text-xs text-muted-foreground">
          Mudanças de plano são processadas pelo Stripe. Upgrades são imediatos e downgrades aplicam no próximo ciclo.
        </p>
      )}
    </div>
  );
}
