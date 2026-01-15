"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Home, Receipt, TrendingUp, ArrowRight, Zap } from "lucide-react";

const steps = [
  {
    icon: Home,
    number: "01",
    title: "Cadastre o imóvel",
    description: "Dados básicos do flip que está avaliando",
    accent: "from-blue-500 to-cyan-400",
  },
  {
    icon: Receipt,
    number: "02",
    title: "Lance os custos",
    description: "Aquisição, reforma, taxas e impostos",
    accent: "from-violet-500 to-purple-400",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Veja o lucro real",
    description: "Resultado atualizado em tempo real",
    accent: "from-emerald-500 to-green-400",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[hsl(222,47%,6%)] py-24 lg:py-32"
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow effects */}
      <div className="absolute left-0 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[150px]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/4 translate-y-1/4 rounded-full bg-accent/15 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Zap className="h-3.5 w-3.5" />
            Simples assim
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl font-display">
            Três passos para{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              controle total
            </span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative mt-20">
          {/* Progress bar - horizontal on desktop */}
          <div className="absolute left-0 right-0 top-[60px] hidden h-1 lg:block">
            <div className="h-full w-full rounded-full bg-white/10" />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
              className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-primary via-accent to-emerald-500"
            />
          </div>

          {/* Progress bar - vertical on mobile */}
          <div className="absolute bottom-0 left-8 top-0 w-1 lg:hidden">
            <div className="h-full w-full rounded-full bg-white/10" />
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
              className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-primary via-accent to-emerald-500"
            />
          </div>

          {/* Steps */}
          <div className="relative grid gap-8 lg:grid-cols-3 lg:gap-12">
            {steps.map((step, index) => {
              const delays = [0.4, 0.7, 1.0];

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: delays[index] }}
                  className="relative pl-20 lg:pl-0"
                >
                  {/* Step number circle */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: delays[index] }}
                    className="absolute left-0 top-0 lg:relative lg:mx-auto lg:mb-8"
                  >
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${step.accent} shadow-[0_0_30px_-5px_currentColor]`}>
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    {/* Connector dot on mobile */}
                    <div className="absolute -left-[26px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white lg:hidden" />
                  </motion.div>

                  {/* Content card */}
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10">
                    {/* Number watermark */}
                    <span className="absolute -right-4 -top-6 font-display text-[100px] font-bold leading-none text-white/[0.03]">
                      {step.number}
                    </span>

                    <div className="relative">
                      <h3 className="text-xl font-bold text-white font-display">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/60">
                        {step.description}
                      </p>

                      {/* Arrow indicator */}
                      {index < steps.length - 1 && (
                        <div className="mt-4 hidden items-center gap-2 text-xs font-medium text-white/40 lg:flex">
                          <span>Próximo</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      )}
                      {index === steps.length - 1 && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <span>Resultado</span>
                          <TrendingUp className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-white/50">
            Sem planilha. Sem gambiarra.{" "}
            <span className="font-semibold text-white">Só resultado.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
