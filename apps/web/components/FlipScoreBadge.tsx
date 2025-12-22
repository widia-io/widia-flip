"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FlipScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 70) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

function getScoreLabel(score: number | null | undefined): string {
  if (score == null) return "Sem score";
  if (score >= 70) return "Bom";
  if (score >= 40) return "Regular";
  return "Ruim";
}

export function FlipScoreBadge({
  score,
  size = "md",
  showLabel = false,
  className,
}: FlipScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  const sizeClasses = {
    sm: showLabel ? "h-5 px-2 text-xs" : "h-5 min-w-[28px] px-1.5 text-xs",
    md: showLabel ? "h-6 px-2.5 text-sm" : "h-6 min-w-[32px] px-2 text-sm",
  };

  const displayText = score != null
    ? showLabel ? `${score} ${label}` : score
    : "—";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-full font-semibold cursor-default whitespace-nowrap",
              colorClass,
              sizeClasses[size],
              className
            )}
          >
            {displayText}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-left">
          <div className="space-y-1">
            <p className="font-semibold">Flip Score (0–100)</p>
            <p className="text-xs text-muted-foreground">
              Prioriza oportunidades no seu workspace. Baseado em preço/m², custos, liquidez, riscos e completude dos dados.
            </p>
            <p className="text-xs text-muted-foreground/80">
              ≥70 Bom • 40–69 Regular • &lt;40 Ruim
            </p>
            {score == null && (
              <p className="text-xs font-medium text-primary">
                Clique para calcular
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
