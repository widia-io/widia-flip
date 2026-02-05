"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderKanban,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Workspace } from "@widia/shared";

import { cn } from "@/lib/utils";

interface OtherWorkspacesProps {
  workspaces: Workspace[];
  currentWorkspaceId?: string;
}

const colorVariants = [
  {
    bg: "bg-violet-500/10",
    icon: "text-violet-600 dark:text-violet-400",
    hover: "hover:bg-violet-500/15 hover:border-violet-500/40",
    border: "border-violet-500/20",
  },
  {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:bg-emerald-500/15 hover:border-emerald-500/40",
    border: "border-emerald-500/20",
  },
  {
    bg: "bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    hover: "hover:bg-amber-500/15 hover:border-amber-500/40",
    border: "border-amber-500/20",
  },
  {
    bg: "bg-sky-500/10",
    icon: "text-sky-600 dark:text-sky-400",
    hover: "hover:bg-sky-500/15 hover:border-sky-500/40",
    border: "border-sky-500/20",
  },
  {
    bg: "bg-rose-500/10",
    icon: "text-rose-600 dark:text-rose-400",
    hover: "hover:bg-rose-500/15 hover:border-rose-500/40",
    border: "border-rose-500/20",
  },
];

export function OtherWorkspaces({
  workspaces,
  currentWorkspaceId,
}: OtherWorkspacesProps) {
  const otherWorkspaces = workspaces.filter((ws) => ws.id !== currentWorkspaceId);

  if (otherWorkspaces.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/30 via-background to-muted/20"
    >
      {/* Decorative elements */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-[40px]" />
      <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-accent/5 blur-[30px]" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Outros Projetos</h3>
            <p className="text-xs text-muted-foreground">
              Alterne rapidamente entre seus projetos
            </p>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {otherWorkspaces.map((ws, index) => {
            const variant = colorVariants[index % colorVariants.length];

            return (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Link
                  href={`/app/workspaces/${ws.id}/settings`}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
                    variant.border,
                    variant.hover,
                    "bg-background/50 backdrop-blur-sm"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
                      variant.bg
                    )}
                  >
                    <FolderKanban className={cn("h-5 w-5", variant.icon)} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Clique para acessar
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
