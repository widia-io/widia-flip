"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

const painPoints = [
  {
    text: "achou que ia lucrar e sobrou menos",
    subtext: "custos ocultos comeram a margem",
  },
  {
    text: "perdeu controle dos custos da obra",
    subtext: "cada fornecedor uma surpresa",
  },
  {
    text: "misturou flip com finanças pessoais",
    subtext: "nunca soube o lucro real",
  },
  {
    text: "ficou refém de planilhas confusas",
    subtext: "que só você entende",
  },
];

export function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setShowReveal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[hsl(222,47%,8%)] py-20 lg:py-28"
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle red glow in corner */}
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-red-500/20 blur-[120px]" />
      <div className="absolute -right-32 bottom-1/4 h-64 w-64 rounded-full bg-red-500/10 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Section badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Dores do dia a dia
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl font-display"
        >
          Se você faz flip, já passou por{" "}
          <span className="relative">
            <span className="relative z-10">pelo menos um desses</span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 1 }}
              className="absolute left-0 top-1/2 h-1 w-full origin-left -translate-y-1/2 bg-red-500"
            />
          </span>
        </motion.h2>

        {/* Pain point cards - scattered arrangement */}
        <div className="relative mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {painPoints.map((pain, index) => {
            const rotations = [-2, 1.5, -1, 2.5];
            const delays = [0.3, 0.45, 0.6, 0.75];

            return (
              <motion.div
                key={pain.text}
                initial={{ opacity: 0, y: 40, rotate: 0 }}
                animate={isInView ? {
                  opacity: 1,
                  y: 0,
                  rotate: rotations[index]
                } : {}}
                transition={{ duration: 0.6, delay: delays[index] }}
                className="group relative"
              >
                {/* Red glow underneath */}
                <div className="absolute -inset-1 rounded-2xl bg-red-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-[hsl(222,47%,12%)] to-[hsl(222,47%,8%)] p-6 transition-all duration-300 hover:border-red-500/40">
                  {/* Number watermark */}
                  <span className="absolute -right-2 -top-4 font-display text-8xl font-bold text-red-500/10">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* X icon */}
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                    <X className="h-5 w-5 text-red-400" />
                  </div>

                  {/* Pain text with strikethrough effect */}
                  <p className="relative text-lg font-medium capitalize text-white">
                    {pain.text}
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={isInView ? { scaleX: 1 } : {}}
                      transition={{ duration: 0.5, delay: delays[index] + 0.8 }}
                      className="absolute left-0 top-1/2 h-0.5 w-full origin-left -translate-y-1/2 bg-red-500/60"
                      style={{ transform: `translateY(-50%) rotate(-1deg)` }}
                    />
                  </p>

                  <p className="mt-2 text-sm text-red-300/60">{pain.subtext}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reveal card - the solution */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={showReveal ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mx-auto mt-16 max-w-2xl"
        >
          {/* Gold glow */}
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/30 via-amber-400/20 to-amber-500/30 opacity-80 blur-2xl" />

          <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[hsl(222,47%,12%)] to-[hsl(222,47%,10%)] p-8 text-center shadow-[0_0_60px_-20px_hsl(43,96%,56%,0.4)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">
              A verdade
            </p>
            <p className="mt-4 text-xl font-medium text-white sm:text-2xl font-display">
              O problema não é o flip.{" "}
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                É a falta de gestão.
              </span>
            </p>
            <p className="mt-3 text-sm text-white/60">
              Quem não controla, perde dinheiro. Simples assim.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
