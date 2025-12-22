"use client";

import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FormatType = "currency" | "percent" | "number" | "static" | "months";

interface MetricDisplayProps {
  label: string;
  value: string | number | null | undefined;
  format?: FormatType;
  highlight?: boolean;
  variant?: "default" | "positive" | "negative" | "muted";
  tooltip?: string;
  className?: string;
}

function formatValue(
  value: string | number | null | undefined,
  format: FormatType
): string {
  if (value == null || value === "") return "—";

  if (format === "static") return String(value);

  if (format === "months") {
    return `${value} ${Number(value) === 1 ? "mês" : "meses"}`;
  }

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";

  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(num);
  }

  if (format === "percent") {
    return `${num.toFixed(1)}%`;
  }

  return new Intl.NumberFormat("pt-BR").format(num);
}

export function MetricDisplay({
  label,
  value,
  format = "static",
  highlight,
  variant = "default",
  tooltip,
  className,
}: MetricDisplayProps) {
  const formattedValue = formatValue(value, format);
  const isEmpty = formattedValue === "—";

  return (
    <div
      className={cn(
        "rounded-md p-2",
        highlight ? "border border-border bg-secondary" : "bg-muted/50",
        className
      )}
    >
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold",
          variant === "positive" && "text-primary",
          variant === "negative" && "text-destructive",
          variant === "muted" && "text-muted-foreground",
          isEmpty && "text-muted-foreground"
        )}
      >
        {formattedValue}
      </dd>
    </div>
  );
}
