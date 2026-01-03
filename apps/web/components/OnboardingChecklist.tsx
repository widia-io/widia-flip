"use client";

import { useState, useTransition } from "react";
import {
  FolderKanban,
  Search,
  Sparkles,
  ArrowRightLeft,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

import type { OnboardingChecklist as ChecklistType } from "@widia/shared";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dismissOnboarding } from "@/lib/actions/userPreferences";

interface OnboardingChecklistProps {
  checklist: ChecklistType;
  onDismiss?: () => void;
}

const STEPS = [
  {
    key: "created_workspace" as const,
    title: "Crie seu primeiro projeto",
    description: "Organize flips por ano, região ou parceria",
    icon: FolderKanban,
    href: "/app/workspaces",
  },
  {
    key: "added_prospect" as const,
    title: "Adicione um lead",
    description: "Cole link ou preencha manualmente",
    icon: Search,
    href: "/app/prospects",
  },
  {
    key: "calculated_score" as const,
    title: "Calcule o Flip Score",
    description: "Priorize oportunidades automaticamente",
    icon: Sparkles,
    href: "/app/prospects",
  },
  {
    key: "converted_to_property" as const,
    title: "Converta para imóvel",
    description: "Inicie análise de viabilidade completa",
    icon: ArrowRightLeft,
    href: "/app/properties",
  },
];

export function OnboardingChecklist({
  checklist,
  onDismiss,
}: OnboardingChecklistProps) {
  const [isDismissing, startDismiss] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progress = (completedCount / STEPS.length) * 100;

  const handleDismiss = () => {
    startDismiss(async () => {
      await dismissOnboarding();
      setDismissed(true);
      onDismiss?.();
    });
  };

  if (dismissed) return null;

  return (
    <Card className="relative overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Primeiros passos no Meu Flip
            </CardTitle>
            <CardDescription>
              {completedCount === STEPS.length
                ? "Parabéns! Você completou todos os passos."
                : `${completedCount} de ${STEPS.length} concluídos`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <ul className="space-y-2">
          {STEPS.map((step) => {
            const isComplete = checklist[step.key];
            const Icon = step.icon;

            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isComplete
                      ? "bg-primary/5 text-muted-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      isComplete
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isComplete && "line-through"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
