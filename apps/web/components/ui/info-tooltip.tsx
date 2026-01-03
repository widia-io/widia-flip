"use client";

import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({
  children,
  side = "top",
  className,
  iconClassName,
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors",
              className
            )}
          >
            <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
            <span className="sr-only">Mais informações</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[280px] bg-popover text-popover-foreground border shadow-md"
        >
          <div className="text-xs">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
