import { Search, BarChart3, CheckCircle, History } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Importe",
    description: "Cole URL → 30s → dados completos. Ou Quick Add para imóveis offline. Economize 30min de digitação por prospect.",
  },
  {
    icon: BarChart3,
    title: "Priorize",
    description: "Score 0-100 calculado automaticamente. Top 10% = analise primeiro. Bottom 50% = descarte imediato.",
  },
  {
    icon: CheckCircle,
    title: "Analise",
    description: "Viabilidade cash/financiada lado a lado. ROI, lucro, margem. Todos custos inclusos. Decida em 30s, não 4h.",
  },
  {
    icon: History,
    title: "Gerencie",
    description: "Custos, timeline, docs versionados. Snapshots mostram evolução do negócio. Nunca esqueça um custo importante.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Como funciona
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          De prospect a lucro em 4 passos simples
        </p>
      </div>

      <div className="relative">
        {/* Linha conectora (desktop) */}
        <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative flex flex-col items-center text-center"
            >
              {/* Número do passo */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 lg:top-8 bg-background px-2 text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>

              {/* Ícone */}
              <div className="relative z-10 rounded-full bg-primary/10 p-4 mb-4 ring-4 ring-background">
                <step.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Conteúdo */}
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
