"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { DollarSign, HardHat, Receipt, TrendingUp, Target } from "lucide-react";

const valuePoints = [
  {
    icon: DollarSign,
    title: "Compra do imóvel",
    description: "Valor de aquisição, entrada e financiamento",
  },
  {
    icon: HardHat,
    title: "Custos de obra",
    description: "Reforma, materiais e mão de obra",
  },
  {
    icon: Receipt,
    title: "Taxas e impostos",
    description: "ITBI, corretagem, cartório e IR",
  },
  {
    icon: TrendingUp,
    title: "Lucro líquido",
    description: "ROI real sem surpresas no final",
  },
];

export function ValuePropositionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 lg:py-32"
    >
      {/* Gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Target className="h-3.5 w-3.5" />
            Centralização total
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl font-display">
            Tudo converge para um{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              único lugar
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Sem planilhas paralelas. Sem apps soltos. Uma visão completa do flip.
          </p>
        </motion.div>

        {/* Hub layout - Grid based for reliable positioning */}
        <div className="mt-20">
          {/* Desktop: 3 column grid with hub in center */}
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8 lg:items-center">
            {/* Left column - cards 1 and 3 */}
            <div className="space-y-6">
              {[valuePoints[0], valuePoints[2]].map((point, idx) => {
                const index = idx === 0 ? 0 : 2;
                const delays = [0.3, 0.5];
                return (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, x: -30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: delays[idx] }}
                    className="group"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.3)]">
                      <span className="absolute right-4 top-4 text-xs font-bold text-primary/50">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 transition-transform duration-300 group-hover:scale-110">
                        <point.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold font-display">{point.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Center column - Hub */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="relative flex h-48 w-48 items-center justify-center">
                {/* Pulsing rings */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-accent/30"
                />
                {/* Center circle */}
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/20 to-accent/20 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5)]">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">meuflip</p>
                    <p className="mt-1 text-lg font-bold font-display">Hub</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right column - cards 2 and 4 */}
            <div className="space-y-6">
              {[valuePoints[1], valuePoints[3]].map((point, idx) => {
                const index = idx === 0 ? 1 : 3;
                const delays = [0.4, 0.6];
                return (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, x: 30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: delays[idx] }}
                    className="group"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.3)]">
                      <span className="absolute right-4 top-4 text-xs font-bold text-primary/50">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 transition-transform duration-300 group-hover:scale-110">
                        <point.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold font-display">{point.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile: Hub on top, cards in grid below */}
          <div className="lg:hidden">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="relative flex h-40 w-40 items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/20 to-accent/20 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5)]">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">meuflip</p>
                    <p className="mt-1 text-lg font-bold font-display">Hub</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {valuePoints.map((point, index) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-5 backdrop-blur-sm">
                    <span className="absolute right-4 top-4 text-xs font-bold text-primary/50">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
                      <point.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold font-display">{point.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-20 text-center lg:mt-32"
        >
          <div className="mx-auto max-w-xl rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 px-8 py-6">
            <p className="text-lg font-medium">
              Tudo organizado, simples e pensado pra quem{" "}
              <span className="font-bold text-accent">faz flip de verdade</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
