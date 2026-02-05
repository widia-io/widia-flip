"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface WelcomeHeroProps {
  userName?: string | null;
  completedSteps: number;
  totalSteps: number;
}

export function WelcomeHero({
  userName,
  completedSteps,
  totalSteps,
}: WelcomeHeroProps) {
  const firstName = userName?.split(" ")[0] || "";
  const progress = (completedSteps / totalSteps) * 100;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Background gradient + blur orbs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
      <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-accent/10 blur-[60px]" />

      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
            >
              <Sparkles className="h-3 w-3" />
              Bem-vindo ao Meu Flip
            </motion.span>

            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ola{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="mt-1 text-muted-foreground">
                Pronto para lucrar mais nos seus flips?
              </p>
            </motion.div>
          </div>

          {/* Progress Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="flex items-center gap-4"
          >
            <div className="relative h-24 w-24">
              <svg className="h-full w-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted/30"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className="text-primary"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  style={{ strokeDasharray: circumference }}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{completedSteps}</span>
                <span className="text-xs text-muted-foreground">
                  de {totalSteps}
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">Passos concluidos</p>
              <p className="text-xs text-muted-foreground">
                {completedSteps === totalSteps
                  ? "Tudo pronto!"
                  : "Continue sua jornada"}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
