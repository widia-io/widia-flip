"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send, Clock, CheckCircle2, Loader2 } from "lucide-react";

import { queueCampaign, sendCampaignBatch } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";

interface CampaignActionsProps {
  campaignId: string;
  status: string;
  eligibleCount: number;
}

export function CampaignActions({ campaignId, status, eligibleCount }: CampaignActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sendProgress, setSendProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  const handleQueue = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await queueCampaign(campaignId);
        router.refresh();
        alert(`Campanha enfileirada para ${result.recipientCount} destinatarios`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enfileirar campanha");
      }
    });
  };

  const handleSend = () => {
    setError(null);
    setSendProgress({ sent: 0, failed: 0, total: 0 });

    startTransition(async () => {
      try {
        let totalSent = 0;
        let totalFailed = 0;
        let batchStatus = "sending";

        // Process batches until complete
        while (batchStatus === "sending") {
          const result = await sendCampaignBatch(campaignId);
          totalSent += result.sent;
          totalFailed += result.failed;
          batchStatus = result.status;

          setSendProgress({
            sent: totalSent,
            failed: totalFailed,
            total: totalSent + totalFailed,
          });

          // Small delay between batches
          if (batchStatus === "sending") {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar campanha");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {status === "draft" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ao enfileirar, a campanha sera preparada para envio para{" "}
            <strong>{eligibleCount}</strong> usuarios elegiveis.
          </p>
          <Button
            onClick={handleQueue}
            disabled={isPending || eligibleCount === 0}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enfileirando...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Enfileirar campanha
              </>
            )}
          </Button>
          {eligibleCount === 0 && (
            <p className="text-xs text-amber-600">
              Nenhum usuario elegivel para receber esta campanha.
            </p>
          )}
        </div>
      )}

      {(status === "queued" || status === "sending") && (
        <div className="space-y-3">
          {sendProgress && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p>
                Enviados: <strong>{sendProgress.sent}</strong>
              </p>
              {sendProgress.failed > 0 && (
                <p className="text-destructive">
                  Falhas: <strong>{sendProgress.failed}</strong>
                </p>
              )}
            </div>
          )}
          <Button
            onClick={handleSend}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {status === "sending" ? "Continuar envio" : "Iniciar envio"}
              </>
            )}
          </Button>
        </div>
      )}

      {status === "sent" && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Campanha enviada</span>
        </div>
      )}
    </div>
  );
}
