"use client";

import { motion } from "framer-motion";
import { Calculator, ExternalLink } from "lucide-react";
import Link from "next/link";

import { CreateWorkspaceForm } from "@/components/CreateWorkspaceForm";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  hasWorkspaces: boolean;
}

export function QuickActions({ hasWorkspaces }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-semibold">
        {hasWorkspaces ? "Acoes rapidas" : "Comece agora"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasWorkspaces
          ? "Atalhos para acoes frequentes"
          : "Crie seu primeiro projeto"}
      </p>

      <div className="mt-4">
        <CreateWorkspaceForm />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ou experimente gratuitamente
        </p>
        <Link href="/calculator" target="_blank">
          <Button variant="outline" className="w-full gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora de Flip
            <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
