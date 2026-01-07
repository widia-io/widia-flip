import { Clock, AlertTriangle, TrendingDown } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const problems = [
  {
    icon: Clock,
    title: "4h+ por prospect",
    description:
      "Excel, calculadoras, chutes. Enquanto você coleta dados e calcula, o imóvel sai do ar ou vai para outro investidor.",
  },
  {
    icon: AlertTriangle,
    title: "Decisões sem dados reais",
    description:
      "Não sabe se ITBI está correto, se a reforma vai caber no orçamento, se financiado realmente compensa. Prejuízo de R$ 20k+ em custos ocultos.",
  },
  {
    icon: TrendingDown,
    title: "Oportunidades perdidas",
    description:
      "Bons negócios passam despercebidos no meio de 20 ruins. Você vê 20, analisa 5 com calma, fecha 1. Os outros 14 promissores foram embora.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-y border-border bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Você está perdendo dinheiro sem perceber
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Análise manual = menos deals, mais erros, prejuízos ocultos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <Card
              key={problem.title}
              className="border-destructive/20 bg-destructive/5"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                  <problem.icon className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-lg">{problem.title}</CardTitle>
                <CardDescription className="text-sm">
                  {problem.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground italic">
            Sistema manual custa 15h+/semana e deixa dinheiro na mesa
          </p>
        </div>
      </div>
    </section>
  );
}
