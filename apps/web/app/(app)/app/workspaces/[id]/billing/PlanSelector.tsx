"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Loader2, Check } from "lucide-react";
import { type BillingTier } from "@widia/shared";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlanSelectorProps {
  currentTier: BillingTier;
  hasSubscription: boolean;
  workspaceId: string;
  trialEnd: string | null;
  status: string;
}

interface PlanOption {
  tier: BillingTier;
  name: string;
  price: string;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    tier: "starter",
    name: "Starter",
    price: "R$ 29/mês",
    features: [
      "1 projeto",
      "50 prospects/mês",
      "5 docs/mês",
      "5 imports URL/mês",
      "100MB storage",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "R$ 97/mês",
    features: [
      "3 projetos",
      "300 prospects/mês",
      "50 docs/mês",
      "50 imports URL/mês",
      "2GB storage",
      "Flip Score v1",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    price: "R$ 297/mês",
    features: [
      "10 projetos",
      "Prospects ilimitados",
      "200 docs/mês",
      "Imports URL ilimitados",
      "20GB storage",
      "Suporte prioritário",
    ],
  },
];

const TIER_ORDER: BillingTier[] = ["starter", "pro", "growth"];

export function PlanSelector({ currentTier, hasSubscription, workspaceId, trialEnd, status }: PlanSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingTier, setPendingTier] = useState<BillingTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if trial is expired - if so, user has no active plan
  const isTrialExpired = status === "trialing" && trialEnd && new Date(trialEnd).getTime() < Date.now();

  // When trial expired, no plan is "current" - all are available
  const effectiveCurrentTier = isTrialExpired ? null : currentTier;
  const currentIndex = effectiveCurrentTier ? TIER_ORDER.indexOf(effectiveCurrentTier) : -1;

  const handleChangePlan = (tier: BillingTier) => {
    setError(null);
    setPendingTier(tier);

    startTransition(async () => {
      try {
        if (hasSubscription) {
          // Has subscription - open portal to change plan
          const returnUrl = `${window.location.origin}/app/workspaces/${workspaceId}/billing`;
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
        } else {
          // No subscription - create checkout
          const successUrl = `${window.location.origin}/app/workspaces/${workspaceId}/billing?success=checkout_success`;
          const cancelUrl = `${window.location.origin}/app/workspaces/${workspaceId}/billing?error=checkout_canceled`;

          const res = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tier,
              success_url: successUrl,
              cancel_url: cancelUrl,
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

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const planIndex = TIER_ORDER.indexOf(plan.tier);
          const isCurrent = effectiveCurrentTier === plan.tier;
          const isUpgrade = currentIndex === -1 || planIndex > currentIndex;
          const isDowngrade = currentIndex !== -1 && planIndex < currentIndex;

          return (
            <div
              key={plan.tier}
              className={`flex flex-col rounded-lg border p-4 transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
            >
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <Badge variant="default" className="text-xs">Atual</Badge>
                  )}
                </div>
                <p className="text-lg font-bold text-primary">{plan.price}</p>
              </div>

              <ul className="mb-4 flex-1 space-y-1.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  Plano atual
                </Button>
              ) : (
                <Button
                  variant={isDowngrade ? "outline" : "default"}
                  onClick={() => handleChangePlan(plan.tier)}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending && pendingTier === plan.tier ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : currentIndex === -1 ? (
                    <Check className="mr-2 h-4 w-4" />
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
        <p className="text-xs text-muted-foreground text-center">
          Mudanças de plano são processadas pelo Stripe. Upgrades são imediatos, downgrades aplicam no próximo ciclo.
        </p>
      )}
    </div>
  );
}
