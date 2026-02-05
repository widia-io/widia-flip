"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calculator,
  Plus,
  Loader2,
  Rocket,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { createWorkspaceAction } from "@/lib/actions/workspaces";
import { usePaywall } from "@/components/PaywallModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  hasWorkspaces: boolean;
}

export function QuickActions({ hasWorkspaces }: QuickActionsProps) {
  const router = useRouter();
  const { showPaywall } = usePaywall();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await createWorkspaceAction(name.trim());

      if ("enforcement" in result && result.enforcement) {
        showPaywall(result.enforcement, undefined);
      } else if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setName("");
        router.refresh();
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10" />
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-[60px]" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-[40px]" />

      <div className="relative p-6">
        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">
              {hasWorkspaces ? "Criar novo projeto" : "Comece sua jornada"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasWorkspaces
                ? "Adicione mais um projeto"
                : "Crie seu primeiro projeto para comecar"}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Create workspace form - redesigned */}
        <form onSubmit={handleSubmit} className="mt-5">
          <div
            className={cn(
              "relative rounded-xl border-2 bg-background/80 backdrop-blur-sm transition-all duration-300",
              isFocused
                ? "border-primary shadow-lg shadow-primary/10"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Nome do projeto (ex: Flips 2025)"
              className="h-14 border-0 bg-transparent px-4 text-base focus-visible:ring-0"
              disabled={isPending}
            />

            {/* Submit button inside input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button
                type="submit"
                disabled={isPending || !name.trim()}
                className={cn(
                  "gap-2 transition-all",
                  name.trim()
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Criar</span>
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Sugestoes:</span>
            {["Flips 2025", "Zona Sul", "Parceria"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className="rounded-full bg-muted/50 px-2.5 py-1 text-xs transition-colors hover:bg-muted"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>

        {/* Divider with text */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gradient-to-r from-transparent via-background to-transparent px-4 text-xs text-muted-foreground">
              ou experimente gratis
            </span>
          </div>
        </div>

        {/* Calculator link - more visually appealing */}
        <Link href="/calculator" target="_blank" className="group block">
          <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
              <Calculator className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Calculadora de Flip</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                  Gratis
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Teste o calculo de viabilidade sem criar conta
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-emerald-600 transition-transform group-hover:translate-x-1 dark:text-emerald-400" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
