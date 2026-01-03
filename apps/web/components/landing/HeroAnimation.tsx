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
    <div className="relative mx-auto max-w-sm mt-8 lg:mt-0">
      {/* Card de preview */}
      <div className="rounded-2xl bg-card border shadow-2xl p-6 backdrop-blur">
        <div className="text-xs text-muted-foreground mb-4 font-medium">
          Análise em tempo real
        </div>

        <div className="space-y-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <metric.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{metric.label}</span>
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

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Flip Score</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
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

      {/* Decoração de fundo */}
      <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl" />
    </div>
  );
}
