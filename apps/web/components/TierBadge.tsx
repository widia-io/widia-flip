"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { type UserEntitlements } from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TierBadgeProps {
  entitlements: UserEntitlements | null;
}

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
};

export function TierBadge({ entitlements }: TierBadgeProps) {
  if (!entitlements) return null;

  const { billing } = entitlements;
  const tier = TIER_LABELS[billing.tier] ?? billing.tier;
  const status = billing.status;

  // Calculate days left for trial
  const daysLeft = billing.trial_end
    ? Math.ceil((new Date(billing.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determine variant and content
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let content = tier;
  let tooltipText = "Clique para gerenciar seu plano";

  if (status === "trialing") {
    variant = "secondary";
    content = `${tier} Trial`;
    if (daysLeft > 0) {
      content += ` \u2022 ${daysLeft}d`;
      tooltipText = `Seu per\u00edodo de teste termina em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`;
    }
  } else if (status === "past_due" || status === "unpaid") {
    variant = "destructive";
    tooltipText = "Pagamento pendente - atualize sua forma de pagamento";
  } else if (status === "canceled") {
    variant = "outline";
    tooltipText = "Assinatura cancelada";
  }

  const showWarning = status === "past_due" || status === "unpaid";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/app/billing">
            <Badge
              variant={variant}
              className="cursor-pointer gap-1 whitespace-nowrap"
            >
              {content}
              {showWarning && <AlertTriangle className="h-3 w-3" />}
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
