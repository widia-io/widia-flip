"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { completeFeatureTour } from "@/lib/actions/userPreferences";

interface TourStep {
  target: string;
  title: string;
  content: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='sidebar']",
    title: "Navegação",
    content:
      "Use o menu lateral para navegar entre Prospecção, Imóveis e Projetos.",
  },
  {
    target: "[data-tour='workspace-selector']",
    title: "Seletor de Projeto",
    content:
      "Escolha qual projeto está ativo. Todos os dados são filtrados por projeto.",
  },
  {
    target: "[data-tour='prospects-link']",
    title: "Prospecção",
    content:
      "Adicione links de anúncios e avalie oportunidades com o Flip Score.",
  },
  {
    target: "[data-tour='properties-link']",
    title: "Imóveis",
    content:
      "Converta leads promissores e faça análise de viabilidade completa.",
  },
];

interface FeatureTourProps {
  autoStart?: boolean;
  onComplete?: () => void;
}

export function FeatureTour({
  autoStart = false,
  onComplete,
}: FeatureTourProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => setIsRunning(true), 800);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  useEffect(() => {
    if (!isRunning || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 12,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [isRunning, step, currentStep]);

  const handleComplete = useCallback(async () => {
    setIsRunning(false);
    setCurrentStep(0);
    await completeFeatureTour();
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(async () => {
    await handleComplete();
  }, [handleComplete]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(true);
  }, []);

  // Expose startTour to window
  useEffect(() => {
    (window as Window & { startFeatureTour?: () => void }).startFeatureTour =
      startTour;
    return () => {
      delete (window as Window & { startFeatureTour?: () => void })
        .startFeatureTour;
    };
  }, [startTour]);

  if (!isRunning || !step) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[9999] w-80 rounded-lg bg-popover text-popover-foreground shadow-lg border animate-in fade-in-0 zoom-in-95"
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">{step.title}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 py-3">
          <p className="text-sm text-muted-foreground">{step.content}</p>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} de {TOUR_STEPS.length}
          </span>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep === TOUR_STEPS.length - 1 ? "Concluir" : "Próximo"}
              {currentStep < TOUR_STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function useFeatureTour() {
  const startTour = useCallback(() => {
    const win = window as Window & { startFeatureTour?: () => void };
    if (win.startFeatureTour) {
      win.startFeatureTour();
    }
  }, []);

  return { startTour };
}
