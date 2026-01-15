"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Repeat, BarChart3, Target } from "lucide-react";

const personas = [
  {
    icon: Repeat,
    title: "Faz flip recorrente",
    quote: "Já perdi dinheiro por não ter controle. Nunca mais.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
    bgGlow: "bg-blue-500/20",
  },
  {
    icon: BarChart3,
    title: "Trata flip como negócio",
    quote: "Planilha não escala. Preciso de sistema.",
    gradient: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    iconColor: "text-violet-400",
    bgGlow: "bg-violet-500/20",
  },
  {
    icon: Target,
    title: "Decide com números",
    quote: "Feeling não paga conta. Dados sim.",
    gradient: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400",
    bgGlow: "bg-emerald-500/20",
  },
];

export function AuthoritySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 lg:py-32"
    >
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 -z-10 bg-muted/50" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
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
          <span className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]">
            <Users className="h-3.5 w-3.5" />
            Criado para
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl font-display">
            O meuflip foi feito pra quem
          </h2>
        </motion.div>

        {/* Persona cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {personas.map((persona, index) => {
            const delays = [0.2, 0.35, 0.5];

            return (
              <motion.div
                key={persona.title}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: delays[index] }}
                className="group relative"
              >
                {/* Glow effect behind card */}
                <div className={`absolute -inset-2 ${persona.bgGlow} rounded-3xl opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`} />

                <div className={`relative h-full overflow-hidden rounded-3xl border ${persona.border} bg-gradient-to-br ${persona.gradient} p-8 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
                  {/* Decorative corner accent */}
                  <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${persona.bgGlow} blur-3xl`} />

                  {/* Icon */}
                  <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-lg`}>
                    <persona.icon className={`h-7 w-7 ${persona.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="mt-6 text-xl font-bold font-display">
                    {persona.title}
                  </h3>

                  {/* Quote */}
                  <div className="mt-4 border-l-2 border-current/20 pl-4">
                    <p className="text-sm italic text-muted-foreground">
                      &ldquo;{persona.quote}&rdquo;
                    </p>
                  </div>

                  {/* Persona indicator */}
                  <div className="mt-6 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${persona.iconColor.replace('text-', 'bg-')}`} />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Perfil {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-16"
        >
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-8 text-center shadow-[0_0_60px_-20px_hsl(var(--primary)/0.3)]">
            {/* Decorative elements */}
            <div className="absolute -left-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative">
              <p className="text-lg text-muted-foreground">
                Não é ferramenta genérica.
              </p>
              <p className="mt-2 text-2xl font-bold font-display">
                É a{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  plataforma para house flipping
                </span>
                .
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
