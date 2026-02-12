"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  FolderKanban,
  Search,
  Sparkles,
  ArrowRightLeft,
  Check,
  Lock,
  X,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import type { OnboardingChecklist } from "@widia/shared";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { dismissOnboarding } from "@/lib/actions/userPreferences";

interface OnboardingJourneyProps {
  checklist: OnboardingChecklist;
  onDismiss?: () => void;
}

const STEPS = [
  {
    key: "created_workspace" as const,
    number: 1,
    title: "Criar projeto",
    description: "Organize seus flips",
    icon: FolderKanban,
    href: "/app/workspaces",
    cta: "Criar agora",
  },
  {
    key: "added_prospect" as const,
    number: 2,
    title: "Adicionar lead",
    description: "Cole um link ou preencha",
    icon: Search,
    href: "/app/prospects",
    cta: "Adicionar",
  },
  {
    key: "calculated_score" as const,
    number: 3,
    title: "Calcular Score",
    description: "Priorize automaticamente",
    icon: Sparkles,
    href: "/app/prospects",
    cta: "Ver leads",
  },
  {
    key: "converted_to_property" as const,
    number: 4,
    title: "Converter imovel",
    description: "Analise completa",
    icon: ArrowRightLeft,
    href: "/app/properties",
    cta: "Ver imoveis",
  },
];

const stepStyles = {
  completed: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "text-emerald-500",
    ring: "ring-emerald-500/20",
  },
  active: {
    bg: "bg-primary/10",
    border: "border-primary/50",
    icon: "text-primary",
    ring: "ring-primary/30",
  },
  locked: {
    bg: "bg-muted/30",
    border: "border-muted/50",
    icon: "text-muted-foreground/50",
    ring: "ring-transparent",
  },
};

export function OnboardingJourney({
  checklist,
  onDismiss,
}: OnboardingJourneyProps) {
  const [isDismissing, startDismiss] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    startDismiss(async () => {
      await dismissOnboarding();
      setDismissed(true);
      onDismiss?.();
    });
  };

  if (dismissed) return null;

  // Determine step states
  const getStepState = (index: number): "completed" | "active" | "locked" => {
    const step = STEPS[index];
    if (checklist[step.key]) return "completed";

    // First incomplete step is active
    const firstIncompleteIndex = STEPS.findIndex((s) => !checklist[s.key]);
    if (index === firstIncompleteIndex) return "active";

    return "locked";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Primeiros passos</h2>
          <p className="text-sm text-muted-foreground">
            Complete para desbloquear todo o potencial
          </p>
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

      {/* Horizontal cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const state = getStepState(index);
          const styles = stepStyles[state];
          const Icon = step.icon;
          const isCompleted = state === "completed";
          const isActive = state === "active";
          const isLocked = state === "locked";

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.1 }}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
                styles.bg,
                styles.border,
                isActive && "ring-2 ring-offset-2 ring-offset-background",
                styles.ring,
                !isLocked && "hover:shadow-lg"
              )}
            >
              {/* Step number badge */}
              <div
                className={cn(
                  "absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  isCompleted && "bg-emerald-500 text-white",
                  isActive && "bg-primary text-primary-foreground",
                  isLocked && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isCompleted && "bg-emerald-500/20",
                  isActive && "bg-primary/20",
                  isLocked && "bg-muted/50"
                )}
              >
                {isLocked ? (
                  <Lock className={cn("h-5 w-5", styles.icon)} />
                ) : (
                  <Icon className={cn("h-5 w-5", styles.icon)} />
                )}
              </div>

              {/* Content */}
              <div className="mt-3">
                <h3
                  className={cn(
                    "font-semibold",
                    isCompleted && "line-through opacity-60",
                    isLocked && "opacity-50"
                  )}
                >
                  {step.title}
                </h3>
                <p
                  className={cn(
                    "mt-0.5 text-xs text-muted-foreground",
                    isLocked && "opacity-50"
                  )}
                >
                  {isLocked ? "Requer passo anterior" : step.description}
                </p>
              </div>

              {/* CTA for active step */}
              {isActive && (
                <Link href={step.href} className="mt-3 block">
                  <Button size="sm" className="w-full gap-1">
                    {step.cta}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}

              {/* Completed checkmark overlay */}
              {isCompleted && (
                <div className="absolute bottom-3 right-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Connection lines (visible on lg screens) */}
      <div className="absolute top-[7.5rem] hidden h-0.5 bg-gradient-to-r from-transparent via-muted to-transparent lg:left-[12.5%] lg:right-[12.5%] lg:block" />
    </motion.div>
  );
}
