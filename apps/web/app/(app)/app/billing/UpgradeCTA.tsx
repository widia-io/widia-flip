"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { type BillingTier } from "@widia/shared";

import { Button } from "@/components/ui/button";

interface UpgradeCTAProps {
  currentTier: BillingTier;
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
    price: "R$ 29/mes",
    features: [
      "1 projeto",
      "50 prospects/mes",
      "Viabilidade cash",
      "Flip Score basico",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "R$ 97/mes",
    features: [
      "3 projetos",
      "300 prospects/mes",
      "Financiamento completo",
      "Flip Score v1",
      "Custos e documentos",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    price: "R$ 297/mes",
    features: [
      "10 projetos",
      "Prospects ilimitados",
      "Snapshots ilimitados",
      "Import via URL",
      "Suporte prioritario",
    ],
  },
];

export function UpgradeCTA({ currentTier }: UpgradeCTAProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingTier, setPendingTier] = useState<BillingTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availablePlans = PLANS.filter((plan) => {
    const tierOrder: BillingTier[] = ["starter", "pro", "growth"];
    const currentIndex = tierOrder.indexOf(currentTier);
    const planIndex = tierOrder.indexOf(plan.tier);
    return planIndex > currentIndex;
  });

  const handleUpgrade = (tier: BillingTier) => {
    setError(null);
    setPendingTier(tier);

    startTransition(async () => {
      try {
        const successUrl = `${window.location.origin}/app/billing?success=checkout_success`;
        const cancelUrl = `${window.location.origin}/app/billing?error=checkout_canceled`;

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
      } catch {
        setError("Erro ao iniciar checkout");
        setPendingTier(null);
      }
    });
  };

  if (availablePlans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Voce ja esta no plano maximo disponivel.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {availablePlans.map((plan) => (
          <div
            key={plan.tier}
            className="flex flex-col rounded-lg border p-4 transition-colors hover:border-primary/50"
          >
            <div className="mb-3">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-lg font-bold text-primary">{plan.price}</p>
            </div>

            <ul className="mb-4 flex-1 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleUpgrade(plan.tier)}
              disabled={isPending}
              className="w-full"
            >
              {isPending && pendingTier === plan.tier ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Assinar {plan.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
