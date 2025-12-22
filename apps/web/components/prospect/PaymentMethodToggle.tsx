"use client";

import { Banknote, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PaymentMethod = "cash" | "financing";

interface PaymentMethodToggleProps {
  value: PaymentMethod;
  financingDisabled?: boolean;
  financingDisabledMessage?: string;
  className?: string;
}

export function PaymentMethodToggle({
  value,
  financingDisabled = true,
  financingDisabledMessage = "Em breve",
  className,
}: PaymentMethodToggleProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={financingDisabled}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                value === "financing" && !financingDisabled
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-background text-muted-foreground",
                financingDisabled && "cursor-not-allowed opacity-50"
              )}
            >
              <CreditCard className="h-4 w-4" />
              Financiado
            </button>
          </TooltipTrigger>
          {financingDisabled && (
            <TooltipContent side="bottom">
              <p className="text-xs">{financingDisabledMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <button
        type="button"
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          value === "cash"
            ? "bg-primary text-primary-foreground"
            : "border border-input bg-background text-muted-foreground"
        )}
      >
        <Banknote className="h-4 w-4" />
        À Vista
      </button>
    </div>
  );
}
