"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Coins, TrendingUp } from "lucide-react";

import { AnimatedCounter } from "@/components/landing/AnimatedCounter";

const stats = [
  {
    icon: Users,
    value: 2400,
    prefix: "",
    suffix: "+",
    label: "prospects analisados",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Coins,
    value: 4.8,
    prefix: "R$",
    suffix: "M",
    label: "economizados",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    isDecimal: true,
  },
  {
    icon: TrendingUp,
    value: 24,
    prefix: "",
    suffix: "%",
    label: "ROI medio",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export function PlatformStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-border bg-card/50 p-5"
    >
      <h3 className="text-center text-sm font-medium text-muted-foreground">
        Resultados da comunidade Meu Flip
      </h3>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="text-center"
            >
              <div
                className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${stat.bg}`}
              >
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="text-xl font-bold sm:text-2xl">
                {isInView ? (
                  stat.isDecimal ? (
                    <span>
                      {stat.prefix}
                      {stat.value}
                      {stat.suffix}
                    </span>
                  ) : (
                    <AnimatedCounter
                      end={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      duration={1500}
                    />
                  )
                ) : (
                  <span>
                    {stat.prefix}0{stat.suffix}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
