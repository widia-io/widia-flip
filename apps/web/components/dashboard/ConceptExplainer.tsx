"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Search,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  FileEdit,
  Gauge,
  TrendingUp,
  Calculator,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface ConceptCard {
  id: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  color: "primary" | "violet" | "emerald" | "amber";
  whatIs: string;
  whyMatters: string;
  howItWorks: string[];
  example?: string;
  benefit: string;
}

const concepts: ConceptCard[] = [
  {
    id: "projeto",
    icon: FolderKanban,
    title: "Projeto",
    tagline: "Sua pasta de oportunidades",
    color: "primary",
    whatIs:
      "Um projeto e como uma pasta onde voce organiza todos os imoveis que esta analisando. Pense nele como um 'dossi de flips'.",
    whyMatters:
      "Sem organizacao, voce perde tempo procurando informacoes e mistura analises de regioes ou parcerias diferentes.",
    howItWorks: [
      "Crie um projeto por ano, regiao ou parceria",
      "Todos os leads e imoveis ficam organizados dentro",
      "Taxas e custos sao configurados por projeto",
    ],
    example: '"Flips 2025 - Zona Sul" ou "Parceria com Joao"',
    benefit: "Nunca mais perca uma oportunidade no meio da bagunca",
  },
  {
    id: "lead",
    icon: Search,
    title: "Lead",
    tagline: "Oportunidade em analise inicial",
    color: "violet",
    whatIs:
      "Um lead e um imovel que voce encontrou e quer avaliar rapidamente. E o primeiro filtro antes de investir tempo.",
    whyMatters:
      "Voce vẽ dezenas de anuncios por dia. Precisa descartar os ruins em segundos, nao em horas.",
    howItWorks: [
      "Cole o link do Vivareal, ZAP ou Quintoandar",
      "Ou preencha os dados manualmente",
      "O sistema extrai preco, area e localizacao automaticamente",
    ],
    example: "Apartamento no ZAP por R$300k que parece ter potencial",
    benefit: "De 2 horas para 2 minutos por analise inicial",
  },
  {
    id: "score",
    icon: Sparkles,
    title: "Flip Score",
    tagline: "Nota de 0 a 100 que prioriza para voce",
    color: "emerald",
    whatIs:
      "O Flip Score e uma nota automatica que considera preco, potencial de valorizacao, custos estimados e margem de lucro.",
    whyMatters:
      "Seu tempo vale dinheiro. Visitar imoveis ruins custa gasolina, tempo e desgaste. O Score filtra os 10% que realmente valem.",
    howItWorks: [
      "Score 80-100: Otimo potencial, priorize",
      "Score 50-79: Analisar com cuidado",
      "Score 0-49: Provavelmente nao vale o esforco",
    ],
    example: "Score 87 = margem estimada de 25%, baixo risco",
    benefit: "3x mais negocios analisados por dia",
  },
  {
    id: "imovel",
    icon: ArrowRightLeft,
    title: "Converter para Imovel",
    tagline: "Da triagem para analise completa",
    color: "amber",
    whatIs:
      "Quando um lead tem bom Score, voce o converte para 'Imovel'. Isso desbloqueia ferramentas de analise profunda.",
    whyMatters:
      "Leads sao para triagem rapida. Imoveis sao para decisoes serias: calcular custos reais, simular financiamento, planejar reforma.",
    howItWorks: [
      "Clique em 'Converter' no lead aprovado",
      "Adicione custos detalhados (reforma, documentacao, etc)",
      "Compare cenarios: a vista vs financiado",
      "Acompanhe timeline e evolucao",
    ],
    example: "Lead com Score 85 vira Imovel para calcular se financia ou paga a vista",
    benefit: "Decisoes baseadas em numeros reais, nao em achismo",
  },
];

const colorStyles = {
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    gradient: "from-primary/20 via-primary/10 to-transparent",
    glow: "bg-primary/20",
    pill: "bg-primary/20 text-primary",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
    gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
    glow: "bg-violet-500/20",
    pill: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    glow: "bg-emerald-500/20",
    pill: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    glow: "bg-amber-500/20",
    pill: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  },
};

export function ConceptExplainer() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="relative"
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
        >
          <Lightbulb className="h-3 w-3" />
          Como funciona
        </motion.div>
        <h2 className="mt-3 text-xl font-bold sm:text-2xl">
          Entenda o fluxo do{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Meu Flip
          </span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Clique em cada conceito para entender como usar a plataforma
        </p>
      </div>

      {/* Visual Flow Line (desktop) */}
      <div className="absolute left-1/2 top-[140px] hidden h-[calc(100%-180px)] w-px -translate-x-1/2 bg-gradient-to-b from-primary/30 via-violet-500/30 via-emerald-500/30 to-amber-500/30 lg:block" />

      {/* Concept Cards */}
      <div className="space-y-4">
        {concepts.map((concept, index) => {
          const styles = colorStyles[concept.color];
          const Icon = concept.icon;
          const isExpanded = expandedId === concept.id;

          return (
            <motion.div
              key={concept.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              className="relative"
            >
              {/* Flow connector dot (desktop) */}
              <div
                className={cn(
                  "absolute left-1/2 top-6 hidden h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background lg:block",
                  styles.glow
                )}
              />

              {/* Card */}
              <motion.div
                layout
                className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                  styles.border,
                  isExpanded ? "shadow-lg" : "hover:shadow-md",
                  isExpanded && "ring-2 ring-offset-2 ring-offset-background",
                  isExpanded && concept.color === "primary" && "ring-primary/30",
                  isExpanded && concept.color === "violet" && "ring-violet-500/30",
                  isExpanded && concept.color === "emerald" && "ring-emerald-500/30",
                  isExpanded && concept.color === "amber" && "ring-amber-500/30"
                )}
              >
                {/* Background gradient */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r opacity-50",
                    styles.gradient
                  )}
                />

                {/* Collapsed Header (always visible) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : concept.id)}
                  className="relative flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/30"
                >
                  {/* Step number */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      styles.pill
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      styles.bg
                    )}
                  >
                    <Icon className={cn("h-6 w-6", styles.text)} />
                  </div>

                  {/* Title & Tagline */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{concept.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {concept.tagline}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="relative border-t border-border/50 bg-background/50 p-4 backdrop-blur-sm sm:p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* What is it */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <FileEdit className="h-4 w-4 text-muted-foreground" />
                              O que e?
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {concept.whatIs}
                            </p>
                          </div>

                          {/* Why it matters */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              Por que importa?
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {concept.whyMatters}
                            </p>
                          </div>

                          {/* How it works */}
                          <div className="space-y-2 sm:col-span-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Gauge className="h-4 w-4 text-muted-foreground" />
                              Como funciona?
                            </div>
                            <ul className="space-y-1.5">
                              {concept.howItWorks.map((step, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-muted-foreground"
                                >
                                  <CheckCircle2
                                    className={cn("mt-0.5 h-4 w-4 shrink-0", styles.text)}
                                  />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Example */}
                          {concept.example && (
                            <div className="space-y-2 sm:col-span-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                Exemplo
                              </div>
                              <div
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm italic",
                                  styles.border,
                                  styles.bg
                                )}
                              >
                                {concept.example}
                              </div>
                            </div>
                          )}

                          {/* Benefit highlight */}
                          <div className="sm:col-span-2">
                            <div
                              className={cn(
                                "flex items-center gap-3 rounded-xl p-3",
                                styles.bg
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                  styles.pill
                                )}
                              >
                                <Calculator className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  Beneficio
                                </p>
                                <p className={cn("font-semibold", styles.text)}>
                                  {concept.benefit}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Arrow to next (except last) */}
              {index < concepts.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground/50" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary Flow (mobile-friendly) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 rounded-xl border border-border bg-muted/30 p-4"
      >
        <p className="mb-3 text-center text-sm font-medium">Resumo do fluxo</p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="rounded-full bg-primary/20 px-3 py-1 font-medium text-primary">
            Projeto
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded-full bg-violet-500/20 px-3 py-1 font-medium text-violet-600 dark:text-violet-400">
            Lead
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-medium text-emerald-600 dark:text-emerald-400">
            Score
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded-full bg-amber-500/20 px-3 py-1 font-medium text-amber-600 dark:text-amber-400">
            Imovel
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded-full bg-emerald-600/20 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-300">
            Lucro!
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
