import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { UserEntitlementsSchema, type UserEntitlements } from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { getServerSession } from "@/lib/serverAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { BillingStatusCard } from "./BillingStatusCard";
import { TierLimitsCard } from "./TierLimitsCard";
import { PlanSelector } from "./PlanSelector";

async function getEntitlements(): Promise<UserEntitlements | null> {
  try {
    const data = await apiFetch<UserEntitlements>("/api/v1/billing/me");
    return UserEntitlementsSchema.parse(data);
  } catch {
    return null;
  }
}

export default async function UserBillingPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const entitlements = await getEntitlements();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Assinatura</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie sua assinatura e plano
          </p>
        </div>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plano Atual</CardTitle>
          <CardDescription>
            Detalhes da sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingStatusCard entitlements={entitlements} />
        </CardContent>
      </Card>

      {/* Tier Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Limites do Plano</CardTitle>
          <CardDescription>
            Recursos disponíveis no seu plano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TierLimitsCard entitlements={entitlements} />
        </CardContent>
      </Card>

      {/* Plan Selection */}
      {entitlements && (
        <Card>
          <CardHeader>
            <CardTitle>Alterar Plano</CardTitle>
            <CardDescription>
              Escolha o plano ideal para suas necessidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanSelector
              currentTier={entitlements.billing.tier}
              hasSubscription={!!entitlements.billing.stripe_customer_id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
