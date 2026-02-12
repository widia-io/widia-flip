"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, FolderKanban } from "lucide-react";

interface DashboardHeaderProps {
  workspaceName: string;
}

export function DashboardHeader({ workspaceName }: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-4"
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
        <LayoutDashboard className="h-6 w-6 text-primary" />
      </div>

      {/* Text */}
      <div>
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Visao Geral
          </span>
        </h1>
        <div className="mt-0.5 flex items-center gap-2">
          <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{workspaceName}</span>
        </div>
      </div>
    </motion.div>
  );
}
