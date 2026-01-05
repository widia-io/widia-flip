"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { type UserEntitlements } from "@widia/shared";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BillingStatusCardProps {
  entitlements: UserEntitlements | null;
}

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  trialing: { label: "Teste gratuito", variant: "secondary" },
  canceled: { label: "Cancelado", variant: "outline" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  unpaid: { label: "Nao pago", variant: "destructive" },
  incomplete: { label: "Incompleto", variant: "outline" },
  incomplete_expired: { label: "Expirado", variant: "destructive" },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function BillingStatusCard({ entitlements }: BillingStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [portalError, setPortalError] = useState<string | null>(null);

  if (!entitlements) {
    return (
      <div className="text-sm text-muted-foreground">
        Nao foi possivel carregar informacoes de faturamento.
      </div>
    );
  }

  const { billing } = entitlements;
  const tierLabel = TIER_LABELS[billing.tier] ?? billing.tier;
  const statusInfo = STATUS_LABELS[billing.status] ?? { label: billing.status, variant: "outline" as const };

  const handleOpenPortal = () => {
    setPortalError(null);
    startTransition(async () => {
      try {
        const returnUrl = `${window.location.origin}/app/billing`;

        const res = await fetch("/api/billing/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ return_url: returnUrl }),
        });

        if (!res.ok) {
          const data = await res.json();
          setPortalError(data.error?.message ?? "Erro ao abrir portal");
          return;
        }

        const data = await res.json();
        if (data.portal_url) {
          window.location.href = data.portal_url;
        }
      } catch {
        setPortalError("Erro ao abrir portal de pagamento");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Plan & Status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{tierLabel}</span>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-2 text-sm">
        {billing.trial_end && billing.status === "trialing" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Teste termina em</span>
            <span>{formatDate(billing.trial_end)}</span>
          </div>
        )}

        {billing.current_period_end && billing.status === "active" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proxima cobranca</span>
            <span>{formatDate(billing.current_period_end)}</span>
          </div>
        )}

        {billing.cancel_at_period_end && (
          <div className="flex justify-between text-amber-600 dark:text-amber-400">
            <span>Cancelamento agendado</span>
            <span>Final do periodo</span>
          </div>
        )}
      </div>

      {/* Portal Button */}
      {billing.stripe_customer_id && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPortal}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Gerenciar Pagamento
          </Button>
          {portalError && (
            <p className="mt-2 text-sm text-destructive">{portalError}</p>
          )}
        </div>
      )}

      {!billing.stripe_customer_id && billing.status === "trialing" && (
        <p className="text-sm text-muted-foreground">
          Voce esta no periodo de teste gratuito de 7 dias.
        </p>
      )}
    </div>
  );
}
