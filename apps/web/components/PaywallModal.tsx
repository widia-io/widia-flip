"use client";

import { useState, useTransition, createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2, CreditCard, X } from "lucide-react";
import { type EnforcementErrorResponse, type BillingTier, TIER_LIMITS } from "@widia/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// M12 - Paywall Modal
// Displays when enforcement errors block an action
// Shows: tier, usage, limits, period, CTAs to upgrade or manage payment

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  enforcementError: EnforcementErrorResponse | null;
  workspaceId?: string;
}

const TIER_LABELS: Record<BillingTier, string> = {
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
};

const METRIC_LABELS: Record<string, string> = {
  workspaces: "Projetos",
  prospects: "Prospects",
  snapshots: "Análises Salvas",
  documents: "Documentos",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PaywallModal({
  open,
  onClose,
  enforcementError,
  workspaceId,
}: PaywallModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [portalError, setPortalError] = useState<string | null>(null);

  if (!enforcementError) return null;

  const { error } = enforcementError;
  const { code, message, details } = error;
  const isPaywallRequired = code === "PAYWALL_REQUIRED";
  const isLimitExceeded = code === "LIMIT_EXCEEDED";

  const tierLabel = TIER_LABELS[details.tier as BillingTier] ?? details.tier;
  const metricLabel = details.metric ? METRIC_LABELS[details.metric] ?? details.metric : "";

  const handleUpgrade = () => {
    if (workspaceId) {
      router.push(`/app/workspaces/${workspaceId}/billing`);
      onClose();
    }
  };

  const handleOpenPortal = () => {
    if (!workspaceId) return;

    setPortalError(null);
    startTransition(async () => {
      try {
        const returnUrl = `${window.location.href}`;

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

  const getNextTier = (currentTier: BillingTier): BillingTier | null => {
    if (currentTier === "starter") return "pro";
    if (currentTier === "pro") return "growth";
    return null;
  };

  const nextTier = getNextTier(details.tier as BillingTier);
  const nextTierLimits = nextTier ? TIER_LIMITS[nextTier] : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-xl">
            {isPaywallRequired ? "Pagamento Necessário" : "Limite Atingido"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plano atual</span>
              <span className="font-medium">{tierLabel}</span>
            </div>

            {isPaywallRequired && details.billing_status && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-destructive">
                  {details.billing_status === "past_due"
                    ? "Pagamento pendente"
                    : details.billing_status === "unpaid"
                      ? "Não pago"
                      : details.billing_status}
                </span>
              </div>
            )}

            {isLimitExceeded && details.metric && (
              <>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metricLabel}</span>
                  <span className="font-medium">
                    {details.usage !== undefined && details.limit !== undefined
                      ? `${details.usage} / ${details.limit}`
                      : details.workspaces_used !== undefined && details.workspace_limit !== undefined
                        ? `${details.workspaces_used} / ${details.workspace_limit}`
                        : "-"}
                  </span>
                </div>

                {details.period_start && details.period_end && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ciclo</span>
                    <span className="font-medium">
                      {formatDate(details.period_start)} - {formatDate(details.period_end)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upgrade Suggestion */}
          {isLimitExceeded && nextTier && nextTierLimits && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">
                Faça upgrade para {TIER_LABELS[nextTier]}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {details.metric === "workspaces" && (
                  <>Até {nextTierLimits.max_workspaces} projetos</>
                )}
                {details.metric === "prospects" && (
                  <>Até {nextTierLimits.max_prospects_per_month} prospects/mês</>
                )}
                {details.metric === "snapshots" && (
                  <>Até {nextTierLimits.max_snapshots_per_month} análises/mês</>
                )}
                {details.metric === "documents" && (
                  <>Até {nextTierLimits.max_docs_per_month} documentos/mês</>
                )}
              </p>
            </div>
          )}

          {/* Portal Error */}
          {portalError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {portalError}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Fechar
          </Button>

          {isPaywallRequired && (
            <Button onClick={handleOpenPortal} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Gerenciar Pagamento
            </Button>
          )}

          {isLimitExceeded && workspaceId && (
            <Button onClick={handleUpgrade} disabled={isPending}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Context for global paywall state
interface PaywallContextValue {
  showPaywall: (error: EnforcementErrorResponse, workspaceId?: string) => void;
  hidePaywall: () => void;
}

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function usePaywall() {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error("usePaywall must be used within PaywallProvider");
  }
  return context;
}

interface PaywallProviderProps {
  children: React.ReactNode;
}

export function PaywallProvider({ children }: PaywallProviderProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<EnforcementErrorResponse | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  const showPaywall = useCallback((err: EnforcementErrorResponse, wsId?: string) => {
    setError(err);
    setWorkspaceId(wsId);
    setOpen(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setOpen(false);
    // Delay clearing error to allow animation
    setTimeout(() => {
      setError(null);
      setWorkspaceId(undefined);
    }, 200);
  }, []);

  return (
    <PaywallContext.Provider value={{ showPaywall, hidePaywall }}>
      {children}
      <PaywallModal
        open={open}
        onClose={hidePaywall}
        enforcementError={error}
        workspaceId={workspaceId}
      />
    </PaywallContext.Provider>
  );
}
