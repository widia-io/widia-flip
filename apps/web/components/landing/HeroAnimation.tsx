"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Percent } from "lucide-react";

const metrics = [
  { label: "ROI", values: [18, 24, 31, 27], icon: Percent, suffix: "%" },
  { label: "Lucro", values: [45, 68, 92, 78], icon: DollarSign, prefix: "R$", suffix: "k" },
  { label: "Score", values: [72, 85, 91, 88], icon: TrendingUp, suffix: "/100" },
];

export function HeroAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % metrics[0].values.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto max-w-sm mt-10 lg:mt-0">
      <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-[0_30px_90px_-60px_hsl(var(--primary)/0.7)] backdrop-blur">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span>Análise ao vivo</span>
          <span className="rounded-full bg-accent/20 px-2 py-1 text-[10px] font-semibold text-accent-foreground">
            Atualizando
          </span>
        </div>

        <div className="space-y-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/40 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <metric.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">{metric.label}</span>
              </div>
              <span
                key={currentIndex}
                className="text-lg font-bold text-primary animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {metric.prefix}
                {metric.values[currentIndex]}
                {metric.suffix}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Flip Score</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${metrics[2].values[currentIndex]}%` }}
                />
              </div>
              <span className="font-semibold text-accent">
                {metrics[2].values[currentIndex]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.25),transparent_50%)] blur-2xl" />
      <div className="absolute -bottom-10 left-6 -z-10 h-24 w-32 rounded-full bg-primary/20 blur-3xl" />
    </div>
  );
}
