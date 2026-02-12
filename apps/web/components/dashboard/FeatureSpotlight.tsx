"use client";

import { motion } from "framer-motion";
import { Target, Calculator, TrendingUp, PiggyBank } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Priorize os 10% que valem",
    description: "Score 0-100 classifica por lucro real",
    metric: "3x mais analises/dia",
    color: "primary",
  },
  {
    icon: Calculator,
    title: "2 minutos, nao 2 horas",
    description: "Cole URL, dados extraidos automaticamente",
    metric: "20+ prospects/dia",
    color: "violet",
  },
  {
    icon: TrendingUp,
    title: "Saiba se vale antes de visitar",
    description: "ROI e lucro liquido instantaneos",
    metric: "R$500+ economizados/mes",
    color: "emerald",
  },
  {
    icon: PiggyBank,
    title: "A vista ou financiado?",
    description: "Compare lado a lado com taxas reais",
    metric: "Feche 2x mais rapido",
    color: "amber",
  },
];

const colorStyles = {
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    gradient: "from-primary/20 to-primary/5",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-500 dark:text-violet-400",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
};

export function FeatureSpotlight() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-semibold">Por que usar o Meu Flip?</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ferramentas que fazem a diferenca
      </p>

      <div className="mt-4 grid gap-3">
        {features.map((feature, index) => {
          const styles = colorStyles[feature.color as keyof typeof colorStyles];
          const Icon = feature.icon;

          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              className={`group relative overflow-hidden rounded-lg border p-3 transition-all hover:shadow-md ${styles.border} bg-gradient-to-r ${styles.gradient}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}
                >
                  <Icon className={`h-4 w-4 ${styles.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium leading-tight">
                    {feature.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${styles.bg} ${styles.text}`}
                >
                  {feature.metric}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
