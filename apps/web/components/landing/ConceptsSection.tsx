"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Briefcase, Target, Gauge, Camera, Layers, ArrowRight } from "lucide-react";

const concepts = [
  {
    icon: Briefcase,
    title: "Projeto",
    highlight: "Organize operações separadas.",
    description:
      "Múltiplos projetos independentes. Cada um com suas taxas (ITBI, corretagem, impostos), prospects e histórico próprio.",
    color: "blue",
    featured: true,
  },
  {
    icon: Target,
    title: "Prospect",
    highlight: "Leads em triagem.",
    description:
      "Importe URLs ou use Quick Add. Flip Score calcula potencial automaticamente.",
    color: "violet",
    featured: false,
  },
  {
    icon: Gauge,
    title: "Flip Score",
    highlight: "0-100 calculado automaticamente.",
    description:
      "Triagem por preço/m², custos e liquidez. Priorize sem análise manual.",
    color: "emerald",
    featured: false,
  },
  {
    icon: Camera,
    title: "Snapshot",
    highlight: "Histórico versionado.",
    description:
      "Salve 'fotos' da análise. Acompanhe evolução desde a prospecção até venda.",
    color: "amber",
    featured: false,
  },
];

const colorStyles = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    glow: "bg-blue-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
    glow: "bg-violet-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "bg-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "bg-amber-500/20",
  },
};

export function ConceptsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const featuredConcept = concepts.find((c) => c.featured)!;
  const secondaryConcepts = concepts.filter((c) => !c.featured);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[hsl(222,47%,5%)] py-24 lg:py-32"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Layers className="h-3.5 w-3.5" />
            Sistema
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl font-display">
            Entenda o sistema
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">
            Conceitos simples para organizar suas operações de flip
          </p>
        </motion.div>

        {/* System map layout */}
        <div className="mt-20">
          {/* Featured concept - Hero card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mx-auto max-w-2xl"
          >
            {/* Glow effect */}
            <div className="absolute -inset-4 rounded-[32px] bg-blue-500/20 blur-3xl" />

            <div className={`relative overflow-hidden rounded-3xl border ${colorStyles[featuredConcept.color as keyof typeof colorStyles].border} bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-8 lg:p-10`}>
              {/* Large number watermark */}
              <span className="absolute -right-6 -top-10 font-display text-[180px] font-bold leading-none text-white/[0.02]">
                01
              </span>

              <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
                {/* Icon */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 shadow-lg shadow-blue-500/20">
                  <featuredConcept.icon className="h-10 w-10 text-blue-400" />
                </div>

                <div className="mt-6 sm:ml-8 sm:mt-0">
                  <div className="flex items-center justify-center gap-3 sm:justify-start">
                    <h3 className="text-2xl font-bold text-white font-display">
                      {featuredConcept.title}
                    </h3>
                    <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-400">
                      Core
                    </span>
                  </div>
                  <p className="mt-2 text-base font-medium text-blue-300">
                    {featuredConcept.highlight}
                  </p>
                  <p className="mt-3 text-sm text-white/60">
                    {featuredConcept.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Connection arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="flex justify-center py-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5">
              <ArrowRight className="h-4 w-4 rotate-90 text-white/40" />
            </div>
          </motion.div>

          {/* Secondary concepts grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {secondaryConcepts.map((concept, index) => {
              const styles = colorStyles[concept.color as keyof typeof colorStyles];
              const delays = [0.7, 0.85, 1.0];

              return (
                <motion.div
                  key={concept.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: delays[index] }}
                  className="group relative"
                >
                  {/* Hover glow */}
                  <div className={`absolute -inset-2 ${styles.glow} rounded-2xl opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`} />

                  <div className={`relative h-full overflow-hidden rounded-2xl border ${styles.border} bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05]`}>
                    {/* Number badge */}
                    <span className="absolute right-4 top-4 text-xs font-bold text-white/20">
                      {String(index + 2).padStart(2, "0")}
                    </span>

                    {/* Icon */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.bg}`}>
                      <concept.icon className={`h-6 w-6 ${styles.text}`} />
                    </div>

                    {/* Content */}
                    <h3 className="mt-5 text-lg font-bold text-white font-display">
                      {concept.title}
                    </h3>
                    <p className={`mt-1 text-sm font-medium ${styles.text}`}>
                      {concept.highlight}
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      {concept.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-white/40">
            Cada conceito se integra para você ter{" "}
            <span className="font-medium text-white/70">controle total</span> do flip.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
