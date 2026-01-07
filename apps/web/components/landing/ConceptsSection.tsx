import { Briefcase, Target, Gauge, Camera } from "lucide-react";
import { ConceptCard } from "./ConceptCard";

const concepts = [
  {
    icon: Briefcase,
    title: "Projeto",
    highlight: "Organize operações separadas.",
    description:
      "Múltiplos projetos independentes. Cada um com suas taxas (ITBI, corretagem, impostos), prospects e histórico próprio. Separe por região ou estratégia.",
  },
  {
    icon: Target,
    title: "Prospect",
    highlight: "Leads em triagem.",
    description:
      "Importe URLs ou use Quick Add. Flip Score calcula potencial automaticamente. Converta os melhores em propriedades para análise completa.",
  },
  {
    icon: Gauge,
    title: "Flip Score",
    highlight: "0-100 calculado automaticamente.",
    description:
      "v0: triagem por preço/m², custos e liquidez. v1: ROI, lucro líquido e margem de segurança. Priorize negócios sem análise manual.",
  },
  {
    icon: Camera,
    title: "Snapshot",
    highlight: "Histórico versionado.",
    description:
      "Salve 'fotos' da análise com timestamp. Acompanhe evolução de custos, viabilidade e decisões desde a prospecção até a venda.",
  },
];

export function ConceptsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24 bg-muted/30">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Entenda o sistema
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Conceitos simples para organizar suas operações de flip
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {concepts.map((concept) => (
          <ConceptCard
            key={concept.title}
            icon={concept.icon}
            title={concept.title}
            highlight={concept.highlight}
            description={concept.description}
          />
        ))}
      </div>
    </section>
  );
}
