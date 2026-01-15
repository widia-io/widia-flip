"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Target,
  Calculator,
  TrendingUp,
  PiggyBank,
  History,
  FileText,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Priorize os 10% que valem a pena",
    description:
      "Score 0-100 automático classifica por lucro real. Descarte os ruins em 5s.",
    metric: "3x mais negócios analisados por dia",
    size: "hero",
    color: "primary",
  },
  {
    icon: Calculator,
    title: "2 minutos, não 2 horas",
    description: "Cole URL → dados extraídos → score calculado. Vivareal, ZAP, Quintoandar.",
    metric: "20+ prospects/dia vs 5 no Excel",
    size: "medium",
    color: "violet",
  },
  {
    icon: TrendingUp,
    title: "Saiba se vale antes de visitar",
    description: "ROI, lucro líquido, break-even instantâneos. Todos custos inclusos.",
    metric: "R$ 500+ economizados/mês",
    size: "medium",
    color: "emerald",
  },
  {
    icon: PiggyBank,
    title: "À vista ou financiado?",
    description: "Compare lado a lado com taxas reais. Simule entrada e prestações.",
    metric: "Feche 2x mais rápido",
    size: "small",
    color: "amber",
  },
  {
    icon: History,
    title: "Várias cidades, zero confusão",
    description: "Taxas diferentes por região, histórico independente.",
    metric: "Expanda sem perder controle",
    size: "small",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Timeline sem surpresas",
    description: "Custos versionados, snapshots de evolução.",
    metric: "Evite R$ 20k+ em custos ocultos",
    size: "small",
    color: "rose",
  },
];

const colorStyles = {
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    glow: "bg-primary/20",
    gradient: "from-primary/20 to-primary/5",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
    glow: "bg-violet-500/20",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "bg-emerald-500/20",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "bg-amber-500/20",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    glow: "bg-blue-500/20",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    glow: "bg-rose-500/20",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
};

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const heroFeature = features.find((f) => f.size === "hero")!;
  const mediumFeatures = features.filter((f) => f.size === "medium");
  const smallFeatures = features.filter((f) => f.size === "small");

  return (
    <section
      ref={ref}
      id="features"
      className="scroll-mt-16 relative overflow-hidden py-24 lg:py-32"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
      <div className="absolute left-0 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute right-0 bottom-1/3 h-[300px] w-[300px] translate-x-1/2 rounded-full bg-accent/5 blur-[80px]" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Funcionalidades
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl font-display">
            Tudo para flips{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              lucrativos
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Da prospecção à venda: ferramentas inteligentes para cada etapa
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="mt-16 grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto]">
          {/* Hero feature - spans 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative lg:col-span-2 lg:row-span-2"
          >
            {/* Glow */}
            <div className="absolute -inset-2 rounded-3xl bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative h-full overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-8 lg:p-10">
              {/* Large decorative number */}
              <span className="absolute -right-8 -top-10 font-display text-[200px] font-bold leading-none text-primary/[0.03]">
                01
              </span>

              <div className="relative">
                {/* Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                  <Target className="h-3 w-3" />
                  Principal
                </span>

                {/* Icon */}
                <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 shadow-lg shadow-primary/20">
                  <heroFeature.icon className="h-8 w-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="mt-6 text-2xl font-bold font-display lg:text-3xl">
                  {heroFeature.title}
                </h3>
                <p className="mt-3 max-w-lg text-base text-muted-foreground">
                  {heroFeature.description}
                </p>

                {/* Metric */}
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/50 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">
                    {heroFeature.metric}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Medium features */}
          {mediumFeatures.map((feature, index) => {
            const styles = colorStyles[feature.color as keyof typeof colorStyles];
            const delays = [0.2, 0.3];

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: delays[index] }}
                className="group relative"
              >
                <div className={`absolute -inset-2 ${styles.glow} rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100`} />

                <div className={`relative h-full overflow-hidden rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.gradient} p-6`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.bg}`}>
                    <feature.icon className={`h-6 w-6 ${styles.text}`} />
                  </div>

                  <h3 className="mt-4 text-lg font-bold font-display">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>

                  <div className={`mt-4 inline-flex items-center gap-1.5 text-xs font-medium ${styles.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.bg.replace('/10', '')}`} />
                    {feature.metric}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Small features - bottom row */}
          {smallFeatures.map((feature, index) => {
            const styles = colorStyles[feature.color as keyof typeof colorStyles];
            const delays = [0.4, 0.5, 0.6];

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: delays[index] }}
                className="group relative"
              >
                <div className={`absolute -inset-2 ${styles.glow} rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100`} />

                <div className={`relative h-full overflow-hidden rounded-2xl border ${styles.border} bg-background/50 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-background/70`}>
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.bg}`}>
                      <feature.icon className={`h-5 w-5 ${styles.text}`} />
                    </div>
                    <span className={`text-xs font-medium ${styles.text}`}>
                      {feature.metric}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold font-display">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
