"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const screenshots = [
  {
    id: "dashboard",
    title: "Dashboard Completo",
    description: "KPIs, pipeline visual e atividade recente em um só lugar",
    src: "/screenshots/dashboard-new.png",
  },
  {
    id: "viability",
    title: "Análise de Viabilidade",
    description: "ROI, lucro líquido e break-even calculados em segundos",
    src: "/screenshots/viability-new.png",
  },
  {
    id: "snapshots",
    title: "Central de Análises",
    description: "Histórico de viabilidades com métricas de lucro e ROI",
    src: "/screenshots/snapshots-new.png",
  },
  {
    id: "costs",
    title: "Gestão de Custos",
    description: "Controle orçamentário com gráficos e alertas",
    src: "/screenshots/costs-new.png",
  },
  {
    id: "suppliers",
    title: "Rede de Fornecedores",
    description: "Profissionais avaliados com histórico de uso",
    src: "/screenshots/suppliers-new.png",
  },
];

export function AppScreenshots() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Monitor className="h-3.5 w-3.5" />
            Veja o app em ação
          </div>
          <h2 className="mt-6 text-2xl font-semibold sm:text-3xl font-display">
            Interface pensada para flippers
          </h2>
          <p className="mt-3 text-muted-foreground">
            Simples, direto e sem complicação. Tudo que você precisa em um só lugar.
          </p>
        </div>

        {/* Screenshot Carousel */}
        <div className="mt-12">
          {/* Main Screenshot */}
          <div className="relative mx-auto max-w-4xl">
            {/* Browser Frame */}
            <div className="rounded-xl border border-border/60 bg-background/70 shadow-2xl overflow-hidden">
              {/* Browser Top Bar */}
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 rounded-md bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    <span className="text-green-500">🔒</span>
                    app.meuflip.com.br
                  </div>
                </div>
              </div>

              {/* Screenshot Image */}
              <div className="relative aspect-[16/10] bg-muted">
                <Image
                  src={screenshots[activeIndex].src}
                  alt={screenshots[activeIndex].title}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="outline"
              size="icon"
              className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={goToNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Screenshot Info */}
          <div className="mt-6 text-center">
            <h3 className="text-lg font-semibold font-display">
              {screenshots[activeIndex].title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {screenshots[activeIndex].description}
            </p>
          </div>

          {/* Thumbnail Navigation */}
          <div className="mt-8 flex justify-center gap-3">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-16 w-24 overflow-hidden rounded-lg border-2 transition-all duration-200",
                  index === activeIndex
                    ? "border-primary shadow-md"
                    : "border-border/60 opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={screenshot.src}
                  alt={screenshot.title}
                  fill
                  sizes="96px"
                  className="object-cover object-top"
                />
              </button>
            ))}
          </div>

          {/* Dots Indicator (mobile) */}
          <div className="mt-4 flex justify-center gap-2 sm:hidden">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  index === activeIndex
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
