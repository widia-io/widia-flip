import { Briefcase, Target, Gauge, Camera } from "lucide-react";
import { ConceptCard } from "./ConceptCard";

const concepts = [
  {
    icon: Briefcase,
    title: "Projeto",
    highlight: "Seu espaço de trabalho.",
    description:
      "Organize diferentes operações de flip em projetos separados. Cada um tem suas próprias taxas (ITBI, corretagem), prospects e histórico.",
  },
  {
    icon: Target,
    title: "Prospect",
    highlight: "Leads em prospecção.",
    description:
      "Cadastre imóveis rapidamente para triagem inicial. O Flip Score prioriza automaticamente os melhores negócios sem análise completa.",
  },
  {
    icon: Gauge,
    title: "Flip Score",
    highlight: "Nota inteligente de 0-100.",
    description:
      "Score v0: triagem rápida (preço/m², custos, liquidez). Score v1: análise econômica completa (ROI, lucro, margem de segurança).",
  },
  {
    icon: Camera,
    title: "Snapshot",
    highlight: "Versões das suas análises.",
    description:
      "Salve 'fotos' da análise em momentos-chave. Acompanhe como o negócio evoluiu desde a prospecção até a venda.",
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
