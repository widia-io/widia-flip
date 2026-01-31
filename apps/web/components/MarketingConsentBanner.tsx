"use client";

import { useState, useTransition } from "react";
import { Mail, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateMarketingConsent } from "@/lib/actions/email";

interface MarketingConsentBannerProps {
  initialStatus: "pending" | "accepted" | "declined";
}

export function MarketingConsentBanner({ initialStatus }: MarketingConsentBannerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already responded or dismissed
  if (status !== "pending" || dismissed) {
    return null;
  }

  const handleAccept = () => {
    startTransition(async () => {
      try {
        await updateMarketingConsent(true);
        setStatus("accepted");
      } catch (error) {
        console.error("Failed to update consent:", error);
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await updateMarketingConsent(false);
        setStatus("declined");
      } catch (error) {
        console.error("Failed to update consent:", error);
      }
    });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-4">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Novidades do Meu Flip</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Deseja receber dicas e novidades por email?
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isPending}
              >
                {isPending ? "..." : "Aceito"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={isPending}
              >
                Não quero
              </Button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
