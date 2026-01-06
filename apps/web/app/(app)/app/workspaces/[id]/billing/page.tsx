import { ChevronRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  WorkspaceSchema,
  UserEntitlementsSchema,
  WorkspaceUsageResponseSchema,
  type Workspace,
  type UserEntitlements,
  type WorkspaceUsageResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { BillingStatusCard } from "./BillingStatusCard";
import { PlanSelector } from "./PlanSelector";
import { TierLimitsCard } from "./TierLimitsCard";
import { UsageCard } from "./UsageCard";

async function getWorkspace(id: string): Promise<Workspace | null> {
  try {
    const data = await apiFetch<Workspace>(`/api/v1/workspaces/${id}`);
    return WorkspaceSchema.parse(data);
  } catch {
    return null;
  }
}

async function getEntitlements(): Promise<UserEntitlements | null> {
  try {
    const data = await apiFetch<UserEntitlements>("/api/v1/billing/me");
    return UserEntitlementsSchema.parse(data);
  } catch {
    return null;
  }
}

async function getUsage(workspaceId: string): Promise<WorkspaceUsageResponse | null> {
  try {
    const data = await apiFetch<WorkspaceUsageResponse>(`/api/v1/workspaces/${workspaceId}/usage`);
    return WorkspaceUsageResponseSchema.parse(data);
  } catch {
    return null;
  }
}

export default async function WorkspaceBillingPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const success = typeof searchParams.success === "string" ? searchParams.success : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  const [workspace, entitlements, usage] = await Promise.all([
    getWorkspace(params.id),
    getEntitlements(),
    getUsage(params.id),
  ]);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/app/workspaces" className="hover:text-foreground">
          Projetos
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{workspace.name}</span>
        <ChevronRight className="h-4 w-4" />
        <span>Assinatura</span>
      </nav>

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

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === "checkout_canceled"
            ? "Checkout cancelado. Você pode tentar novamente quando quiser."
            : error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {success === "checkout_success"
            ? "Assinatura realizada com sucesso! Obrigado por assinar."
            : success}
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plano Atual</CardTitle>
          <CardDescription>
            Detalhes da sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingStatusCard
            entitlements={entitlements}
            workspaceId={params.id}
          />
        </CardContent>
      </Card>

      {/* Usage This Period */}
      <Card>
        <CardHeader>
          <CardTitle>Uso neste Ciclo</CardTitle>
          <CardDescription>
            Consumo de recursos neste projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageCard usage={usage} />
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
              workspaceId={params.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
