"use client";

import { useTransition, useState } from "react";
import { Check, X, Loader2, Mail } from "lucide-react";

import { updateMarketingConsent } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";

interface EmailPreferencesCardProps {
  initialStatus: "pending" | "accepted" | "declined";
}

export function EmailPreferencesCard({ initialStatus }: EmailPreferencesCardProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);

  const isSubscribed = status === "accepted";

  function handleToggle() {
    const newAccepted = !isSubscribed;

    // Optimistic update
    setStatus(newAccepted ? "accepted" : "declined");

    startTransition(async () => {
      try {
        await updateMarketingConsent(newAccepted);
      } catch {
        // Revert on error
        setStatus(status);
      }
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          isSubscribed ? "bg-green-500/10" : "bg-muted"
        }`}>
          <Mail className={`h-5 w-5 ${isSubscribed ? "text-green-500" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="font-medium">Emails de marketing</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {isSubscribed ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>Inscrito</span>
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Não inscrito</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          "Cancelar inscrição"
        ) : (
          "Receber emails"
        )}
      </Button>
    </div>
  );
}
